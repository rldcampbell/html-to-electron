#!/usr/bin/env node

const { parseArgs, printHelp } = require("../src/args");
const { getPackageManagerUsageCommands } = require("../src/commands");
const { generateProject } = require("../src/generator");

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printHelp();
      return;
    }

    const result = await generateProject({
      ...options,
      cwd: process.cwd(),
      logger: console
    });

    printSummary(result, options.packageManager);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

function printSummary(result, packageManager) {
  const commandSet = getPackageManagerUsageCommands(packageManager);

  if (result.dryRun) {
    console.log("\nDry run complete. No files were written.");
    if (result.outputExists && !result.overwrite) {
      console.log("\nNote: the output directory already exists. Run without --dry-run would require --overwrite.");
    }
  } else {
    console.log("\nCreated macOS Electron app:\n");
    console.log(`  ${result.outputDir}`);
    console.log("\nSource HTML copied to:\n");
    console.log(`  ${result.indexHtmlPath}`);
  }

  console.log("\nNext steps:\n");
  console.log(`  cd ${result.outputDir}`);

  if (!result.ranInstall) {
    console.log(`  ${commandSet.install}`);
  }

  console.log(`  ${commandSet.start}`);
  console.log(`  ${commandSet.package}`);
  console.log(`  ${commandSet.make}`);

  if (result.ranPackage) {
    console.log("\nPackaged .app output:\n");
    console.log(`  ${result.packageOutputDir}`);
  }

  if (result.ranMake) {
    console.log("\nDistributable artifacts:\n");
    console.log(`  ${result.makeOutputDir}`);
  }

  if (!result.dmg) {
    console.log("\nThis project is configured for macOS ZIP output by default. Regenerate with --dmg to include DMG output.");
  }

  if (process.platform !== "darwin") {
    console.log("\nNote: macOS .app and DMG artifacts should be built on macOS.");
  }

  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
  }
}

main();
