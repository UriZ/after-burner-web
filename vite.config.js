import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    // R37: the dev server was watching ~74k files — 62k accumulated capture
    // frames in tools/out/, 9k judge evidence PNGs in judging/, and the
    // 731 MB video cache. Chokidar's initial scan + stat churn made EVERY
    // module transform take 20-40 s (measured: @vite/client 95 s, load event
    // 88-139 s headless), which broke every probe's 30 s nav timeout and was
    // most of the owner's "takes too long to start playing". None of these
    // dirs are ever imported by the app — only src/ + index.html matter.
    watch: {
      ignored: [
        '**/tools/out/**',
        '**/judging/**',
        '**/.reference-cache/**',
        '**/scratch_*/**',
        '**/reference/**',
      ],
    },
  },
});
