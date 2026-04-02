import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions


async def main():
    options = ClaudeAgentOptions(
        cwd="/home/user/Spaceways",
        setting_sources=["user", "project"],
        allowed_tools=["Skill", "Read", "Write", "Bash"],
    )

    async for message in query(
        prompt="Help me process this PDF document", options=options
    ):
        print(message)


if __name__ == "__main__":
    asyncio.run(main())
