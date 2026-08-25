import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const environmentPath = resolve(".env.local");
const content = await readFile(environmentPath, "utf8");
const match = content.match(/^BETTER_AUTH_SECRET=(.*)$/m);
const currentValue = match?.[1]?.trim() ?? "";

if (currentValue.length >= 32) {
  console.log("BETTER_AUTH_SECRET_OK");
  process.exit(0);
}

const secret = randomBytes(48).toString("base64url");
const updated = match
  ? content.replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${secret}`)
  : `${content.replace(/\s*$/, "")}\nBETTER_AUTH_SECRET=${secret}\n`;

await writeFile(environmentPath, updated, { encoding: "utf8", mode: 0o600 });
console.log("BETTER_AUTH_SECRET_GENERATED");
