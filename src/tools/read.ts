import { Tool } from "@effect/ai";
import { Schema } from "effect";
import type { ReadResult, SearchResult, PTYSessionInfo } from "../types.js";

/**
 * PTY Read tool - reads output from a PTY session
 */
export const PTYRead = Tool.make("pty_read", {
  description: `Reads output from a PTY session's buffer.

The PTY maintains a rolling buffer of output lines. Use offset and limit to paginate through the output.

Two modes:
1. Standard mode (no pattern): Returns consecutive lines
2. Search mode (with pattern): Filters lines by regex, returns matches with line numbers

The buffer stores up to PTY_MAX_BUFFER_LINES (default: 50000) lines. Older lines are discarded when the limit is reached.`,
  parameters: {
    id: Schema.String.annotations({
      description: "The PTY session ID (from pty_spawn)"
    }),
    offset: Schema.optional(Schema.Number).annotations({
      description: "Line number to start reading from (0-based, defaults to 0)"
    }),
    limit: Schema.optional(Schema.Number).annotations({
      description: "Number of lines to read (defaults to 500)"
    }),
    pattern: Schema.optional(Schema.String).annotations({
      description: "Regex pattern to filter lines (enables search mode)"
    }),
    ignoreCase: Schema.optional(Schema.Boolean).annotations({
      description: "Case-insensitive pattern matching (default: false)"
    }),
  },
  success: Schema.String,
});

/**
 * Format standard read output
 */
export function formatReadOutput(id: string, result: ReadResult, sessionInfo?: PTYSessionInfo): string {
  const MAX_LINE_LENGTH = 2000;
  
  if (result.lines.length === 0) {
    return `<pty_output id="${id}" status="${result.status}">
Buffer is empty or offset is beyond available lines.

Total lines in buffer: ${result.totalLines}
</pty_output>`;
  }

  const formattedLines = result.lines
    .map((line, idx) => {
      const lineNumber = result.offset + idx + 1; // 1-based
      const truncated = line.length > MAX_LINE_LENGTH 
        ? line.slice(0, MAX_LINE_LENGTH) + "..."
        : line;
      return `${String(lineNumber).padStart(5, "0")}| ${truncated}`;
    })
    .join("\n");

  const hasMoreText = result.hasMore
    ? `\n(Buffer has more lines. Use offset=${result.offset + result.lines.length} to read beyond line ${result.offset + result.lines.length})`
    : "";

  return `<pty_output id="${id}" status="${result.status}">
${formattedLines}
${hasMoreText}
</pty_output>`;
}

/**
 * Format search output
 */
export function formatSearchOutput(
  id: string,
  result: SearchResult,
  pattern: string
): string {
  if (result.matches.length === 0) {
    return `<pty_output id="${id}" status="${result.status}" pattern="${pattern}">
No matches found.

Pattern: ${pattern}
Total lines searched: ${result.totalLines}
</pty_output>`;
  }

  const MAX_LINE_LENGTH = 2000;
  
  const formattedMatches = result.matches
    .map((match) => {
      const truncated = match.text.length > MAX_LINE_LENGTH
        ? match.text.slice(0, MAX_LINE_LENGTH) + "..."
        : match.text;
      return `${String(match.lineNumber).padStart(5, "0")}| ${truncated}`;
    })
    .join("\n");

  const hasMoreText = result.hasMore
    ? `\n(${result.matches.length} of ${result.totalMatches} matches shown. Use offset=${result.offset + result.matches.length} to see more.)`
    : `\n(Showing all ${result.totalMatches} matches)`;

  return `<pty_output id="${id}" status="${result.status}" pattern="${pattern}">
${formattedMatches}
${hasMoreText}
</pty_output>`;
}
