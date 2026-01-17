import { Toolkit } from "@effect/ai";
import { Effect } from "effect";
import { PTYSpawn, formatSpawnOutput } from "./spawn.js";
import { PTYRead, formatReadOutput, formatSearchOutput } from "./read.js";
import { PTYWrite, formatWriteOutput } from "./write.js";
import { PTYList, formatListOutput } from "./list.js";
import { PTYKill, formatKillOutput } from "./kill.js";
import { PTYManager } from "../services/PTYManager.js";
import { PermissionService } from "../services/PermissionService.js";
import { parseEscapeSequences, extractCommands, parseCommand } from "../utils/escapeSequences.js";
import { InvalidRegexError } from "../types.js";

/**
 * PTY Toolkit - all PTY management tools
 */
export const PTYToolkit = Toolkit.make(
  PTYSpawn,
  PTYRead,
  PTYWrite,
  PTYList,
  PTYKill
);

/**
 * Live implementation of PTY toolkit handlers
 * Note: Handlers require PTYManager and PermissionService which are provided via layer composition
 */
export const PTYToolkitLive = PTYToolkit.toLayer({
  pty_spawn: (params: any) =>
    Effect.gen(function* () {
      const manager = yield* PTYManager;
      const permissions = yield* PermissionService;

      // Check command permission
      const argsArray = [...(params.args ?? [])];
      yield* permissions.checkCommand(params.command, argsArray);

      // Check workdir permission if provided
      if (params.workdir) {
        yield* permissions.checkWorkdir(params.workdir, process.cwd());
      }

      // Spawn PTY
      const argsForSpawn = params.args ? [...params.args] : undefined;
      const result = yield* manager.spawn({
        command: params.command,
        args: argsForSpawn,
        workdir: params.workdir,
        env: params.env,
        title: params.title,
        description: params.description,
        notifyOnExit: params.notifyOnExit,
      });

      return formatSpawnOutput(result);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed(`Error: ${error._tag === "PermissionDeniedError" 
          ? `Permission denied for command "${error.command}": ${error.reason}`
          : error._tag === "CommandExecutionError"
          ? `Failed to execute command "${error.command}": ${error.message}`
          : String(error)
        }`)
      )
    ),

  pty_read: (params: any) =>
    Effect.gen(function* () {
      const manager = yield* PTYManager;

      if (params.pattern) {
        // Search mode
        const regex = yield* Effect.try({
          try: () => new RegExp(params.pattern!, params.ignoreCase ? "i" : ""),
          catch: (error) =>
            new InvalidRegexError({
              pattern: params.pattern!,
              message: String(error),
            }),
        });

        const result = yield* manager.search(
          params.id,
          regex,
          params.offset ?? 0,
          params.limit ?? 500
        );

        return formatSearchOutput(params.id, result, params.pattern!);
      } else {
        // Standard read mode
        const result = yield* manager.read(
          params.id,
          params.offset ?? 0,
          params.limit ?? 500
        );

        return formatReadOutput(params.id, result);
      }
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed(`Error: ${
          error._tag === "PTYNotFoundError"
            ? `PTY session not found: ${error.id}`
            : error._tag === "InvalidRegexError"
            ? `Invalid regex pattern "${error.pattern}": ${error.message}`
            : String(error)
        }`)
      )
    ),

  pty_write: (params: any) =>
    Effect.gen(function* () {
      const manager = yield* PTYManager;
      const permissions = yield* PermissionService;

      // Parse escape sequences
      const parsedData = parseEscapeSequences(params.data);

      // Extract and check command permissions
      const commands = extractCommands(parsedData);
      for (const cmdLine of commands) {
        const { command, args } = parseCommand(cmdLine);
        if (command) {
          yield* permissions.checkCommand(command, args);
        }
      }

      // Write to PTY
      yield* manager.write(params.id, parsedData);

      return formatWriteOutput(params.id, parsedData);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed(`Error: ${
          error._tag === "PTYNotFoundError"
            ? `PTY session not found: ${error.id}`
            : error._tag === "PTYNotRunningError"
            ? `PTY session ${error.id} is not running (status: ${error.status})`
            : error._tag === "PermissionDeniedError"
            ? `Permission denied: ${error.reason}`
            : String(error)
        }`)
      )
    ),

  pty_list: () =>
    Effect.gen(function* () {
      const manager = yield* PTYManager;
      const sessions = yield* manager.list();
      return formatListOutput(sessions);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed(`Error: ${String(error)}`)
      )
    ),

  pty_kill: (params: any) =>
    Effect.gen(function* () {
      const manager = yield* PTYManager;

      // Get session info before killing (for output formatting)
      const sessions = yield* manager.list();
      const session = sessions.find((s) => s.id === params.id);

      if (!session) {
        return yield* Effect.fail(
          `PTY session not found: ${params.id}`
        );
      }

      // Kill and optionally cleanup
      yield* manager.kill(params.id, params.cleanup ?? false);

      return formatKillOutput(session, params.cleanup ?? false);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed(typeof error === "string" 
          ? `Error: ${error}`
          : `Error: ${error._tag === "PTYNotFoundError"
            ? `PTY session not found: ${error.id}`
            : String(error)
          }`)
      )
    ),
} as any); // Type assertion needed because handlers require services provided by layer composition
