import { McpServer, Tool, Toolkit } from "@effect/ai"
import { NodeRuntime, NodeSink, NodeStream } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"

// 1. Define the Add tool
const Add = Tool.make("add", {
  description: "Adds two numbers together",
  parameters: {
    a: Schema.Number,
    b: Schema.Number
  },
  success: Schema.Number
})

// 2. Create toolkit from the tool
const AddToolkit = Toolkit.make(Add)

// 3. Implement the handler
const AddToolkitLive = AddToolkit.toLayer({
  add: ({ a, b }) => Effect.succeed(a + b)
})

// 4. Register toolkit with McpServer
const ToolRegistration = Layer.effectDiscard(
  McpServer.registerToolkit(AddToolkit)
)

// 5. Create stdio transport layer
const McpLive = McpServer.layerStdio({
  name: "Add Server",
  version: "1.0.0",
  stdin: NodeStream.stdin,
  stdout: NodeSink.stdout
})

// 6. Compose layers and launch
const ServerLayer = ToolRegistration.pipe(
  Layer.provide(McpLive),
  Layer.provide(AddToolkitLive)
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
