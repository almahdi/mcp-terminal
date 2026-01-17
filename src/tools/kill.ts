import { Tool } from "@effect/ai";
import { Schema } from "effect";
import type { PTYSessionInfo } from "../types.js";

/**
 * PTY Kill tool - terminates a PTY session
 */
export const PTYKill = Tool.make("pty_kill", {
  description: `Terminates a PTY session and optionally cleans up its buffer.

Behavior:
- If the session is running, it will be killed (status becomes "killed")
- If cleanup=false (default), the session remains in the list with its output buffer intact
- If cleanup=true, the session is removed entirely and the buffer is freed
- Keeping sessions without cleanup allows you to compare logs between runs

Use cleanup=false if you might want to read the output later.
Use cleanup=true when you're done with the session entirely.

To send Ctrl+C instead of killing, use pty_write with data="\\x03"`,
  parameters: {
    id: Schema.String.annotations({
      description: "The PTY session ID (from pty_spawn)"
    }),
    cleanup: Schema.optional(Schema.Boolean).annotations({
      description: "Remove session and free buffer (default: false)"
    }),
  },
  success: Schema.String,
});

/**
 * Format kill output
 */
export function formatKillOutput(session: PTYSessionInfo, cleanup: boolean): string {
  const wasRunning = session.status === "running";
  const action = cleanup ? "Killed and cleaned up" : "Killed (session retained for log access)";
  const statusText = wasRunning ? action : "Cleaned up";
  
  const commandLine = `${session.command} ${session.args.join(" ")}`.trim();
  
  return `<pty_killed>
${statusText}: ${session.id}
Title: ${session.title}
Command: ${commandLine}
Final line count: ${session.lineCount}
</pty_killed>`;
}
