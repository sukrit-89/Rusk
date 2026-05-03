import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, "../..");

for (const envFile of [resolve(rootDir, ".env.local"), resolve(rootDir, ".env"), resolve(rootDir, ".env.example")]) {
  if (!existsSync(envFile)) continue;

  const content = readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key]) continue;

    if (key.startsWith("NEXT_PUBLIC_") || key === "LOCAL_API_KEY" || key === "INTERNAL_API_BASE_URL") {
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

const nextConfig: NextConfig = {
  output: "standalone"
};

export default nextConfig;
