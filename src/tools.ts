import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const WORKSPACE_DIR = process.env.WORKSPACE_DIR ?? "./workspace";

function safeJoin(base: string, target: string): string | null {
  const abs = path.resolve(base);
  const resolved = path.resolve(abs, target);
  // Prevent path traversal outside workspace
  if (!resolved.startsWith(abs + path.sep) && resolved !== abs) {
    return null;
  }
  return resolved;
}

export const readFileTool = betaZodTool({
  name: "read_file",
  description:
    "Read the contents of a file from the workspace directory. " +
    "Returns the file contents as a string.",
  inputSchema: z.object({
    file_path: z
      .string()
      .describe("Path to the file, relative to the workspace root"),
  }),
  run: async (args) => {
    const safe = safeJoin(WORKSPACE_DIR, args.file_path);
    if (!safe) return "Error: path traversal outside workspace is not allowed";
    try {
      return await fs.readFile(safe, "utf-8");
    } catch (err) {
      return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});

export const writeFileTool = betaZodTool({
  name: "write_file",
  description:
    "Write content to a file in the workspace directory. " +
    "Creates the file (and any missing parent directories) if it does not exist, " +
    "or overwrites it if it does.",
  inputSchema: z.object({
    file_path: z
      .string()
      .describe("Path to the file, relative to the workspace root"),
    content: z.string().describe("The content to write to the file"),
  }),
  run: async (args) => {
    const safe = safeJoin(WORKSPACE_DIR, args.file_path);
    if (!safe) return "Error: path traversal outside workspace is not allowed";
    try {
      await fs.mkdir(path.dirname(safe), { recursive: true });
      await fs.writeFile(safe, args.content, "utf-8");
      return `Successfully wrote ${args.content.length} characters to ${args.file_path}`;
    } catch (err) {
      return `Error writing file: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});

export const listFilesTool = betaZodTool({
  name: "list_files",
  description:
    "List files and directories in the workspace or a subdirectory. " +
    "Returns a formatted list of entries with type indicators.",
  inputSchema: z.object({
    directory: z
      .string()
      .optional()
      .describe(
        "Directory to list, relative to workspace root. Defaults to workspace root.",
      ),
  }),
  run: async (args) => {
    const dir = args.directory ?? ".";
    const safe = safeJoin(WORKSPACE_DIR, dir);
    if (!safe) return "Error: path traversal outside workspace is not allowed";
    try {
      await fs.mkdir(safe, { recursive: true }); // ensure workspace exists
      const entries = await fs.readdir(safe, { withFileTypes: true });
      if (entries.length === 0) return "(empty directory)";
      return entries
        .map((e) => `${e.isDirectory() ? "[dir] " : "[file]"} ${e.name}`)
        .join("\n");
    } catch (err) {
      return `Error listing directory: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});
