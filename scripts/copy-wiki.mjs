import { cpSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "..", "Nexus", "wiki");
const dest = join(__dirname, "..", "content", "wiki");

if (!existsSync(src)) {
  console.log("Nexus wiki not found at", src, "— skipping copy");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Copied wiki →", dest);
