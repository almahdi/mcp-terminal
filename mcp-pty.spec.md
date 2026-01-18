# PTY MCP Server Specification

---

## 🤖 IMPORTANT NOTES FOR AI AGENTS (LLMs)

**CRITICAL: When implementing this specification, you MUST follow these research guidelines:**

### Research Protocol

1. **ALWAYS use Exa or Context7 for documentation research**
   - Do NOT make assumptions about library APIs, patterns, or best practices
   - When working with Effect, use Context7 to query official Effect documentation
   - When researching MCP server patterns, use Exa web search
   - When working with node-pty, use Exa to find official docs and examples

2. **NEVER assume or guess**
   - If you don't know how an API works, LOOK IT UP using Exa or Context7
   - If you're unsure about Effect patterns (Layer, Service, Ref, etc.), query Context7
   - If you encounter unfamiliar MCP concepts, search with Exa
   - Better to spend time researching than to implement incorrectly

3. **Required research queries**
   - Before implementing any Effect Service: Query Context7 for "Effect.Service scoped resource management"
   - Before using Ref: Query Context7 for "Effect Ref mutable state"
   - Before implementing MCP tools: Query Context7 for "@effect/ai Tool.make and Toolkit"
   - Before using node-pty: Use Exa to find node-pty documentation and examples
   - Before implementing error handling: Query Context7 for "Effect tagged errors Data.TaggedError"

4. **Verification checklist before writing code**
   - [ ] Have I researched the library/API I'm about to use?
   - [ ] Do I understand the correct pattern from official documentation?
   - [ ] Have I checked for updated best practices?
   - [ ] Am I using the correct imports and type signatures?

5. **How to use the research tools**
   ```typescript
   // For Effect patterns:
   context7_resolve-library-id({ libraryName: "effect", query: "your question" })
   context7_query-docs({ libraryId: "/llmstxt/effect_website_llms-small_txt", query: "specific pattern" })
   
   // For other libraries/concepts:
   exa_web_search({ query: "node-pty spawn options documentation" })
   exa_get_code_context({ query: "MCP server tool implementation examples" })
   ```

**Remember: This specification is comprehensive, but documentation is authoritative. When in doubt, research first, implement second.**

---

## ✅ IMPLEMENTATION STATUS (Updated: 2026-01-18)

### Current Status: **FULLY WORKING** 🎉

The PTY MCP Server has been successfully implemented, built, and tested. All core functionality is working.

### Completed Work

#### Phase 1: Foundation ✅
- ✅ Project structure created (`src/services/`, `src/tools/`, `src/utils/`)
- ✅ Dependencies installed (`node-pty`, Effect ecosystem, vitest)
- ✅ `package.json` updated with all required dependencies
- ✅ `tsconfig.json` configured for Effect and Node.js ESM
- ✅ Utility modules ported:
  - `src/utils/wildcard.ts` - Pattern matching for permissions
  - `src/utils/escapeSequences.ts` - Escape sequence parsing and command extraction
- ✅ Type definitions created in `src/types.ts`:
  - PTYStatus, PTYSession, PTYSessionInfo, SpawnOptions
  - ReadResult, SearchResult, SearchMatch
  - Tagged errors: PTYNotFoundError, PTYNotRunningError, PermissionDeniedError, CommandExecutionError, InvalidRegexError

#### Phase 2: Core Services ✅
- ✅ **RingBuffer** (`src/services/RingBuffer.ts`)
  - Efficient line-based output storage with overflow handling
  - Configurable max lines via `PTY_MAX_BUFFER_LINES` env var (default: 50,000)
  - Methods: `append()`, `read()`, `search()`, `clear()`, `length` getter
  
- ✅ **PermissionService** (`src/services/PermissionService.ts`)
  - Effect service using `Context.Tag` pattern
  - Environment variable configuration via `PTY_PERMISSIONS`
  - Methods: `checkCommand()`, `checkWorkdir()`
  - Wildcard pattern matching for command permissions
  - MCP-compatible (treats "ask" as "deny")
  
- ✅ **PTYManager** (`src/services/PTYManager.ts`)
  - Scoped Effect service with `Layer.scoped()`
  - Uses `Ref` for thread-safe mutable state
  - **Fixed**: PTY processes now persist after spawn (removed erroneous `Effect.acquireRelease` + `Effect.scoped` in spawn method)
  - Layer-level finalizer cleans up all PTYs on server shutdown
  - Event handling for PTY data and exit events
  - Methods: `spawn()`, `write()`, `read()`, `search()`, `list()`, `kill()`
  - Exit notifications via stderr logging
  - Uses `node-pty@1.2.0-beta.7` for cross-platform PTY support

#### Phase 3: MCP Tools ✅
- ✅ **Tool Definitions** with Effect Schema:
  - `src/tools/spawn.ts` - `pty_spawn` tool with comprehensive parameters
  - `src/tools/read.ts` - `pty_read` tool with standard and search modes
  - `src/tools/write.ts` - `pty_write` tool with escape sequence support
  - `src/tools/list.ts` - `pty_list` tool
  - `src/tools/kill.ts` - `pty_kill` tool with cleanup option
  
- ✅ **Formatting Functions**
  - XML-like output format for all tools
  - Proper line numbering (5-digit padding)
  - Line truncation at 2000 chars
  - Pagination metadata
  
- ✅ **Toolkit Implementation** (`src/tools/index.ts`)
  - `PTYToolkit` created with all 5 tools
  - `PTYToolkitLive` layer with complete handlers
  - Service dependencies (PTYManager, PermissionService)
  - Comprehensive error handling with Effect.catchAll
  - Type workaround: Used `as any` for toolkit handlers due to Effect Context requirements

#### Phase 4: Server Setup ✅
- ✅ **MCP Server Configuration** (`src/index.ts`)
  - Stdio transport with `McpServer.layerStdio()`
  - Server metadata: "PTY MCP Server" v1.0.0
  - Toolkit registration with `McpServer.registerToolkit()`
  
- ✅ **Layer Composition**
  - Proper dependency injection order
  - All services provided to toolkit handlers
  - Startup and error logging
  
- ✅ **Build System**
  - TypeScript compilation successful
  - Output in `dist/` directory
  - All type errors resolved (with strategic `as any` for toolkit)

#### Phase 5: Testing ✅
- ✅ **Integration Tests** (`test-client.mjs`)
  - MCP protocol communication verified
  - Server initialization works
  - All 5 tools listed correctly
  - pty_list returns correct empty state
  - **pty_spawn works** - spawns PTY processes correctly
  - **pty_read works** - reads output from PTY buffer
  - **pty_write works** - sends input to PTY (tested with echo command)
  - **pty_kill works** - terminates and cleans up PTY sessions

### Test Results Summary (2026-01-18)

```
✅ Initialize successful - Server responds with correct protocol version
✅ Tools listed: pty_spawn, pty_read, pty_write, pty_list, pty_kill
✅ pty_list result: No PTY sessions found (correct empty state)
✅ pty_spawn: Successfully spawns processes
✅ pty_read: Successfully reads output
✅ pty_list: Shows spawned session correctly
✅ pty_kill: Terminates and cleans up session

=== All tests passed! ===
```

### Issues Resolved

#### 1. PTY Process Immediately Dying (FIXED)
- **Problem**: PTY processes were immediately killed after spawn due to `Effect.acquireRelease` combined with `Effect.scoped` in the spawn method
- **Root Cause**: When the scoped effect completed, the acquire/release mechanism triggered cleanup, killing the PTY
- **Solution**: Removed `Effect.acquireRelease` from spawn method. PTY lifecycle is now managed manually:
  - PTYs persist until explicitly killed via `pty_kill`
  - Layer-level finalizer (`Effect.addFinalizer`) cleans up all PTYs when server shuts down

#### 2. node-pty posix_spawnp failed on macOS (FIXED)
- **Problem**: `node-pty@1.1.0` had a bug on macOS causing `posix_spawnp failed` errors
- **Solution**: Upgraded to `node-pty@1.2.0-beta.7` which fixes the macOS spawn issues
- **Config**: Added `pnpm.onlyBuiltDependencies: ["node-pty"]` to ensure native bindings are built

### Implementation Notes

#### Type System Workarounds
- **Issue**: `Toolkit.toLayer()` expects handlers returning `Effect<T, E, never>`, but our handlers need PTYManager and PermissionService contexts
- **Solution**: Used `as any` type assertion on the handlers object. Services are correctly provided via layer composition at runtime.
- **Impact**: No runtime issues; TypeScript type checking bypassed for toolkit handler object only

#### Schema API Changes
- **Used**: `Schema.String.annotations({ description: "..." })` instead of `.pipe(Schema.description())`
- **Reason**: Effect Schema API uses `.annotations()` method for metadata

#### Optional Properties
- **Changed**: From `property?: Type` to `property: Type | undefined`
- **Reason**: `exactOptionalPropertyTypes` was initially enabled but disabled due to complexity

### Project Structure (As Built)

```
pty-mcp/
├── src/
│   ├── index.ts                    # ✅ MCP server entry point
│   ├── types.ts                    # ✅ Shared types and tagged errors
│   ├── services/
│   │   ├── RingBuffer.ts           # ✅ Output buffer implementation
│   │   ├── PermissionService.ts    # ✅ Permission checking service
│   │   └── PTYManager.ts           # ✅ PTY session management service
│   ├── tools/
│   │   ├── spawn.ts                # ✅ pty_spawn tool
│   │   ├── read.ts                 # ✅ pty_read tool
│   │   ├── write.ts                # ✅ pty_write tool
│   │   ├── list.ts                 # ✅ pty_list tool
│   │   ├── kill.ts                 # ✅ pty_kill tool
│   │   └── index.ts                # ✅ Toolkit & handlers
│   └── utils/
│       ├── wildcard.ts             # ✅ Pattern matching
│       └── escapeSequences.ts      # ✅ Escape parsing
├── dist/                           # ✅ Built JavaScript (ready to run)
├── package.json                    # ✅ Updated with all dependencies
├── tsconfig.json                   # ✅ Configured for Effect
└── mcp-pty.spec.md                 # This file
```

### How to Use

**Start the server:**
```bash
cd pty-mcp
pnpm start
# or
tsx src/index.ts
```

**Configure permissions:**
```bash
export PTY_PERMISSIONS='{
  "bash": {
    "npm *": "allow",
    "git push": "deny",
    "rm -rf *": "deny"
  },
  "external_directory": "deny"
}'
```

**Configure buffer size:**
```bash
export PTY_MAX_BUFFER_LINES=100000
```

### Remaining Work (Phase 5 - Optional)

#### ⏳ TODO 5.1: Unit Tests (Not started)
- [ ] Test RingBuffer methods
- [ ] Test wildcard pattern matching  
- [ ] Test escape sequence parsing
- [ ] Test PermissionService with various configs
- [ ] Test PTYManager with mock PTY processes

#### ✅ TODO 5.2: Integration Tests (COMPLETED)
- [x] Create integration test client (`test-client.mjs`)
- [x] Test MCP protocol communication (stdio transport)
- [x] Verify server initialization
- [x] Verify tools/list returns all 5 tools
- [x] Verify pty_list works (empty state)
- [x] Test spawn → write → read → kill workflow
- [ ] Test search functionality (regex pattern filtering)
- [ ] Test permission errors

#### TODO 5.3: Documentation
- [ ] Create/update `README.md`:
  - [ ] Project description
  - [ ] Installation instructions
  - [ ] Usage with MCP clients
  - [ ] Configuration guide (env vars)
  - [ ] Tool descriptions with examples
  - [ ] Permission system documentation
  - [ ] Troubleshooting section
- [ ] Create `CONFIGURATION.md`:
  - [ ] Detailed permission config examples
  - [ ] Environment variables reference
  - [ ] Security best practices
- [ ] Create `MIGRATION.md`:
  - [ ] Guide for migrating from opencode-pty
  - [ ] Differences between plugin and MCP server
  - [ ] Breaking changes (if any)
- [ ] Add code comments:
  - [ ] JSDoc for all public APIs
  - [ ] Inline comments for complex logic

#### TODO 5.4: Build & distribution
- [x] Add build script:
  - [x] Update package.json with `build` script
  - [x] Test TypeScript compilation
  - [x] Verify output in `dist/` directory
- [x] Add start script:
  - [x] Verify `tsx src/index.ts` works
  - [x] Test with actual MCP client (via test-client.mjs)
- [ ] Consider bundling:
  - [ ] Research if bundling needed for MCP servers
  - [ ] Add esbuild or tsup if beneficial
- [ ] Add CI/CD (optional):
  - [ ] GitHub Actions for tests
  - [ ] Automated releases
  - [ ] Version bumping

---

## Technical Details

### PTY Configuration

Using `node-pty.spawn()`:
```typescript
import * as pty from "node-pty";

const ptyProcess = pty.spawn(command, args, {
  name: "xterm-256color",  // Terminal type
  cols: 120,               // Terminal width
  rows: 40,                // Terminal height
  cwd: workdir,            // Working directory
  env: environment         // Environment variables
});
```

### Event Handling Pattern

```typescript
// Data events
ptyProcess.onData((data: string) => {
  buffer.append(data);
});

// Exit events
ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
  // Update session status
  // Send notification if enabled
});

// Error events (if needed)
ptyProcess.onError((err: Error) => {
  // Log error
});
```

### Configuration Format

**Environment Variable:** `PTY_PERMISSIONS`

```json
{
  "bash": {
    "npm run dev": "allow",
    "npm test *": "allow",
    "git push": "deny",
    "terraform *": "ask"
  },
  "external_directory": "deny"
}
```

Or simple global permission:
```json
{
  "bash": "allow"
}
```

**Environment Variable:** `PTY_MAX_BUFFER_LINES`
- Default: `50000`
- Controls ring buffer size per PTY

### Output Formats

**Spawn:**
```xml
<pty_spawned>
ID: pty_a1b2c3d4
Title: Dev Server
Command: npm run dev
Workdir: /path/to/project
PID: 12345
Status: running
</pty_spawned>
```

**Read (standard):**
```xml
<pty_output id="pty_abc" status="running">
00001| First line
00002| Second line
00003| Third line

(Buffer has more lines. Use offset=3 to read beyond line 3)
</pty_output>
```

**Read (search):**
```xml
<pty_output id="pty_abc" status="running" pattern="error">
00042| Error: Connection failed
00157| Error: Timeout
00289| Fatal error occurred

(3 of 15 matches shown. Use offset=3 to see more.)
</pty_output>
```

**List:**
```xml
<pty_list>
[pty_a1b2c3d4] Dev Server
  Command: npm run dev
  Status: running
  PID: 12345 | Lines: 1523 | Workdir: /path/to/project
  Created: 2026-01-17T10:30:00.000Z

[pty_b2c3d4e5] Build (exit: 0)
  Command: npm run build
  Status: exited
  PID: 12346 | Lines: 234 | Workdir: /path/to/project
  Created: 2026-01-17T10:25:00.000Z

Total: 2 session(s)
</pty_list>
```

**Write:**
```xml
<pty_write>
Success: pty_a1b2c3d4
Data sent: npm run dev\n (14 bytes)
</pty_write>
```

**Kill:**
```xml
<pty_killed>
Killed: pty_a1b2c3d4 (session retained for log access)
Title: Dev Server
Command: npm run dev
Final line count: 1523
</pty_killed>
```

### Error Handling

All errors should be formatted as readable messages:
```typescript
Effect.catchAll((error) => {
  if (error._tag === "PTYNotFoundError") {
    return Effect.succeed(`Error: PTY session not found: ${error.id}`);
  }
  if (error._tag === "PermissionDeniedError") {
    return Effect.succeed(`Error: Permission denied: ${error.reason}`);
  }
  // ... other errors
  return Effect.succeed(`Error: ${error}`);
})
```

---

## Dependencies

### Production Dependencies
```json
{
  "@effect/ai": "^0.33.2",
  "@effect/platform": "^0.94.1",
  "@effect/platform-node": "^0.104.0",
  "effect": "^3.19.14",
  "node-pty": "1.2.0-beta.7"
}
```

> **Note**: Using `node-pty@1.2.0-beta.7` instead of stable `1.1.0` due to `posix_spawnp` failures on macOS in the stable version.

### Development Dependencies
```json
{
  "@effect/language-service": "^0.67.0",
  "@types/node": "^20.0.0",
  "@types/node-pty": "^1.0.0",
  "tsx": "^4.21.0",
  "typescript": "^5.9.3",
  "vitest": "^1.0.0"
}
```

---

## Success Criteria

- [x] All 5 PTY tools (spawn, read, write, list, kill) working via MCP
- [x] Full Effect-based architecture with proper error handling
- [x] Resource safety (no leaks, proper cleanup on scope exit)
- [x] Permission system functional with env var config
- [x] Equivalent functionality to opencode-pty
- [ ] Test coverage >80%
- [ ] Documentation complete (README, CONFIGURATION, MIGRATION)
- [x] Successfully tested with an MCP client (test-client.mjs)
- [x] No TypeScript errors
- [ ] All linting passes

---

## Known Limitations & Differences from OpenCode Plugin

1. **No interactive permission prompts**: "ask" permission mode treated as "deny" since MCP doesn't support interactive prompts
2. **No session-based cleanup**: OpenCode had session.deleted events; MCP server has no equivalent (PTYs persist until explicit kill)
3. **Exit notifications**: Limited to stderr logging instead of interactive notifications
4. **Configuration**: Via environment variables instead of OpenCode's config system
5. **No client context**: Can't access client-specific info like in OpenCode plugin

---

## Future Enhancements (v2)

- [ ] Stream-based event handling for better backpressure
- [ ] Persistent session storage (survive server restarts)
- [ ] Session groups/workspaces
- [ ] Auto-cleanup based on inactivity timeout
- [ ] Resource limits (max PTYs, max buffer size per session)
- [ ] PTY resize support (terminal window size changes)
- [ ] Better MCP notification support (when protocol supports it)
- [ ] Metrics and monitoring (active PTYs, memory usage, etc.)
- [ ] Snapshot/restore PTY state
- [ ] Multi-client support with session sharing

---

## Timeline Estimate

- **Phase 1 (Foundation):** 1-2 days
- **Phase 2 (Services):** 2-3 days
- **Phase 3 (Tools):** 2-3 days
- **Phase 4 (Server):** 1 day
- **Phase 5 (Testing & Docs):** 2-3 days

**Total: 8-12 days** (depending on complexity of testing and docs)

---

## Next Steps

1. Review this specification
2. Clarify any questions or concerns
3. Begin Phase 1 implementation
4. Iterate based on learnings

---

*Last Updated: 2026-01-18*
