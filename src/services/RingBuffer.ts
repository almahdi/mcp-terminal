import type { SearchMatch } from "../types.js";

const DEFAULT_MAX_LINES = parseInt(process.env.PTY_MAX_BUFFER_LINES || "50000", 10);

/**
 * Ring buffer for storing PTY output lines.
 * Automatically evicts oldest lines when capacity is reached.
 */
export class RingBuffer {
  private lines: string[] = [];
  private maxLines: number;

  constructor(maxLines: number = DEFAULT_MAX_LINES) {
    this.maxLines = maxLines;
  }

  /**
   * Append data to the buffer, splitting on newlines.
   * Evicts oldest lines if buffer is full.
   */
  append(data: string): void {
    const newLines = data.split("\n");
    for (const line of newLines) {
      this.lines.push(line);
      if (this.lines.length > this.maxLines) {
        this.lines.shift();
      }
    }
  }

  /**
   * Read lines from the buffer with pagination.
   * @param offset - Starting line index (0-based)
   * @param limit - Maximum number of lines to return
   */
  read(offset: number = 0, limit?: number): string[] {
    const start = Math.max(0, offset);
    const end = limit !== undefined ? start + limit : this.lines.length;
    return this.lines.slice(start, end);
  }

  /**
   * Search buffer for lines matching a regex pattern.
   * Returns all matches with their original line numbers (1-based).
   */
  search(pattern: RegExp): SearchMatch[] {
    const matches: SearchMatch[] = [];
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (line !== undefined && pattern.test(line)) {
        matches.push({ lineNumber: i + 1, text: line });
      }
    }
    return matches;
  }

  /**
   * Get the current number of lines in the buffer.
   */
  get length(): number {
    return this.lines.length;
  }

  /**
   * Clear all lines from the buffer.
   */
  clear(): void {
    this.lines = [];
  }
}
