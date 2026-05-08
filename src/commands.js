"use strict";

const { spawn } = require("node:child_process");

function getPackageManagerCommand(packageManager, action) {
  const commands = {
    npm: {
      install: ["npm", ["install"]],
      package: ["npm", ["run", "package"]],
      make: ["npm", ["run", "make"]]
    },
    yarn: {
      install: ["yarn", ["install"]],
      package: ["yarn", ["package"]],
      make: ["yarn", ["make"]]
    },
    pnpm: {
      install: ["pnpm", ["install"]],
      package: ["pnpm", ["run", "package"]],
      make: ["pnpm", ["run", "make"]]
    }
  };

  return commands[packageManager][action];
}

function runProjectCommand(packageManager, action, cwd) {
  const [command, args] = getPackageManagerCommand(packageManager, action);

  return runCommand(command, args, cwd);
}

function getPackageManagerUsageCommands(packageManager) {
  if (packageManager === "npm") {
    return {
      install: "npm install",
      start: "npm start",
      package: "npm run package",
      make: "npm run make"
    };
  }

  if (packageManager === "pnpm") {
    return {
      install: "pnpm install",
      start: "pnpm start",
      package: "pnpm run package",
      make: "pnpm run make"
    };
  }

  return {
    install: "yarn install",
    start: "yarn start",
    package: "yarn package",
    make: "yarn make"
  };
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run ${formatCommand(command, args)}: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code}: ${formatCommand(command, args)}`));
    });
  });
}

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

module.exports = {
  runProjectCommand,
  runCommand,
  getPackageManagerCommand,
  getPackageManagerUsageCommands
};
