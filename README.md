# PTY MCP Server

**pty-mcp** is a Model Context Protocol (MCP) server designed to manage pseudo-terminal (PTY) sessions. Built with **TypeScript** and the **Effect** ecosystem, it provides a robust and type-safe interface for spawning, controlling, and interacting with terminal processes programmatically.

## Features

- **Spawn Sessions:** Create new PTY sessions with custom commands, arguments, and environment variables.
- **Interactive Control:** Write data to stdin and read from stdout/stderr in real-time.
- **Session Management:** List active sessions, monitor status, and terminate processes.
- **Effect Ecosystem:** Leverages the power of the Effect library for error handling, concurrency, and resource management.
- **MCP Integration:** Seamlessly exposes PTY capabilities to MCP-compliant clients.

## Installation

```bash
pnpm install
```

## Usage

### Build

```bash
pnpm run build
```

### Start Server

```bash
pnpm start
```

### Testing

```bash
pnpm run test
```

## Author

**Ali Almahdi**
*Digital Innovation Architect & AI Enthusiast*

Crafting the future of technology at the intersection of AI and human experience.

- **Website:** [ali.ac](https://ali.ac)
- **GitHub:** [@almahdi](https://github.com/almahdi)
- **X (Twitter):** [@alialmahdi](https://twitter.com/alialmahdi)

## License

This project is licensed under the **AGPL-3.0 License**. See the [LICENSE](LICENSE) file for details.
