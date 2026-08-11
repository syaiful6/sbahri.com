#!/usr/bin/env bun

// Runs `hugo server` alongside the shiki watcher, so code blocks in dev mode show the same
// highlighting as production instead of Hugo's disabled/plain output (codeFences = false).
// Hugo's server writes pages to public/ by default; watch-highlight.ts re-highlights them
// as they change.

import { watchHighlight } from './watch-highlight.ts';

const hugo = Bun.spawn(['hugo', 'server', '-D', ...process.argv.slice(2)], {
  stdio: ['inherit', 'inherit', 'inherit'],
});

function shutdown() {
  hugo.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await watchHighlight();

const exitCode = await hugo.exited;
process.exit(exitCode);
