#!/usr/bin/env bun

import { compile } from "sass";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const inputFile = "themes/sbahri/assets/scss/main.scss";
const outputDir = "themes/sbahri/assets/css";
const outputFile = join(outputDir, "main.css");

console.log("Building CSS...");

try {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const result = compile(inputFile, {
    style: "compressed",
    sourceMap: false,
  });

  writeFileSync(outputFile, result.css);

  console.log(`✓ CSS built successfully: ${outputFile}`);
} catch (error) {
  console.error("Error building CSS:", error);
  process.exit(1);
}
