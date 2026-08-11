#!/usr/bin/env bun

import { watch } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';

import { PUBLIC_DIR, createSiteHighlighter, highlightFile, type themes } from './highlight.ts';

if (import.meta.main) {
  watchHighlight();
}

// Watches public/**/*.html and re-runs shiki highlighting whenever Hugo (re)writes a page.
// Highlighting is idempotent and only writes back when content actually changes, so this
// doesn't loop against its own writes.
export async function watchHighlight() {
  const { highlighter, ...themes } = await createSiteHighlighter();

  await highlightAll(highlighter, themes);

  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const DEBOUNCE_MS = 75;

  watch(PUBLIC_DIR, { recursive: true }, (_event, filename) => {
    if (!filename || !filename.endsWith('.html')) return;
    const filepath = join(PUBLIC_DIR, filename);

    clearTimeout(pending.get(filepath));
    pending.set(filepath, setTimeout(async () => {
      pending.delete(filepath);
      try {
        const changed = await highlightFile(highlighter, filepath, themes);
        if (changed) console.log(`[watch-highlight] highlighted ${filename}`);
      } catch (err) {
        // File may have been removed, or Hugo may still be mid-write; next change event will retry.
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`[watch-highlight] failed on ${filename}:`, err);
        }
      }
    }, DEBOUNCE_MS));
  });

  console.log(`[watch-highlight] watching ${PUBLIC_DIR} for changes`);
}

async function highlightAll(highlighter: Awaited<ReturnType<typeof createSiteHighlighter>>['highlighter'], themes: themes) {
  const files = await glob(join(PUBLIC_DIR, '**/*.html'));
  await Promise.all(files.map((filepath) => highlightFile(highlighter, filepath, themes)));
}
