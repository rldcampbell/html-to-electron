"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { getPackageManagerUsageCommands, runProjectCommand } = require("./commands");
const {
  applyTemplate,
  assertSafeOutputDir,
  assertSourceOutsideOutput,
  copyFile,
  copyIcon,
  ensureDirectory,
  isDirectory,
  pathExists,
  readTemplate,
  removeDirectory,
  resolveInputFile,
  resolveOutputDir,
  writeFile
} = require("./filesystem");
const { deriveNames, readHtmlTitle } = require("./names");

const ELECTRON_VERSION = "42.0.0";
const ELECTRON_FORGE_VERSION = "7.11.1";

async function generateProject(config) {
  const cwd = config.cwd || process.cwd();
  const logger = config.logger || console;
  const warnings = [];
  const inputPath = resolveInputFile(config.htmlFile, cwd);
  const htmlExtension = path.extname(inputPath).toLowerCase();

  if (![".html", ".htm"].includes(htmlExtension)) {
    warnings.push(`Input file extension is ${htmlExtension || "(none)"}, not .html or .htm.`);
  }

  const html = fs.readFileSync(inputPath, "utf8");
  const htmlTitle = readHtmlTitle(html);
  const names = deriveNames({
    inputPath,
    htmlTitle,
    name: config.name,
    productName: config.productName,
    bundleId: config.bundleId
  });
  const rawOutDir = config.out || path.join("generated", names.slug);
  const outputDir = resolveOutputDir(rawOutDir, cwd);

  assertSafeOutputDir(outputDir, { rawOutDir, cwd });
  assertSourceOutsideOutput(inputPath, outputDir);

  const outputExists = pathExists(outputDir);

  if (outputExists && !isDirectory(outputDir)) {
    throw new Error(`Output path already exists and is not a directory: ${outputDir}`);
  }

  if (outputExists && !config.overwrite && !config.dryRun) {
    throw new Error(`Output directory already exists: ${outputDir}. Use --overwrite to replace it.`);
  }

  let iconResult = null;
  let iconPath = "";

  if (config.icon) {
    iconPath = path.resolve(cwd, config.icon);

    if (!pathExists(iconPath)) {
      throw new Error(`Icon file does not exist: ${iconPath}`);
    }

    if (!fs.statSync(iconPath).isFile()) {
      throw new Error(`Icon path is not a file: ${iconPath}`);
    }
  }

  const description = config.description || `Mac app wrapper for ${names.productName}.`;
  const packageManager = config.packageManager || "yarn";
  const usageCommands = getPackageManagerUsageCommands(packageManager);
  const replacements = {
    __PACKAGE_NAME__: names.packageName,
    __PRODUCT_NAME__: names.productName,
    __VERSION__: config.version || "1.0.0",
    __DESCRIPTION__: description,
    __AUTHOR__: config.author || "",
    __BUNDLE_ID__: names.bundleId,
    __WINDOW_WIDTH__: config.width || 1200,
    __WINDOW_HEIGHT__: config.height || 900,
    __WINDOW_MIN_WIDTH__: config.minWidth || 420,
    __WINDOW_MIN_HEIGHT__: config.minHeight || 640,
    __EXECUTABLE_NAME__: names.executableName,
    __ELECTRON_VERSION__: ELECTRON_VERSION,
    __ELECTRON_FORGE_VERSION__: ELECTRON_FORGE_VERSION,
    __OPTIONAL_MAKER_DEPENDENCIES__: createMakerDependencyLines({
      zip: config.zip !== false,
      dmg: Boolean(config.dmg)
    }),
    __INSTALL_COMMAND__: usageCommands.install,
    __START_COMMAND__: usageCommands.start,
    __PACKAGE_COMMAND__: usageCommands.package,
    __MAKE_COMMAND__: usageCommands.make
  };
  const projectFiles = getProjectFilePlan(outputDir);
  const plannedCommands = getPlannedCommands(config);
  const result = {
    dryRun: Boolean(config.dryRun),
    overwrite: Boolean(config.overwrite),
    outputExists,
    inputPath,
    outputDir,
    indexHtmlPath: projectFiles.indexHtml,
    packageOutputDir: path.join(outputDir, "out"),
    makeOutputDir: path.join(outputDir, "out", "make"),
    dmg: Boolean(config.dmg),
    warnings,
    names,
    plannedCommands,
    ranInstall: false,
    ranPackage: false,
    ranMake: false
  };

  if (config.dryRun) {
    printDryRunPlan(logger, {
      inputPath,
      outputDir,
      outputExists,
      names,
      projectFiles,
      iconPath,
      config,
      plannedCommands,
      warnings
    });

    return result;
  }

  if (outputExists && config.overwrite) {
    removeDirectory(outputDir);
  }

  ensureDirectory(path.join(outputDir, "app"));
  copyFile(inputPath, projectFiles.indexHtml);

  if (iconPath) {
    iconResult = copyIcon(iconPath, path.join(outputDir, "resources"));

    if (!iconResult.isIcns) {
      warnings.push("Icon was copied, but macOS packaging usually requires an .icns icon.");
    }
  }

  writeTemplatedProjectFiles(outputDir, {
    ...replacements,
    __FORGE_CONFIG__: createForgeConfig({
      bundleId: names.bundleId,
      executableName: names.executableName,
      zip: config.zip !== false,
      dmg: Boolean(config.dmg),
      iconPath: iconResult ? iconResult.packagerIconPath : ""
    })
  });

  if (shouldInstall(config)) {
    await runProjectCommand(packageManager, "install", outputDir);
    result.ranInstall = true;
  }

  if (config.package) {
    await runProjectCommand(packageManager, "package", outputDir);
    result.ranPackage = true;
  }

  if (config.make) {
    await runProjectCommand(packageManager, "make", outputDir);
    result.ranMake = true;
  }

  return result;
}

function shouldInstall(config) {
  return Boolean(config.install || config.package || config.make);
}

function getPlannedCommands(config) {
  const commands = [];

  if (shouldInstall(config)) {
    commands.push("install");
  }

  if (config.package) {
    commands.push("package");
  }

  if (config.make) {
    commands.push("make");
  }

  return commands;
}

function getProjectFilePlan(outputDir) {
  return {
    packageJson: path.join(outputDir, "package.json"),
    forgeConfig: path.join(outputDir, "forge.config.js"),
    mainJs: path.join(outputDir, "main.js"),
    readme: path.join(outputDir, "README.md"),
    gitignore: path.join(outputDir, ".gitignore"),
    indexHtml: path.join(outputDir, "app", "index.html")
  };
}

function writeTemplatedProjectFiles(outputDir, replacements) {
  const templateDir = path.join(__dirname, "..", "templates", "electron-app");
  const files = [
    ["main.js.template", "main.js"],
    ["README.md.template", "README.md"],
    ["gitignore.template", ".gitignore"]
  ];

  const packageTemplate = readTemplate(path.join(templateDir, "package.json.template"));
  writeFile(
    path.join(outputDir, "package.json"),
    applyTemplate(packageTemplate, createJsonTemplateReplacements(replacements))
  );

  for (const [templateName, targetName] of files) {
    const template = readTemplate(path.join(templateDir, templateName));
    writeFile(path.join(outputDir, targetName), applyTemplate(template, replacements));
  }

  const forgeTemplate = readTemplate(path.join(templateDir, "forge.config.js.template"));
  writeFile(path.join(outputDir, "forge.config.js"), applyTemplate(forgeTemplate, replacements));
}

function createJsonTemplateReplacements(replacements) {
  const jsonReplacements = { ...replacements };

  for (const token of [
    "__PACKAGE_NAME__",
    "__PRODUCT_NAME__",
    "__VERSION__",
    "__DESCRIPTION__",
    "__AUTHOR__",
    "__ELECTRON_VERSION__",
    "__ELECTRON_FORGE_VERSION__"
  ]) {
    jsonReplacements[token] = escapeJsonString(replacements[token]);
  }

  return jsonReplacements;
}

function createMakerDependencyLines({ zip, dmg }) {
  const dependencies = [];

  if (dmg) {
    dependencies.push(`    "@electron-forge/maker-dmg": "${ELECTRON_FORGE_VERSION}",`);
  }

  if (zip) {
    dependencies.push(`    "@electron-forge/maker-zip": "${ELECTRON_FORGE_VERSION}",`);
  }

  if (dependencies.length === 0) {
    return "";
  }

  return `${dependencies.join("\n")}\n`;
}

function escapeJsonString(value) {
  return JSON.stringify(String(value)).slice(1, -1);
}

function createForgeConfig({ bundleId, executableName, zip, dmg, iconPath }) {
  const packagerConfig = {
    asar: true,
    appBundleId: bundleId,
    executableName
  };

  if (iconPath) {
    packagerConfig.icon = iconPath;
  }

  const makers = [];

  if (zip) {
    makers.push({
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"]
    });
  }

  if (dmg) {
    makers.push({
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        format: "ULFO"
      }
    });
  }

  return `module.exports = ${formatJsObject({
    packagerConfig,
    rebuildConfig: {},
    makers
  })};
`;
}

function formatJsObject(value, indent = 0) {
  const space = "  ".repeat(indent);
  const nextSpace = "  ".repeat(indent + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `[\n${value.map((item) => `${nextSpace}${formatJsObject(item, indent + 1)}`).join(",\n")}\n${space}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return "{}";
    }

    return `{\n${entries
      .map(([key, item]) => `${nextSpace}${formatObjectKey(key)}: ${formatJsObject(item, indent + 1)}`)
      .join(",\n")}\n${space}}`;
  }

  return JSON.stringify(value);
}

function formatObjectKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function printDryRunPlan(logger, plan) {
  logger.log("Dry run: macOS Electron app scaffold would be generated.");
  logger.log("");
  logger.log(`Source HTML: ${plan.inputPath}`);
  logger.log(`Output directory: ${plan.outputDir}`);
  logger.log(`Package name: ${plan.names.packageName}`);
  logger.log(`Product name: ${plan.names.productName}`);
  logger.log(`Bundle ID: ${plan.names.bundleId}`);
  logger.log(`Executable name: ${plan.names.executableName}`);
  logger.log(`Window: ${plan.config.width || 1200}x${plan.config.height || 900}`);
  logger.log(`Minimum window: ${plan.config.minWidth || 420}x${plan.config.minHeight || 640}`);
  logger.log(`ZIP maker: ${plan.config.zip !== false ? "enabled" : "disabled"}`);
  logger.log(`DMG maker: ${plan.config.dmg ? "enabled" : "disabled"}`);

  if (plan.outputExists && !plan.config.overwrite) {
    logger.log("Output exists: yes; generation would require --overwrite.");
  } else {
    logger.log(`Output exists: ${plan.outputExists ? "yes; would be replaced" : "no"}`);
  }

  if (plan.iconPath) {
    logger.log(`Icon: ${plan.iconPath}`);
  }

  logger.log("");
  logger.log("Files:");

  for (const filePath of Object.values(plan.projectFiles)) {
    logger.log(`  ${filePath}`);
  }

  if (plan.plannedCommands.length > 0) {
    logger.log("");
    logger.log(`Commands: ${plan.plannedCommands.join(", ")}`);
  }

  if (plan.warnings.length > 0) {
    logger.log("");
    logger.log("Warnings:");
    for (const warning of plan.warnings) {
      logger.log(`  - ${warning}`);
    }
  }
}

module.exports = {
  generateProject,
  createForgeConfig
};
