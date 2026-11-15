import path from 'node:path';
import type { NextConfig } from 'next';

// Next.js is used as a frontend only (docs/02-folder-structure.md): pages are
// client-rendered and no server actions or route handlers serve data.

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  transpilePackages: ['@ddr/schemas', '@ddr/calc'],
};

export default config;
