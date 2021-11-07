import process from "process";
import path from "path";
import minimist from "minimist";
import shell from "shelljs";
import stripJsonComments from "strip-json-comments";
import loggerFactory from "./cli/logger.js";
import cliValidator from "./validator/cli-validator.js";
import tsconfigValidator from "./validator/tsconfig-validator.js";
import packageValidator from "./validator/package-validator.js";
import bundler from "./bundler/bundler.js";

// NOTE: differentiate between positional arguments, and options passed after "--" POSIX separator
const argv = minimist(process.argv.slice(2), { "--": true, string: "--" });
await (async () => {
    let version = argv.v || argv.version;
    if (version || argv.h || argv.help) {
        (await import("./cli/index-cli.js")).default(import.meta.url, version);
        process.exit(0);
    }
})();

const logger = loggerFactory(argv);
const arrayOfStringLogJoiner = "', '";
const cwd = process.cwd();

logger.printFalkor("starting");

// FUTURE: maybe make this configurable?
const tempTypesDir = ".types";
let cliConfig;
let tsConfig;
let packageConfig;
try {
    cliConfig = cliValidator(argv, tempTypesDir, logger);
    tsConfig = tsconfigValidator(logger);
    packageConfig = packageValidator(cliConfig, logger);

    logger.printTask("validated settings");
    logger.printLog(`working directory: '${cwd}'`);
    logger.printLog(`input: '${cliConfig.input}'${cliConfig.jsMode ? " (JS mode)" : ""}`);
    logger.printLog(`out directory: '${cliConfig.outDir}'`);
    if (cliConfig.outerExternals.length) {
        logger.printLog(`externals: '${cliConfig.outerExternals.join(arrayOfStringLogJoiner)}'`);
    }
    if (cliConfig.sharedExternals.length) {
        logger.printLog(`shared externals: '${cliConfig.sharedExternals.join(arrayOfStringLogJoiner)}'`);

        cliConfig.sharedExternals.forEach((e) => cliConfig.outerExternals.push(path.join(cwd, e)));
    }
    if (packageConfig.excludedBinaries.length) {
        logger.printLog(`excluded binary sources: '${packageConfig.excludedBinaries.join(arrayOfStringLogJoiner)}'`);
    }
    logger.printLog(
        `build context: ${JSON.stringify(cliConfig.compilationContext, null, 2).replace(/\n/g, "\n      ")}`
    );

    await bundler(cliConfig, tsConfig, packageConfig, tempTypesDir, loggerFactory);
} catch (code) {
    process.exit(code);
}

logger.printFalkor("finished");
process.exit(0);
