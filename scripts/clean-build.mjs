import { rm } from 'node:fs/promises';

// Resolve relative to this script, never to an arbitrary caller's directory.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
