import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaWebSearchTool20260209,
  BetaCodeExecutionTool20260120,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages.js";
import { readFileTool, writeFileTool, listFilesTool } from "./tools.js";

const SYSTEM_PROMPT = `You are a capable AI research and coding assistant with access to:
- Web search: find current information, news, documentation
- Code execution: write and run Python code for analysis, computation, and data processing
- File system: read and write files in the workspace directory

Use tools proactively to give accurate, verified answers. When asked to write code or
analyze data, use the code execution tool to run it and show the results.`;

// Server-side tools — handled entirely by Anthropic's infrastructure
const SERVER_TOOLS: (BetaWebSearchTool20260209 | BetaCodeExecutionTool20260120)[] = [
  { type: "web_search_20260209", name: "web_search" },
  { type: "code_execution_20260120", name: "code_execution" },
];

const CUSTOM_TOOLS = [readFileTool, writeFileTool, listFilesTool];

export class Agent {
  private client: Anthropic;
  private history: BetaMessageParam[] = [];

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Send a user message and stream the agent's response to stdout.
   * Maintains conversation history across calls for multi-turn dialogue.
   */
  async chat(userMessage: string): Promise<string> {
    this.history.push({ role: "user", content: userMessage });

    let finalText = "";

    const runner = this.client.beta.messages.toolRunner({
      model: "claude-opus-4-6",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools: [...CUSTOM_TOOLS, ...SERVER_TOOLS],
      messages: this.history,
      stream: true,
    });

    for await (const messageStream of runner) {
      let iterationText = "";

      for await (const event of messageStream) {
        switch (event.type) {
          case "content_block_start":
            if (event.content_block.type === "server_tool_use") {
              process.stdout.write(
                `\n\x1b[2m[tool: ${event.content_block.name}]\x1b[0m `,
              );
            }
            break;

          case "content_block_delta":
            if (event.delta.type === "text_delta") {
              process.stdout.write(event.delta.text);
              iterationText += event.delta.text;
            }
            break;
        }
      }

      if (iterationText) {
        finalText = iterationText;
      }
    }

    // Store the final assistant response in history for multi-turn context
    if (finalText) {
      this.history.push({ role: "assistant", content: finalText });
    }

    return finalText;
  }

  /** Clear conversation history to start a fresh session. */
  reset(): void {
    this.history = [];
  }

  get turnCount(): number {
    return this.history.filter((m) => m.role === "user").length;
  }
}
