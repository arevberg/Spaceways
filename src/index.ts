import "dotenv/config";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { Agent } from "./agent.js";

const HELP_TEXT = `
Commands:
  /reset    Start a new conversation (clears history)
  /help     Show this help
  /quit     Exit

Just type your message and press Enter to chat.
`;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Error: ANTHROPIC_API_KEY is not set.\n" +
        "Copy .env.example to .env and add your API key.",
    );
    process.exit(1);
  }

  console.log("\x1b[1mSpaceways AI\x1b[0m — agentic assistant");
  console.log("Tools: web search · code execution · read/write files");
  console.log('Type \x1b[2m/help\x1b[0m for commands, \x1b[2m/quit\x1b[0m to exit.\n');

  const rl = createInterface({ input, output });
  const agent = new Agent();

  const cleanup = () => {
    rl.close();
    process.stdout.write("\n");
    process.exit(0);
  };

  rl.on("SIGINT", cleanup);

  while (true) {
    let userInput: string;
    try {
      userInput = (await rl.question("\x1b[36m>\x1b[0m ")).trim();
    } catch {
      // readline closed (Ctrl+D)
      break;
    }

    if (!userInput) continue;

    // Built-in commands
    if (userInput === "/quit" || userInput === "/exit") break;
    if (userInput === "/help") {
      console.log(HELP_TEXT);
      continue;
    }
    if (userInput === "/reset") {
      agent.reset();
      console.log("\x1b[2mConversation reset.\x1b[0m\n");
      continue;
    }

    // Run agent
    try {
      process.stdout.write("\n\x1b[33mAssistant:\x1b[0m ");
      await agent.chat(userInput);
      process.stdout.write("\n\n");
    } catch (err) {
      process.stdout.write("\n");
      if (err instanceof Error) {
        console.error(`\x1b[31mError:\x1b[0m ${err.message}\n`);
      } else {
        console.error(`\x1b[31mUnexpected error:\x1b[0m ${String(err)}\n`);
      }
    }
  }

  cleanup();
}

main();
