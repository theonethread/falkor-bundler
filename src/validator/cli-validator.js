import path from "path";
import shell from "shelljs";
import minimist from "minimist";

const cliConfig = {
    input: "src/index.ts",
    inputDir: "src",
    outDir: ".dist",
    jsMode: false,
    bundleMode: "release",
    outerExternals: [],
    sharedExternals: [],
    compilationContext: {
        _DEBUG: false,
        _RELEASE: true
    }
};

/** @throws 1 */
export default (argv, tempTypesDir, logger) => {
    logger.printTask("validating command line arguments");
    const bundleModeSet = false;
    Object.keys(argv).forEach((arg) => {
        switch (arg) {
            case "d":
            case "debug":
            case "r":
            case "release":
                const tryingDebug = arg === "d" || arg === "debug";
                if (bundleModeSet || typeof argv[arg] !== "boolean") {
                    logger.printError(
                        `'${tryingDebug ? "debug" : "release"}: -${
                            arg.length > 1 ? "-" : ""
                        }${arg}' must be boolean, or already set (using argument: ${argv[arg]})`
                    );
                    throw 1;
                }
                if (tryingDebug) {
                    cliConfig.compilationContext._DEBUG = argv[arg];
                    cliConfig.compilationContext._RELEASE = !argv[arg];
                    cliConfig.bundleMode = "debug";
                }
                bundleModeSet = true;
                break;

            case "i":
            case "input":
                if (typeof argv[arg] !== "string") {
                    logger.printError(
                        `'input: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`
                    );
                    throw 1;
                }
                cliConfig.input = argv[arg];
                break;

            case "o":
            case "out":
                if (typeof argv[arg] !== "string") {
                    logger.printError(
                        `'out: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`
                    );
                    throw 1;
                }
                cliConfig.outDir = argv[arg];
                break;

            case "c":
            case "context":
                if (typeof argv[arg] !== "string") {
                    logger.printError(
                        `'context: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`
                    );
                    throw 1;
                }
                let ctx;
                try {
                    let argvStr = argv[arg];
                    let replacer = "#";
                    if (/^:. /.test(argvStr)) {
                        replacer = argvStr[1];
                        argvStr = argvStr.substr(3);
                    }
                    ctx = minimist(argvStr.replace(new RegExp("\\" + replacer), "--").split(/\s+/));
                    delete ctx._;
                } catch (e) {
                    logger.printError(
                        `'context: -${arg.length > 1 ? "-" : ""}${arg}' parse error (using argument: ${argv[arg]})`
                    );
                    throw 1;
                }
                const excludeContextKeys = ["DEBUG", "RELEASE", "_", "__", "--"];
                Object.keys(ctx).forEach((c) => {
                    if (excludeContextKeys.includes(c)) {
                        logger.printWarning(`discarding excluded context key '${c}'`);
                        return;
                    }
                    cliConfig.compilationContext["_" + c] = ctx[c];
                });
                break;

            // positional arguments provided by minimist
            case "_":
                break;

            // extra arguments provided by minimist - must be listed in the end following '--' POSIX separator
            case "--":
                if (argv[arg].length) {
                    cliConfig.outerExternals.push(...argv[arg]);
                }
                break;

            default:
                logger.printWarning(`unhandled CLI argument: '-${arg.length > 1 ? "-" : ""}${arg}' (${argv[arg]})`);
                break;
        }
    });

    const { ext: inputExt, dir: inputDir, name: inputName } = path.parse(cliConfig.input);
    if (inputExt === ".js") {
        cliConfig.jsMode = true;
    } else if (inputExt !== ".ts") {
        logger.printError(`invalid entry point '${path.resolve(cliConfig.input)}'`);
        throw 1;
    }
    if (!shell.test("-f", cliConfig.input)) {
        logger.printError(`entry point '${path.resolve(cliConfig.input)}' not found`);
        throw 1;
    }
    if (shell.test("-e", `${inputDir}/${tempTypesDir}`)) {
        logger.printError(
            `output subdirectory '${tempTypesDir}' is reserved, please consider restructuring your sources`
        );
        throw 1;
    }
    cliConfig.inputDir = inputDir;

    return cliConfig;
};
