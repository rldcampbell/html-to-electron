"use strict";

const DEFAULTS = {
  packageManager: "yarn",
  width: 1200,
  height: 900,
  minWidth: 420,
  minHeight: 640,
  version: "1.0.0",
  author: "",
  zip: true,
  dmg: false,
  overwrite: false,
  install: false,
  package: false,
  make: false,
  dryRun: false
};

const VALUE_OPTIONS = new Set([
  "name",
  "product-name",
  "bundle-id",
  "out",
  "package-manager",
  "width",
  "height",
  "min-width",
  "min-height",
  "icon",
  "version",
  "author",
  "description"
]);

const BOOLEAN_OPTIONS = new Set([
  "overwrite",
  "install",
  "package",
  "make",
  "dmg",
  "zip",
  "no-zip",
  "dry-run",
  "help"
]);

function parseArgs(argv) {
  const parsed = { ...DEFAULTS };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const option = arg.slice(2);

    if (BOOLEAN_OPTIONS.has(option)) {
      applyBooleanOption(parsed, option);
      continue;
    }

    if (VALUE_OPTIONS.has(option)) {
      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --${option}.`);
      }

      applyValueOption(parsed, option, value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: --${option}. Use --help to see supported options.`);
  }

  if (positionals.length > 1) {
    throw new Error(`Expected one HTML file, received ${positionals.length}.`);
  }

  parsed.htmlFile = positionals[0] || "";

  if (parsed.help) {
    return parsed;
  }

  if (!parsed.htmlFile) {
    throw new Error("Missing required <html-file>. Use --help to see usage.");
  }

  if (!["npm", "yarn", "pnpm"].includes(parsed.packageManager)) {
    throw new Error("--package-manager must be one of: npm, yarn, pnpm.");
  }

  for (const key of ["width", "height", "minWidth", "minHeight"]) {
    if (!Number.isInteger(parsed[key]) || parsed[key] <= 0) {
      throw new Error(`--${toKebabCase(key)} must be a positive number.`);
    }
  }

  return parsed;
}

function applyBooleanOption(parsed, option) {
  if (option === "no-zip") {
    parsed.zip = false;
    return;
  }

  parsed[toCamelCase(option)] = true;
}

function applyValueOption(parsed, option, value) {
  const key = toCamelCase(option);

  if (["width", "height", "minWidth", "minHeight"].includes(key)) {
    const number = Number(value);

    if (!Number.isInteger(number)) {
      throw new Error(`--${option} must be a positive integer.`);
    }

    parsed[key] = number;
    return;
  }

  parsed[key] = value;
}

function printHelp() {
  console.log(`Single-HTML To macOS Electron App Creator

Usage:
  yarn create-app <html-file> [options]
  node bin/html-to-mac-app.js <html-file> [options]

Required:
  <html-file>                 Path to the source single-page HTML file.

Common:
  --name <name>               Machine/package name or human-readable app name.
  --product-name <name>       Display name for the macOS app.
  --bundle-id <id>            Bundle identifier, e.g. com.example.myapp.
  --out <dir>                 Output directory. Default: ./generated/<slug>.
  --overwrite                 Replace the output directory if it exists.
  --install                   Run package manager install in the generated app.
  --package                   Run Electron Forge package after installing.
  --make                      Run Electron Forge make after installing.
  --package-manager <pm>      npm, yarn, or pnpm. Default: yarn.

macOS packaging:
  --zip                       Include ZIP maker. Default: true.
  --no-zip                    Omit ZIP maker.
  --dmg                       Include DMG maker.

Window:
  --width <number>            Initial window width. Default: 1200.
  --height <number>           Initial window height. Default: 900.
  --min-width <number>        Minimum window width. Default: 420.
  --min-height <number>       Minimum window height. Default: 640.

Assets:
  --icon <path>               Optional app icon. Prefer .icns for macOS.

Metadata:
  --version <semver>          App version. Default: 1.0.0.
  --author <name>             package.json author.
  --description <text>        package.json description.

Output helpers:
  --dry-run                   Print the generation plan without writing files.
  --help                      Print this usage.
`);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

module.exports = {
  parseArgs,
  printHelp
};
