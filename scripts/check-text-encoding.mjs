import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "components", "lib", "tests"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md"]);
const excludedDirectories = new Set([".git", ".next", "node_modules", "playwright-report", "test-results"]);
const damagedSequences = ["Ã", "Â", "â€", "â€™", "â€œ", "â€”", "�"];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || excludedDirectories.has(entry.name)) continue;
    const currentPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(currentPath));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(currentPath);
    }
  }

  return files;
}

const findings = [];

for (const root of roots) {
  for (const file of await collectFiles(root)) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      const sequence = damagedSequences.find((candidate) => line.includes(candidate));
      if (sequence) findings.push(`${file}:${index + 1} contiene "${sequence}"`);
    });
  }
}

if (findings.length > 0) {
  console.error("Se detectaron caracteres probablemente dañados por una conversión de codificación:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Codificación validada: no se detectaron secuencias dañadas.");
