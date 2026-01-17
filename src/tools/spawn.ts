import { Tool } from "@effect/ai";
import { Schema } from "effect";

/**
 * PTY Spawn tool - creates a new pseudo-terminal session
 */
export const PTYSpawn = Tool.make("pty_spawn", {
  description: `Spawns a new PTY (pseudo-terminal) session that runs in the background.

Unlike synchronous bash commands, PTY sessions persist and allow you to:
- Run long-running processes (dev servers, watch modes, etc.)
- Send interactive input (including Ctrl+C, arrow keys, etc.)
- Read output at any time
- Manage multiple concurrent terminal sessions

Returns the session ID, which you can use with other pty_* tools.`,
  parameters: {
    command: Schema.String.annotations({
      description: "The command to execute (e.g., 'npm', 'python', 'bash')"
    }),
    args: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: "Arguments to pass to the command"
    }),
    workdir: Schema.optional(Schema.String).annotations({
      description: "Working directory (defaults to project root)"
    }),
    env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })).annotations({
      description: "Additional environment variables"
    }),
    title: Schema.optional(Schema.String).annotations({
      description: "Human-readable name for the session"
    }),
    description: Schema.String.annotations({
      description: "Clear, concise 5-10 word description of what this command does"
    }),
    notifyOnExit: Schema.optional(Schema.Boolean).annotations({
      description: "Receive notification when process exits (default: false)"
    }),
  },
  success: Schema.String,
});

/**
 * Format spawn output as XML-like structure
 */
export function formatSpawnOutput(info: {
  id: string;
  title: string;
  command: string;
  args: string[];
  workdir: string;
  pid: number;
  status: string;
}): string {
  return `<pty_spawned>
ID: ${info.id}
Title: ${info.title}
Command: ${info.command} ${info.args.join(" ")}
Workdir: ${info.workdir}
PID: ${info.pid}
Status: ${info.status}
</pty_spawned>`;
}
