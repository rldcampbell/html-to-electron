"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function resolveInputFile(rawPath, cwd) {
  const inputPath = path.resolve(cwd, rawPath);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  const stat = fs.statSync(inputPath);

  if (!stat.isFile()) {
    throw new Error(`Input path is not a file: ${inputPath}`);
  }

  return inputPath;
}

function resolveOutputDir(rawOutDir, cwd) {
  return path.resolve(cwd, rawOutDir);
}

function assertSafeOutputDir(outputDir, { rawOutDir, cwd }) {
  const resolved = path.resolve(outputDir);
  const home = path.resolve(os.homedir());
  const root = path.parse(resolved).root;
  const dangerous = new Set([
    root,
    home,
    path.dirname(home),
    path.resolve(cwd),
    path.resolve("/Applications"),
    path.resolve("/System"),
    path.resolve("/Library")
  ]);

  const raw = String(rawOutDir || "").trim();

  if (!raw || raw === "." || raw === ".." || raw === "~") {
    throw new Error(`Refusing unsafe output directory: ${raw || "(empty)"}`);
  }

  if (dangerous.has(resolved)) {
    throw new Error(`Refusing unsafe output directory: ${resolved}`);
  }
}

function assertSourceOutsideOutput(inputPath, outputDir) {
  const relative = path.relative(outputDir, inputPath);

  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error("Refusing to use an output directory that contains the source HTML file.");
  }

  if (!relative) {
    throw new Error("Refusing to use the source HTML file as the output directory.");
  }
}

function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

function isDirectory(targetPath) {
  return fs.statSync(targetPath).isDirectory();
}

function removeDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content) {
  ensureDirectory(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content);
}

function copyFile(sourcePath, targetPath) {
  ensureDirectory(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function copyIcon(iconPath, resourcesDir) {
  const extension = path.extname(iconPath).toLowerCase();
  const targetName = extension === ".icns" ? "icon.icns" : `icon${extension || ".asset"}`;
  const targetPath = path.join(resourcesDir, targetName);

  copyFile(iconPath, targetPath);

  return {
    sourcePath: iconPath,
    targetPath,
    packagerIconPath: extension === ".icns" ? "./resources/icon" : "",
    isIcns: extension === ".icns"
  };
}

function readTemplate(templatePath) {
  return fs.readFileSync(templatePath, "utf8");
}

function applyTemplate(template, replacements) {
  let output = template;

  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(String(value));
  }

  return output;
}

module.exports = {
  resolveInputFile,
  resolveOutputDir,
  assertSafeOutputDir,
  assertSourceOutsideOutput,
  pathExists,
  isDirectory,
  removeDirectory,
  ensureDirectory,
  writeFile,
  copyFile,
  copyIcon,
  readTemplate,
  applyTemplate
};
