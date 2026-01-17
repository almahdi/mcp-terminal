/**
 * Parse escape sequences in a string to their actual byte values.
 * Handles: \n, \r, \t, \xNN (hex), \uNNNN (unicode), \\
 */
export function parseEscapeSequences(input: string): string {
  return input.replace(/\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|[nrt\\])/g, (match, seq: string) => {
    if (seq.startsWith("x")) {
      return String.fromCharCode(parseInt(seq.slice(1), 16));
    }
    if (seq.startsWith("u")) {
      return String.fromCharCode(parseInt(seq.slice(1), 16));
    }
    switch (seq) {
      case "n": return "\n";
      case "r": return "\r";
      case "t": return "\t";
      case "\\": return "\\";
      default: return match;
    }
  });
}

/**
 * Extract commands from PTY input data.
 * Filters out control sequences like ^C and ^D.
 */
export function extractCommands(data: string): string[] {
  const commands: string[] = [];
  const lines = data.split(/[\n\r]+/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("\x03") && !trimmed.startsWith("\x04")) {
      commands.push(trimmed);
    }
  }
  return commands;
}

/**
 * Parse a command line into command and arguments.
 */
export function parseCommand(commandLine: string): { command: string; args: string[] } {
  const parts = commandLine.split(/\s+/).filter(Boolean);
  const command = parts[0] ?? "";
  const args = parts.slice(1);
  return { command, args };
}
