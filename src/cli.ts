#!/usr/bin/env node

import { generateAEOFiles } from './core/generate-wrapper';
import { resolveConfig } from './core/utils';
import { detectFramework } from './core/detect';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const VERSION = '0.0.2';

const HELP = `
aeo.js v${VERSION} — Answer Engine Optimization for the modern web

Usage:
  npx aeo.js <command> [options]

Commands:
  generate    Generate all AEO files (robots.txt, llms.txt, sitemap.xml, etc.)
  init        Create an aeo.config.ts configuration file
  check       Validate your AEO setup and show what would be generated

Options:
  --out <dir>       Output directory (default: auto-detected)
  --url <url>       Site URL (default: https://example.com)
  --title <title>   Site title (default: My Site)
  --no-widget       Disable widget generation
  --help, -h        Show this help message
  --version, -v     Show version

Examples:
  npx aeo.js generate
  npx aeo.js generate --url https://mysite.com --title "My Site"
  npx aeo.js init
  npx aeo.js check
`;

function parseArgs(args: string[]): { command: string; flags: Record<string, string | boolean> } {
  let command = 'help';
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--version' || arg === '-v') {
      flags.version = true;
    } else if (arg === '--no-widget') {
      flags.noWidget = true;
    } else if (arg.startsWith('--') && i + 1 < args.length) {
      const key = arg.slice(2);
      flags[key] = args[++i];
    } else if (!arg.startsWith('-') && command === 'help') {
      command = arg;
    }
  }

  return { command, flags };
}

async function cmdGenerate(flags: Record<string, string | boolean>): Promise<void> {
  const framework = detectFramework();
  console.log(`[aeo.js] Detected framework: ${framework.framework}`);

  const config = resolveConfig({
    title: typeof flags.title === 'string' ? flags.title : undefined,
    url: typeof flags.url === 'string' ? flags.url : undefined,
    outDir: typeof flags.out === 'string' ? flags.out : undefined,
    widget: flags.noWidget ? { enabled: false } : undefined,
  });

  console.log(`[aeo.js] Output directory: ${config.outDir}`);
  console.log(`[aeo.js] Generating AEO files...`);

  const result = await generateAEOFiles(config);

  if (result.files.length > 0) {
    console.log(`[aeo.js] Generated ${result.files.length} files:`);
    for (const file of result.files) {
      console.log(`  - ${file}`);
    }
  } else {
    console.log('[aeo.js] No files generated.');
  }

  if (result.errors.length > 0) {
    console.error(`[aeo.js] ${result.errors.length} error(s):`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
}

function cmdInit(): void {
  const configPath = join(process.cwd(), 'aeo.config.ts');

  if (existsSync(configPath)) {
    console.error('[aeo.js] aeo.config.ts already exists. Remove it first to reinitialize.');
    process.exit(1);
  }

  const template = `import { defineConfig } from 'aeo.js';

export default defineConfig({
  // Required
  title: 'My Site',
  url: 'https://example.com',

  // Optional
  description: 'A site optimized for AI discovery',

  // Toggle individual generators
  generators: {
    robotsTxt: true,
    llmsTxt: true,
    llmsFullTxt: true,
    rawMarkdown: true,
    manifest: true,
    sitemap: true,
    aiIndex: true,
  },

  // Customize robots.txt
  robots: {
    allow: ['/'],
    disallow: ['/admin'],
    crawlDelay: 0,
  },

  // Widget configuration
  widget: {
    enabled: true,
    position: 'bottom-right',
    humanLabel: 'Human',
    aiLabel: 'AI',
    showBadge: true,
    theme: {
      background: 'rgba(18, 18, 24, 0.9)',
      text: '#C0C0C5',
      accent: '#E8E8EA',
      badge: '#4ADE80',
    },
  },
});
`;

  writeFileSync(configPath, template, 'utf-8');
  console.log('[aeo.js] Created aeo.config.ts');
  console.log('[aeo.js] Edit the config and run `npx aeo.js generate` to generate AEO files.');
}

function cmdCheck(): void {
  const framework = detectFramework();
  const config = resolveConfig();

  console.log(`[aeo.js] AEO Configuration Check`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`  Framework:    ${framework.framework}`);
  console.log(`  Content dir:  ${config.contentDir}`);
  console.log(`  Output dir:   ${config.outDir}`);
  console.log(`  Title:        ${config.title}`);
  console.log(`  URL:          ${config.url}`);
  console.log(`  Widget:       ${config.widget.enabled ? 'enabled' : 'disabled'}`);
  console.log();
  console.log(`  Generators:`);

  const generators = [
    ['robots.txt', config.generators.robotsTxt],
    ['llms.txt', config.generators.llmsTxt],
    ['llms-full.txt', config.generators.llmsFullTxt],
    ['raw markdown', config.generators.rawMarkdown],
    ['docs.json', config.generators.manifest],
    ['sitemap.xml', config.generators.sitemap],
    ['ai-index.json', config.generators.aiIndex],
  ] as const;

  for (const [name, enabled] of generators) {
    console.log(`    ${enabled ? '+' : '-'} ${name}`);
  }

  // Check for config file
  const configPath = join(process.cwd(), 'aeo.config.ts');
  const configPathJs = join(process.cwd(), 'aeo.config.js');
  const hasConfig = existsSync(configPath) || existsSync(configPathJs);

  console.log();
  if (hasConfig) {
    console.log(`  Config file: found`);
  } else {
    console.log(`  Config file: not found (using defaults)`);
    console.log(`  Run \`npx aeo.js init\` to create one.`);
  }

  if (config.url === 'https://example.com') {
    console.log();
    console.log(`  Warning: Using default URL (https://example.com).`);
    console.log(`  Set your actual URL in the config or pass --url.`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, flags } = parseArgs(args);

  if (flags.version) {
    console.log(VERSION);
    return;
  }

  if (flags.help || command === 'help') {
    console.log(HELP);
    return;
  }

  switch (command) {
    case 'generate':
      await cmdGenerate(flags);
      break;
    case 'init':
      cmdInit();
      break;
    case 'check':
      cmdCheck();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('[aeo.js] Fatal error:', error.message);
  process.exit(1);
});
