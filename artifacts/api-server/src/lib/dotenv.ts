import fs from "node:fs";
import path from "node:path";

export function config(): { parsed?: Record<string, string> } {
  const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../.env.local"),
    path.resolve(import.meta.dirname, "../../.env"),
    path.resolve(import.meta.dirname, "../../.env.local"),
    path.resolve(import.meta.dirname, "../../../../.env"),
    path.resolve(import.meta.dirname, "../../../../.env.local"),
  ];

  const parsed: Record<string, string> = {};

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      loadManual(envPath, parsed);
    }
  }

  return { parsed };
}

function loadManual(filePath: string, parsed: Record<string, string>) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["'](.*)["']$/, "$1");
        parsed[key] = value;
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

export const dotenv = { config };
export default dotenv;
