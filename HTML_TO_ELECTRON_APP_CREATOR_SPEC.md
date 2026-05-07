# Spec: Single-HTML To macOS Electron App Creator

## Goal

Create the simplest reliable path from a single self-contained `.html` app to a standalone macOS desktop app.

Version 1 should be a Node.js command-line tool that takes one HTML file, scaffolds a complete Electron project around it, and can run/package it as a macOS app.

Primary v1 success command:

```bash
npm run create-app -- ./path/to/my-app.html --name "My App" --out ./generated/my-app --install
```

Then from the generated app:

```bash
npm start
npm run package
npm run make
```

Expected macOS outputs:

- A runnable `.app` bundle from `npm run package`.
- A distributable `.zip` from `npm run make`.
- Optionally, a `.dmg` from `npm run make` when the DMG maker is enabled.

## Product Direction

Build this in two deliberate phases.

### V1: CLI Generator

The first deliverable is a CLI generator.

It should:

- Accept a single `.html` file.
- Generate an Electron app project.
- Copy the HTML to `app/index.html`.
- Load it in a native macOS desktop window using Electron.
- Support `npm start`, `npm run package`, and `npm run make`.
- Prefer macOS output by default.

### V2: Creator App GUI

After V1 works, the same generator core can power an Electron GUI app.

The GUI app would let a user:

- Pick an HTML file.
- Enter app name, bundle ID, window size, icon, and output folder.
- Click a button to generate the Electron project.
- Optionally run install/package/make from the interface.
- Show progress logs and final artifact paths.

Do not build the GUI in V1, but structure the V1 code so this is easy later.

## Why Electron

Electron is acceptable for this goal because:

- It is the quickest route from a browser-based single-page app to a standalone Mac app.
- It supports local HTML loading via `BrowserWindow.loadFile`.
- It works well with browser APIs such as `localStorage`, Canvas, downloads, and DOM UI.
- Electron Forge can package macOS `.app`, `.zip`, and `.dmg` artifacts.

Tradeoff:

- Electron bundles Chromium, so the app is much larger than a native Swift/WebKit wrapper.

For this project, simplicity and reliability matter more than minimal bundle size.

Relevant docs:

- Electron `BrowserWindow.loadFile`: https://www.electronjs.org/docs/api/browser-window
- Electron packaging overview: https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
- Electron Forge: https://www.electronforge.io/
- Electron Forge ZIP maker: https://www.electronforge.io/config/makers/zip
- Electron Forge DMG maker: https://www.electronforge.io/config/makers/dmg
- Electron Forge macOS signing guide: https://www.electronforge.io/guides/code-signing/code-signing-macos

## Project Name

Suggested repository name:

```text
html-to-mac-app
```

Suggested package name:

```text
html-to-mac-app
```

## Build Target

Create a Node.js CLI project that can scaffold macOS-focused Electron apps from single HTML files.

The creator project should contain:

```text
html-to-mac-app/
  package.json
  README.md
  bin/
    html-to-mac-app.js
  src/
    generator.js
    names.js
    args.js
    filesystem.js
    commands.js
  templates/
    electron-app/
      package.json.template
      main.js.template
      forge.config.js.template
      README.md.template
      gitignore.template
      app/
        .gitkeep
  examples/
    sample.html
```

Reason for `src/` modules:

- The CLI should be thin.
- The generator logic should be reusable by a future Electron GUI creator app.

The generated Electron app should look like:

```text
generated/my-app/
  package.json
  forge.config.js
  main.js
  README.md
  .gitignore
  app/
    index.html
```

Optional generated files:

```text
generated/my-app/
  resources/
    icon.icns
    icon.png
```

## CLI Command

The primary command should be:

```bash
npm run create-app -- <html-file> [options]
```

Also expose the executable directly:

```bash
node bin/html-to-mac-app.js <html-file> [options]
```

Example:

```bash
npm run create-app -- ../connections-creator/index.html \
  --name "Puzzle Set Creator" \
  --product-name "Puzzle Set Creator" \
  --bundle-id "com.local.puzzlesetcreator" \
  --out ./generated/puzzle-set-creator \
  --install
```

## CLI Options

Implement these options:

```text
Required:
  <html-file>
    Path to the source single-page HTML file.

Common:
  --name <name>
    Machine/package name or human-readable app name.
    If omitted, derive from the HTML filename.

  --product-name <name>
    Display name for the macOS app.
    If omitted, derive from <title> in the HTML file, then --name, then filename.

  --bundle-id <id>
    macOS bundle identifier, e.g. com.example.myapp.
    If omitted, use com.local.<slug-without-hyphens>.

  --out <dir>
    Output directory for the generated Electron project.
    Default: ./generated/<slug>.

  --overwrite
    Delete/replace the output directory if it already exists.
    Without this flag, fail safely if output exists.

  --install
    Run package manager install inside the generated project.

  --package
    Run Electron Forge package after install.
    If --package is provided without --install, either run install automatically or fail with a clear message.

  --make
    Run Electron Forge make after install.
    If --make is provided without --install, either run install automatically or fail with a clear message.

  --package-manager <npm|yarn|pnpm>
    Package manager to use.
    Default: npm.

macOS packaging:
  --dmg
    Include and configure the Electron Forge DMG maker.
    Default: false for V1 unless implementation confirms it is stable locally.

  --zip
    Include the Electron Forge ZIP maker.
    Default: true.

Window:
  --width <number>
    Initial window width.
    Default: 1200.

  --height <number>
    Initial window height.
    Default: 900.

  --min-width <number>
    Minimum window width.
    Default: 420.

  --min-height <number>
    Minimum window height.
    Default: 640.

Assets:
  --icon <path>
    Optional macOS icon path.
    Prefer `.icns`.
    Copy into resources/.
    Configure Forge packager icon when practical.

Metadata:
  --version <semver>
    App version.
    Default: 1.0.0.

  --author <name>
    package.json author.
    Default: empty string.

  --description <text>
    package.json description.
    Default: "Mac app wrapper for <product-name>."

Output helpers:
  --help
    Print usage.

  --dry-run
    Print what would be generated without writing files.
```

## Behavior

The CLI should:

1. Validate that the input path exists.
2. Validate that the input is a file.
3. Warn, but do not fail, if the input extension is not `.html` or `.htm`.
4. Read the HTML file.
5. Extract the `<title>` value if present.
6. Derive safe names:
   - `slug`: lowercase, hyphenated, package-safe.
   - `packageName`: npm-package-safe.
   - `productName`: human-readable.
   - `bundleId`: reverse-domain-style identifier.
7. Resolve the output directory.
8. If output exists:
   - Fail unless `--overwrite` is provided.
   - If `--overwrite` is provided, remove only the output directory, never the source file.
9. Create the Electron project directory.
10. Copy the source HTML to:

```text
app/index.html
```

11. Generate:
    - `package.json`
    - `main.js`
    - `forge.config.js`
    - `README.md`
    - `.gitignore`
12. Optionally copy icon assets.
13. Optionally run install.
14. Optionally run package.
15. Optionally run make.
16. Print clear next steps and artifact locations.

## Safety Requirements

The tool must not modify the source HTML file.

The tool must not delete any directory unless:

- It is the resolved output directory.
- `--overwrite` was explicitly provided.

The tool must refuse dangerous output directories such as:

```text
/
~
.
..
/Users
/Users/<name>
/Applications
/System
/Library
```

The exact list can be conservative. If unsure, fail with a clear message.

## Generated Electron Main Process

The generated `main.js` should:

- Create a single `BrowserWindow`.
- Load `app/index.html` using `loadFile`.
- Use secure renderer defaults:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`
- Disable unexpected new windows.
- Set a reasonable background color.
- Hide the menu bar by default.
- Support standard macOS activate behavior.
- Not expose Node APIs to the HTML file.

Template:

```js
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const APP_HTML = path.join(__dirname, "app", "index.html");

function createWindow() {
  const win = new BrowserWindow({
    width: __WINDOW_WIDTH__,
    height: __WINDOW_HEIGHT__,
    minWidth: __WINDOW_MIN_WIDTH__,
    minHeight: __WINDOW_MIN_HEIGHT__,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.once("ready-to-show", () => {
    win.show();
  });

  win.loadFile(APP_HTML);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
```

Replace placeholders with numeric values.

## Generated package.json

Generate a package file similar to:

```json
{
  "name": "__PACKAGE_NAME__",
  "productName": "__PRODUCT_NAME__",
  "version": "__VERSION__",
  "description": "__DESCRIPTION__",
  "author": "__AUTHOR__",
  "main": "main.js",
  "private": true,
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.0.0",
    "@electron-forge/maker-dmg": "^7.0.0",
    "@electron-forge/maker-zip": "^7.0.0",
    "electron": "^latest"
  }
}
```

Implementation note:

Use real pinned versions at implementation time rather than the literal `^latest`. Prefer current stable Electron and Electron Forge versions.

If `--dmg` is not used, omit `@electron-forge/maker-dmg`.

## Generated forge.config.js

Generate CommonJS config.

Default ZIP-only version:

```js
module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: "__BUNDLE_ID__",
    executableName: "__EXECUTABLE_NAME__"
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"]
    }
  ]
};
```

If `--dmg` is provided:

```js
module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: "__BUNDLE_ID__",
    executableName: "__EXECUTABLE_NAME__"
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"]
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        format: "ULFO"
      }
    }
  ]
};
```

If an icon is provided, include:

```js
icon: "./resources/icon"
```

Important:

- Electron Packager expects the icon path without the `.icns` extension.
- Prefer copying an input `.icns` file to `resources/icon.icns`.
- If the user provides a non-`.icns` image, copy it but warn that macOS packaging may require an `.icns` icon.

## Generated README.md

The generated app README should include:

```text
# <Product Name>

This Electron app wraps app/index.html as a standalone macOS desktop app.

## Development

npm install
npm start

## Package a macOS .app

npm run package

The packaged app appears under out/.

## Make distributables

npm run make

By default this creates a macOS ZIP under out/make/.

If this project was generated with DMG support, npm run make also creates a .dmg.

## Signing and notarization

Unsigned local builds are useful for personal use and testing.

For distribution to other Macs, configure Apple Developer code signing and notarization.
```

## Generated .gitignore

Use:

```text
node_modules/
out/
dist/
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
```

## App Creator package.json

The app creator project itself should have:

```json
{
  "name": "html-to-mac-app",
  "version": "1.0.0",
  "private": true,
  "description": "Create macOS Electron app scaffolds from single-file HTML apps.",
  "type": "commonjs",
  "bin": {
    "html-to-mac-app": "./bin/html-to-mac-app.js"
  },
  "scripts": {
    "create-app": "node bin/html-to-mac-app.js",
    "test": "node bin/html-to-mac-app.js examples/sample.html --out .tmp/sample-app --overwrite --dry-run"
  },
  "engines": {
    "node": ">=18"
  }
}
```

The creator should use only Node built-ins unless there is a strong reason for a dependency.

Use:

- `node:fs`
- `node:path`
- `node:child_process`
- `node:os`

Avoid adding argument parsing dependencies unless necessary.

## Internal Architecture

Separate CLI parsing from generation logic.

Suggested modules:

```text
bin/html-to-mac-app.js
  Thin executable entrypoint.

src/args.js
  Parse argv and print help.

src/generator.js
  Main generateProject(config) implementation.

src/names.js
  Name, slug, package, bundle ID, and executable helpers.

src/filesystem.js
  Safe output checks, mkdir, write file, copy file.

src/commands.js
  Install/package/make child process helpers.
```

This should make a future GUI app straightforward:

```js
const { generateProject } = require("./src/generator");
```

The future Electron GUI can call `generateProject(config)` directly instead of shelling out to the CLI.

## CLI Implementation Details

Implement `bin/html-to-mac-app.js`.

It should be executable:

```js
#!/usr/bin/env node
```

Major functions:

```js
main()
parseArgs(argv)
printHelp()
resolveInputFile(rawPath)
readHtmlTitle(html)
slugify(value)
humanizeSlug(slug)
toPackageName(value)
toBundleId(value)
assertSafeOutputDir(outDir, overwrite)
generateProject(config)
writeFileFromTemplate(templatePath, targetPath, replacements)
copyHtml(inputPath, targetPath)
copyIcon(iconPath, resourcesDir)
runCommand(command, args, cwd)
printSummary(config)
```

Argument parsing can be simple:

- First positional argument is HTML file.
- Options use `--key value` or boolean flags.
- Unknown options should fail with a useful message.

## Template Replacement

Use simple token replacement.

Tokens:

```text
__PACKAGE_NAME__
__PRODUCT_NAME__
__VERSION__
__DESCRIPTION__
__AUTHOR__
__BUNDLE_ID__
__WINDOW_WIDTH__
__WINDOW_HEIGHT__
__WINDOW_MIN_WIDTH__
__WINDOW_MIN_HEIGHT__
__EXECUTABLE_NAME__
__OPTIONAL_ICON_WITHOUT_EXTENSION__
```

For config files, avoid leaving invalid trailing commas when optional icon is omitted.

It is acceptable to generate `forge.config.js` programmatically as a string rather than using a template if that makes optional fields cleaner.

## Name Derivation Rules

Given input:

```text
connections-creator.html
```

Defaults:

```text
slug: connections-creator
package name: connections-creator
productName: Connections Creator
bundleId: com.local.connectionscreator
executableName: connections-creator
```

If the HTML contains:

```html
<title>Puzzle Set Creator</title>
```

Then default productName should be:

```text
Puzzle Set Creator
```

Package name should still be package-safe.

## HTML Support Assumptions

The input HTML is expected to be self-contained or use relative assets.

Minimum support:

- Single `.html` file with inline CSS/JS.

Optional support:

- If the HTML references relative assets, support a future `--assets <dir>` option.
- This first version does not need to implement asset discovery.

Document this clearly.

## Downloads And localStorage

Generated Electron apps should preserve normal browser behavior as much as possible.

Expected:

- `localStorage` works inside Electron.
- Canvas APIs work.
- Anchor downloads should work in a normal Electron renderer.

Do not add Node integration to the renderer to support downloads.

If download behavior needs improvement later, add an optional preload or main-process download handler in a future version.

## Security Requirements

The generated Electron app should treat the HTML as local app code, but still use safe defaults.

Required:

```js
nodeIntegration: false
contextIsolation: true
sandbox: true
```

Also:

- Deny new windows by default.
- Do not enable remote module.
- Do not expose Node APIs to the HTML file.
- Do not inject scripts into the HTML file.

## Install, Package, And Make Behavior

If `--install` is passed:

For npm:

```bash
npm install
```

For yarn:

```bash
yarn install
```

For pnpm:

```bash
pnpm install
```

If `--package` is passed:

For npm:

```bash
npm run package
```

For yarn:

```bash
yarn package
```

For pnpm:

```bash
pnpm run package
```

If `--make` is passed:

For npm:

```bash
npm run make
```

For yarn:

```bash
yarn make
```

For pnpm:

```bash
pnpm run make
```

The tool should stream child process output to the terminal.

If a command fails, exit non-zero and print the failed command.

## Output Summary

After successful scaffold, print:

```text
Created macOS Electron app:

  <output path>

Source HTML copied to:

  <output path>/app/index.html

Next steps:

  cd <output path>
  npm install
  npm start
  npm run package
  npm run make
```

If `--package` was run, also print:

```text
Packaged .app output:

  <output path>/out
```

If `--make` was run, also print:

```text
Distributable artifacts:

  <output path>/out/make
```

If DMG support was not enabled, print:

```text
This project is configured for macOS ZIP output by default. Regenerate with --dmg to include DMG output.
```

If current platform is not macOS, print:

```text
Note: macOS .app and DMG artifacts should be built on macOS.
```

## Acceptance Criteria

The project is complete when:

- `npm run create-app -- examples/sample.html --out .tmp/sample-app --overwrite` creates a valid Electron project.
- The generated project contains `app/index.html` copied from the source HTML.
- The generated `main.js` loads `app/index.html` with `BrowserWindow.loadFile`.
- The generated `main.js` uses secure renderer defaults.
- The generated `package.json` includes start/package/make scripts.
- The generated `forge.config.js` includes macOS ZIP maker support.
- `--dmg` adds DMG maker support.
- `--overwrite` is required before replacing an existing output directory.
- `--dry-run` prints planned output without writing files.
- `--install` runs dependency installation.
- `--package` runs Electron Forge package.
- `--make` runs Electron Forge make.
- The generated README explains how to run and package the app on macOS.
- The CLI exits non-zero with clear errors for missing input, unsafe output, unknown options, or failed child commands.
- The generator core can be imported independently of the CLI.

## Manual Test Plan

From the app creator project root:

```bash
npm run create-app -- examples/sample.html --out .tmp/sample-app --overwrite
```

Then:

```bash
cd .tmp/sample-app
npm install
npm start
```

Expected:

- Native Electron window opens.
- The sample HTML displays.

Then:

```bash
npm run package
```

Expected:

- Packaged `.app` appears in `out/`.

Then:

```bash
npm run make
```

Expected:

- macOS ZIP artifact appears under `out/make/`.

With DMG:

```bash
npm run create-app -- examples/sample.html --out .tmp/sample-dmg-app --overwrite --dmg
cd .tmp/sample-dmg-app
npm install
npm run make
```

Expected:

- macOS ZIP artifact appears under `out/make/`.
- macOS DMG artifact appears under `out/make/`, if the local macOS environment supports DMG creation.

## Example sample.html

Create `examples/sample.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sample HTML App</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #111111;
    }
    main {
      text-align: center;
    }
    button {
      min-height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      border: 1px solid #111111;
      background: #111111;
      color: #ffffff;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <h1>Sample HTML App</h1>
    <p id="count">Clicked 0 times</p>
    <button id="button" type="button">Click</button>
  </main>
  <script>
    let clicks = Number(localStorage.getItem("sample.clicks") || "0");
    const count = document.getElementById("count");
    const button = document.getElementById("button");

    function render() {
      count.textContent = `Clicked ${clicks} ${clicks === 1 ? "time" : "times"}`;
    }

    button.addEventListener("click", () => {
      clicks += 1;
      localStorage.setItem("sample.clicks", String(clicks));
      render();
    });

    render();
  </script>
</body>
</html>
```

## V2 GUI Creator App

After the CLI generator works, create a separate Electron GUI wrapper around the same generator core.

Suggested V2 project shape:

```text
html-to-mac-app/
  bin/
    html-to-mac-app.js
  src/
    generator.js
    ...
  creator-app/
    package.json
    main.js
    preload.js
    app/
      index.html
```

The GUI should:

- Let the user choose the source HTML file.
- Let the user choose an output folder.
- Let the user set product name, bundle ID, window dimensions, icon, ZIP/DMG options.
- Show validation inline.
- Show a progress log.
- Call the shared `generateProject(config)` function.
- Optionally run install/package/make.
- Show clickable output paths when done.

Security for the GUI:

- Keep `nodeIntegration: false`.
- Use a preload script with a minimal `contextBridge` API.
- Do not expose arbitrary shell execution to the renderer.
- All generator operations should validate paths in the main process.

This is intentionally a later phase. V1 should prove the generator works before adding GUI complexity.

## Stretch Goals

Do not implement these until V1 works:

- GUI creator app.
- `--assets <dir>` to copy an asset directory alongside the HTML.
- Automatic detection/copying of relative assets.
- Custom app menu template.
- Download directory configuration.
- Code signing configuration.
- Notarization configuration.
- PNG-to-ICNS icon conversion.
- File associations.
- Kiosk mode.
- Auto-update support.

## Final Deliverable

A working `html-to-mac-app` repository that lets the user run one command against a single HTML file and receive a complete Electron project that can be run as a standalone Mac app and packaged into macOS artifacts.

Primary success command:

```bash
npm run create-app -- ./path/to/single-page-app.html --name "My App" --out ./generated/my-app --install
```

Primary generated app commands:

```bash
npm start
npm run package
npm run make
```
