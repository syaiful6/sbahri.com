#!/usr/bin/env bun

import { createHighlighter, type Highlighter, type LanguageRegistration } from 'shiki';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

import { glob } from 'glob';

import { parseDocument } from 'htmlparser2';
import { findAll, findOne, textContent, replaceElement } from 'domutils';
import render from 'dom-serializer';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const PUBLIC_DIR = join(__dirname, '../public');

export type themes = {
  lightTheme: string;
  darkTheme: string;
}

if (import.meta.main) {
  main();
}

async function main() {
  const start = Date.now();

  const { highlighter, ...themes } = await createSiteHighlighter();

  const files = await glob(join(PUBLIC_DIR, '**/*.html'));
  await Promise.all(
    files.map((filepath) => highlightFile(highlighter, filepath, themes))
  );

  console.log(`Highlighted ${files.length} files in ${Math.round(Date.now() - start)} ms`);
}

export async function createSiteHighlighter(): Promise<{ highlighter: Highlighter } & themes> {
  // You need some custom CSS to integrate light and dark themes with your website.
  // See https://shiki.style/guide/dual-themes.
  const lightTheme = 'github-light';
  const darkTheme = 'github-dark';

  const customLanguages = await Promise.all([
    loadLanguage('dune', 'syntaxes/dune.json'),
    loadLanguage("ocaml", 'syntaxes/ocaml.json'),
    loadLanguage('reason', 'syntaxes/reason.json'),
  ])

  const highlighter = await createHighlighter({
    themes: [lightTheme, darkTheme],
    langs: [
      "javascript",
      "typescript",
      "jsx",
      "tsx",
      "json",
      "bash",
      "shell",
      "nix",
      "markdown",
      "css",
      "html",
      "yaml",
      "toml",
      "diff",
      "lisp",
      ...customLanguages
    ],
  });

  return { highlighter, lightTheme, darkTheme };
}

async function loadLanguage(name: string, relativePath: string): Promise<LanguageRegistration> {
  const lang = await readJson(relativePath) as Record<string, unknown>
  return {
    ...lang,
    name,
  } as LanguageRegistration
}

async function readJson(relativePath: string): Promise<unknown> {
  const content = await readFile(join(__dirname, relativePath), { encoding: 'utf-8' })
  return JSON.parse(content)
}

// Returns true if the file's contents changed (i.e. it needed highlighting).
export async function highlightFile(highlighter: Highlighter, filepath: string, { lightTheme, darkTheme }: themes): Promise<boolean> {
  const contents = await readFile(filepath, { encoding: 'utf-8' });
  const highlighted = highlightHtmlContent(highlighter, contents, { lightTheme, darkTheme });
  if (highlighted === contents) return false;
  await writeFile(filepath, highlighted);
  return true;
}

export function highlightHtmlContent(highlighter: Highlighter, htmlContent: string, { lightTheme, darkTheme }: themes) {
  const doc = parseDocument(htmlContent);
  for (const preNode of findAll((e) => e.name === 'pre', doc.children)) {
    // Already processed by shiki (e.g. re-run against output that's already highlighted) — skip.
    if (preNode.attribs['class']?.split(/\s+/).includes('shiki')) continue;

    const codeNode = findOne((e) => e.name === 'code', preNode.children);
    if (!codeNode) continue;

    const lang = codeNode.attribs['class']?.replace(/^language-/, '') ?? 'text';
    const code = textContent(codeNode);
    const highlighted = highlighter.codeToHtml(code, {
      lang,
      themes: { light: lightTheme, dark: darkTheme },
    });

    const highlightedPreNode = parseDocument(highlighted).children[0];
    replaceElement(preNode, highlightedPreNode);
  }

  return render(doc);
}

