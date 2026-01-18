# Agentic Coding Guidelines

This repository contains the PTY MCP Server, a Model Context Protocol server for managing pseudo-terminal sessions.
It is built using TypeScript and the Effect ecosystem.

## 1. Build, Lint, and Test

**Package Manager:** `pnpm`
**Runtime:** Node.js (ESM)

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build the project (`tsc`) |
| `pnpm run type-check` | Run type checking without emitting files |
| `pnpm start` | Start the server (`tsx src/index.ts`) |
| `pnpm run test` | Run all tests (`vitest`) |

### Running Tests
- **Single Test File:** `pnpm exec vitest run tests/path/to/file.test.ts`
- **Specific Test Case:** `pnpm exec vitest run -t "test name"`

*Note: The `tests/` directory structure exists but may be empty. New tests should use Vitest and follow the `src/` structure.*

## 2. Code Style & Conventions

### Framework: Effect
This project heavily relies on the **Effect** library.
- **Generators:** Use `Effect.gen(function* () { ... })` for effect composition.
- **Dependency Injection:** Use `Context.Tag` for services and `Layer` for implementations.
- **Layers:** Convention is `ServiceName` for the tag and `ServiceNameLive` for the default implementation.
- **Errors:** Use typed errors (e.g., `Effect<Success, CustomError>`). Do not `throw` exceptions; return failed Effects.

### TypeScript & ESM
- **Strict Mode:** Enabled, including `noUncheckedIndexedAccess`. Handle undefined checks explicitly.
- **Imports:** **MUST** use `.js` extensions for relative imports (e.g., `import { foo } from "./utils.js"`).
- **Module:** `nodenext`/`esnext`.

### Naming Conventions
- **Files:** camelCase (e.g., `ptyManager.ts`) or PascalCase for Classes/Services.
- **Services/Tags:** PascalCase (e.g., `PTYManager`).
- **Layers:** PascalCase + `Live` (e.g., `PTYManagerLive`).
- **Functions/Variables:** camelCase.
- **Types/Interfaces:** PascalCase.

### Formatting
- **Indentation:** 2 spaces.
- **Quotes:** Double quotes.
- **Semicolons:** Always.
- **Trailing Commas:** ES5/Prettier default.

### Directory Structure
- `src/`: Source code.
  - `services/`: Core logic and Effect services.
  - `tools/`: MCP tool implementations.
  - `utils/`: Helper functions.
- `tests/`: Test files (mirrors `src/`).

## 3. Implementation Rules
1.  **Effect First:** Always prefer Effect primitives over native Promise/async-await where possible.
2.  **Type Safety:** Do not use `any`. Use `unknown` if necessary and refine.
3.  **Dependencies:** Check `package.json` before importing. Do not introduce new dependencies without user approval.
4.  **Error Handling:** Define custom error classes for domain errors.
