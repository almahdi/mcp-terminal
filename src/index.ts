import { McpServer } from "@effect/ai";
import { NodeRuntime, NodeSink, NodeStream } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { PTYToolkit, PTYToolkitLive } from "./tools/index.js";
import { PTYManagerLive } from "./services/PTYManager.js";
import { PermissionServiceLive } from "./services/PermissionService.js";

// Log startup
console.error("[PTY MCP Server] Starting...");

// 1. Register toolkit with McpServer
const ToolRegistration = Layer.effectDiscard(
  McpServer.registerToolkit(PTYToolkit)
);

// 2. Create stdio transport layer
const McpLive = McpServer.layerStdio({
  name: "PTY MCP Server",
  version: "1.0.0",
  stdin: NodeStream.stdin,
  stdout: NodeSink.stdout,
});

// 3. Compose all layers
const ServerLayer = ToolRegistration.pipe(
  Layer.provide(McpLive),
  Layer.provide(PTYToolkitLive),
  Layer.provide(PTYManagerLive),
  Layer.provide(PermissionServiceLive)
);

// 4. Launch server
Layer.launch(ServerLayer).pipe(
  Effect.tapError((error) =>
    Effect.sync(() => {
      console.error("[PTY MCP Server] Fatal error:", error);
    })
  ),
  NodeRuntime.runMain
);

console.error("[PTY MCP Server] Ready");

