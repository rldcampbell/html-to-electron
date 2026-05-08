# html-to-mac-app

Create a complete macOS-focused Electron project from a single self-contained HTML app.

```bash
yarn create-app ./path/to/my-app.html --name "My App" --out ./generated/my-app --install
```

Then from the generated app:

```bash
yarn start
yarn package
yarn make
```

## Usage

```bash
yarn create-app <html-file> [options]
node bin/html-to-mac-app.js <html-file> [options]
```

Example:

```bash
yarn create-app examples/connections-creator.html \
  --name "Connections Creator" \
  --bundle-id "com.local.connectionscreator" \
  --out ./generated/connections-creator
```

## Options

Common options:

```text
--name <name>               Machine/package name or human-readable app name.
--product-name <name>       Display name for the macOS app.
--bundle-id <id>            Bundle identifier, e.g. com.example.myapp.
--out <dir>                 Output directory. Default: ./generated/<slug>.
--overwrite                 Replace the output directory if it exists.
--install                   Run package manager install in the generated app.
--package                   Run Electron Forge package after installing.
--make                      Run Electron Forge make after installing.
--package-manager <pm>      npm, yarn, or pnpm. Default: yarn.
```

Packaging and window options:

```text
--dmg                       Include Electron Forge DMG maker.
--no-zip                    Omit the default macOS ZIP maker.
--width <number>            Initial window width. Default: 1200.
--height <number>           Initial window height. Default: 900.
--min-width <number>        Minimum window width. Default: 420.
--min-height <number>       Minimum window height. Default: 640.
--icon <path>               Optional app icon. Prefer .icns for macOS.
--dry-run                   Print the generation plan without writing files.
--help                      Print usage.
```

## Generated Project

The generated Electron app contains:

```text
package.json
forge.config.js
main.js
README.md
.gitignore
app/index.html
```

The generated `main.js` loads `app/index.html` with `BrowserWindow.loadFile` and keeps secure renderer defaults:

```text
nodeIntegration: false
contextIsolation: true
sandbox: true
```

## Manual Check

```bash
yarn create-app examples/sample.html --out .tmp/sample-app --overwrite
cd .tmp/sample-app
yarn install
yarn start
```

Package and make macOS artifacts:

```bash
yarn package
yarn make
```

By default, `yarn package` creates a runnable `.app` under `out/`, and `yarn make` creates a macOS ZIP under `out/make/`. Regenerate with `--dmg` to add DMG maker support.

## HTML Support

This first version is designed for single-file HTML apps with inline CSS and JavaScript. Relative asset discovery and copying are intentionally left for a future `--assets` option.
