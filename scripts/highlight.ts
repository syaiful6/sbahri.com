#!/usr/bin/env bun

import { codeToHtml } from "shiki";
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = "public";

const THEME = "github-dark";
const LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "bash",
  "json",
  "yaml",
  "toml",
  "markdown",
  "html",
  "css",
  "scss",
];

async function highlightFile(filePath: string): Promise<void> {
  const content = readFileSync(filePath, "utf-8");

  const codeBlockRegex = /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;

  let modified = false;
  let newContent = content;

  const matches = Array.from(content.matchAll(codeBlockRegex));

  for (const match of matches) {
    const [fullMatch, lang, code] = match;

    if (!lang || !LANGUAGES.includes(lang)) {
      continue;
    }

    // Decode HTML entities
    const decodedCode = code
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    try {
      // Generate highlighted HTML
      const highlighted = await codeToHtml(decodedCode, {
        lang,
        theme: THEME,
      });

      newContent = newContent.replace(fullMatch, highlighted);
      modified = true;
    } catch (error) {
      console.error(`Error highlighting ${lang} in ${filePath}:`, error);
    }
  }

  if (modified) {
    writeFileSync(filePath, newContent);
    console.log(`  ✓ Highlighted code blocks in ${filePath}`);
  }
}

async function walkDir(dir: string): Promise<void> {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      await walkDir(filePath);
    } else if (file.endsWith(".html")) {
      await highlightFile(filePath);
    }
  }
}

async function main() {
  console.log("Highlighting code blocks with Shiki...");
  console.log(`Theme: ${THEME}`);
  console.log(`Languages: ${LANGUAGES.join(", ")}`);

  try {
    await walkDir(PUBLIC_DIR);
    console.log("✓ Code highlighting complete!");
  } catch (error) {
    console.error("Error during highlighting:", error);
    process.exit(1);
  }
}

main();
