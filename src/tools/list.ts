import { Tool } from "@effect/ai";
import { Schema } from "effect";
import type { PTYSessionInfo } from "../types.js";

/**
 * PTY List tool - shows all PTY sessions
 */
export const PTYList = Tool.make("pty_list", {
  description: `Lists all PTY sessions (active and exited).

Use this tool to:
- See all running and exited PTY sessions
- Get session IDs for use with other pty_* tools
- Check the status and output line count of each session
- Monitor which processes are still running

Sessions remain in the list after exit until explicitly cleaned up with pty_kill, allowing you to read their output logs.`,
  parameters: {},
  success: Schema.String,
});

/**
 * Format list output
 */
export function formatListOutput(sessions: PTYSessionInfo[]): string {
  if (sessions.length === 0) {
    return `<pty_list>
No PTY sessions found.
</pty_list>`;
  }

  const formatted = sessions.map((session) => {
    const exitInfo = session.exitCode !== undefined ? ` (exit: ${session.exitCode})` : "";
    const title = session.title + exitInfo;
    const commandLine = `${session.command} ${session.args.join(" ")}`.trim();
    
    return `[${session.id}] ${title}
  Command: ${commandLine}
  Status: ${session.status}
  PID: ${session.pid} | Lines: ${session.lineCount} | Workdir: ${session.workdir}
  Created: ${session.createdAt.toISOString()}`;
  }).join("\n\n");

  return `<pty_list>
${formatted}

Total: ${sessions.length} session(s)
</pty_list>`;
}
