import { Context, Effect, Layer, Ref } from "effect";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import { RingBuffer } from "./RingBuffer.js";
import type {
  PTYSession,
  PTYSessionInfo,
  SpawnOptions,
  ReadResult,
  SearchResult,
} from "../types.js";
import {
  PTYNotFoundError,
  PTYNotRunningError,
  CommandExecutionError,
} from "../types.js";

/**
 * Generate a unique PTY session ID
 */
const generateId = Effect.sync((): string => {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pty_${hex}`;
});

/**
 * Convert internal PTYSession to public PTYSessionInfo
 */
const toInfo = (session: PTYSession): PTYSessionInfo => ({
  id: session.id,
  title: session.title,
  command: session.command,
  args: session.args,
  workdir: session.workdir,
  status: session.status,
  exitCode: session.exitCode,
  pid: session.pid,
  createdAt: session.createdAt,
  lineCount: session.buffer.length,
});

/**
 * PTY Manager service for managing pseudo-terminal sessions
 */
export class PTYManager extends Context.Tag("PTYManager")<
  PTYManager,
  {
    spawn: (opts: SpawnOptions) => Effect.Effect<PTYSessionInfo, CommandExecutionError>;
    write: (id: string, data: string) => Effect.Effect<void, PTYNotFoundError | PTYNotRunningError>;
    read: (id: string, offset: number, limit?: number) => Effect.Effect<ReadResult, PTYNotFoundError>;
    search: (id: string, pattern: RegExp, offset: number, limit?: number) => Effect.Effect<SearchResult, PTYNotFoundError>;
    list: () => Effect.Effect<PTYSessionInfo[]>;
    kill: (id: string, cleanup: boolean) => Effect.Effect<void, PTYNotFoundError>;
  }
>() {}

/**
 * Default implementation of PTYManager service
 */
export const PTYManagerLive = Layer.scoped(
  PTYManager,
  Effect.gen(function* () {
    const sessions = yield* Ref.make(new Map<string, PTYSession>());

    // Clean up all PTY sessions when layer is disposed
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        const map = yield* Ref.get(sessions);
        for (const session of map.values()) {
          if (session.status === "running") {
            try {
              session.process.kill();
            } catch {
              // Ignore errors if already dead
            }
          }
          session.buffer.clear();
        }
        yield* Ref.set(sessions, new Map());
      })
    );

    return {
      spawn: (opts: SpawnOptions) =>
        Effect.gen(function* () {
          const id = yield* generateId;
          const args = opts.args ?? [];
          const workdir = opts.workdir ?? process.cwd();
          const env = { ...process.env, ...opts.env } as Record<string, string>;
          const title =
            opts.title ??
            (`${opts.command} ${args.join(" ")}`.trim() ||
              `Terminal ${id.slice(-4)}`);

          // Spawn PTY process directly (not using acquireRelease - we manage lifecycle manually)
          const ptyProcess: IPty = yield* Effect.try({
            try: () =>
              pty.spawn(opts.command, args, {
                name: "xterm-256color",
                cols: 120,
                rows: 40,
                cwd: workdir,
                env,
              }),
            catch: (error) =>
              new CommandExecutionError({
                command: opts.command,
                message: String(error),
              }),
          });

          const buffer = new RingBuffer();

          const session: PTYSession = {
            id,
            title,
            description: opts.description,
            command: opts.command,
            args,
            workdir,
            env: opts.env,
            status: "running",
            exitCode: undefined,
            pid: ptyProcess.pid,
            createdAt: new Date(),
            notifyOnExit: opts.notifyOnExit ?? false,
            buffer,
            process: ptyProcess,
          };

          // Set up data handler
          ptyProcess.onData((data: string) => {
            buffer.append(data);
          });

          // Set up exit handler
          ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
            // Update session status using Effect.runSync
            Effect.runSync(
              Ref.update(sessions, (map) => {
                const s = map.get(id);
                if (s && s.status === "running") {
                  s.status = "exited";
                  s.exitCode = exitCode;
                }
                return map;
              })
            );

            // Send notification if enabled
            if (session.notifyOnExit) {
              const lastLine = buffer
                .read(Math.max(0, buffer.length - 10))
                .reverse()
                .find((l) => l.trim().length > 0);
              const truncatedLastLine = lastLine
                ? lastLine.slice(0, 250)
                : "(no output)";

              console.error(
                `[PTY_EXIT] ${id} "${title}" exited with code ${exitCode}\n` +
                  `Last line: ${truncatedLastLine}\n` +
                  `Total lines: ${buffer.length}`
              );

              if (exitCode !== 0) {
                console.error(
                  `[PTY_EXIT] Non-zero exit code. Use pty_read with pattern to search for errors.`
                );
              }
            }
          });

          // Register session
          yield* Ref.update(sessions, (map) => map.set(id, session));

          return toInfo(session);
        }),

      write: (id: string, data: string) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(sessions);
          const session = map.get(id);

          if (!session) {
            return yield* Effect.fail(new PTYNotFoundError({ id }));
          }

          if (session.status !== "running") {
            return yield* Effect.fail(
              new PTYNotRunningError({ id, status: session.status })
            );
          }

          yield* Effect.sync(() => session.process.write(data));
        }),

      read: (id: string, offset: number = 0, limit?: number) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(sessions);
          const session = map.get(id);

          if (!session) {
            return yield* Effect.fail(new PTYNotFoundError({ id }));
          }

          const lines = session.buffer.read(offset, limit);
          const totalLines = session.buffer.length;
          const hasMore = offset + lines.length < totalLines;

          return {
            lines,
            totalLines,
            offset,
            hasMore,
            status: session.status,
          };
        }),

      search: (id: string, pattern: RegExp, offset: number = 0, limit?: number) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(sessions);
          const session = map.get(id);

          if (!session) {
            return yield* Effect.fail(new PTYNotFoundError({ id }));
          }

          const allMatches = session.buffer.search(pattern);
          const totalMatches = allMatches.length;
          const totalLines = session.buffer.length;
          const paginatedMatches =
            limit !== undefined
              ? allMatches.slice(offset, offset + limit)
              : allMatches.slice(offset);
          const hasMore = offset + paginatedMatches.length < totalMatches;

          return {
            matches: paginatedMatches,
            totalMatches,
            totalLines,
            offset,
            hasMore,
            status: session.status,
          };
        }),

      list: () =>
        Effect.gen(function* () {
          const map = yield* Ref.get(sessions);
          return Array.from(map.values()).map(toInfo);
        }),

      kill: (id: string, cleanup: boolean = false) =>
        Effect.gen(function* () {
          const map = yield* Ref.get(sessions);
          const session = map.get(id);

          if (!session) {
            return yield* Effect.fail(new PTYNotFoundError({ id }));
          }

          // Kill process if running
          if (session.status === "running") {
            yield* Effect.sync(() => {
              try {
                session.process.kill();
              } catch {
                // Ignore errors if already dead
              }
              session.status = "killed";
            });
          }

          // Cleanup if requested
          if (cleanup) {
            yield* Ref.update(sessions, (map) => {
              session.buffer.clear();
              map.delete(id);
              return map;
            });
          }
        }),
    };
  })
);
