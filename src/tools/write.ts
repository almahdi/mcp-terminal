import { Tool } from "@effect/ai";
import { Schema } from "effect";

/**
 * PTY Write tool - sends input to a PTY session
 */
export const PTYWrite = Tool.make("pty_write", {
  description: `Sends input data to an active PTY session.

Use this tool to:
- Type commands or text into an interactive terminal
- Send special key sequences (Ctrl+C, Enter, arrow keys, etc.)
- Respond to prompts in interactive programs

Common escape sequences:
- Enter/newline: "\\n" or "\\r"
- Ctrl+C (interrupt): "\\x03"
- Ctrl+D (EOF): "\\x04"
- Ctrl+Z (suspend): "\\x1a"
- Tab: "\\t"
- Arrow Up: "\\x1b[A"
- Arrow Down: "\\x1b[B"
- Arrow Right: "\\x1b[C"
- Arrow Left: "\\x1b[D"`,
  parameters: {
    id: Schema.String.annotations({
      description: "The PTY session ID (from pty_spawn)"
    }),
    data: Schema.String.annotations({
      description: "Input string to send (supports escape sequences)"
    }),
  },
  success: Schema.String,
});

/**
 * Format write output
 */
export function formatWriteOutput(id: string, data: string): string {
  const preview = data.length > 50 ? data.slice(0, 50) + "..." : data;
  const byteCount = Buffer.byteLength(data, "utf8");
  
  return `<pty_write>
Success: ${id}
Data sent: ${preview} (${byteCount} bytes)
</pty_write>`;
}
