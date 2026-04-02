import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  for await (const message of query({
    prompt: "Find all TODO comments and create a summary",
    options: { allowedTools: ["Read", "Glob", "Grep"] },
  })) {
    if ("result" in message) {
      console.log(message.result);
    }
  }
}

main();
