import process from "process";
import path from "path";
import minimist from "minimist";
import shell from "shelljs";
import stripJsonComments from "strip-json-comments";
import loggerFactory from "./cli/logger.js";

//#region COMMAND LINE INTERFACE

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

//#endregion

logger.printFalkor("starting");

//#region COMMAND LINE VALIDATION

// FUTURE: maybe make this configurable?
const tempTypesDir = ".types";
const cliConfig = {
    input: "src/index.ts",
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

const bundleModeSet = false;

logger.printTask("validating command line arguments");

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
                process.exit(1);
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
                process.exit(1);
            }
            cliConfig.input = argv[arg];
            break;

        case "o":
        case "out":
            if (typeof argv[arg] !== "string") {
                logger.printError(
                    `'out: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`
                );
                process.exit(1);
            }
            cliConfig.outDir = argv[arg];
            break;

        case "c":
        case "context":
            if (typeof argv[arg] !== "string") {
                logger.printError(
                    `'context: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`
                );
                process.exit(1);
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
                process.exit(1);
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

        // extra arguments provided by minimist - must be listed in the end following '--' POSIX separator
        case "--":
            if (argv[arg].length) {
                cliConfig.outerExternals.push(...argv[arg]);
            }
            break;

        // positional arguments provided by minimist
        case "_":
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
    process.exit(1);
}
if (!shell.test("-f", cliConfig.input)) {
    logger.printError(`entry point '${path.resolve(cliConfig.input)}' not found`);
    process.exit(1);
}
if (shell.test("-e", `${inputDir}/${tempTypesDir}`)) {
    logger.printError(`output subdirectory '${tempTypesDir}' is reserved, please consider restructuring your sources`);
    process.exit(1);
}

//#endregion

//#region TSCONFIG VALIDATION

logger.printTask("validating tsconfig.json");

const target = "ESNext";
try {
    // tsconfig.json allows comments, need to strip them
    const tsc = JSON.parse(stripJsonComments(shell.cat("tsconfig.json").toString()));
    // FUTURE: extract 'target', support ES5 with package 'browser'?
    if (tsc.target && tsc.target !== target) {
        logger.printError("invalid 'target' in tsconfig.json, currently only 'ESNext' is supported");
        process.exit(1);
    }
} catch (e) {
    logger.printError("invalid tsconfig.json, working directory must be TypeScript project root");
    process.exit(1);
}

//#endregion

//#region PACKAGE VALIDATION

logger.printTask("validating package.json");

let pkg;
let moduleName;
let libraryMode = false;
let binaryMode = false;
let sharedMode = false;
const buildModes = [];
const excludedBinaries = [];

try {
    pkg = JSON.parse(shell.cat("package.json"));
} catch (e) {
    logger.printError("invalid package.json, working directory must be NodeJS module root");
    process.exit(1);
}

if (pkg.type !== "module") {
    logger.printError("'type' in package.json is not 'module'");
    process.exit(1);
}
if (pkg.module && pkg.module === `${cliConfig.outDir}/${inputName}.js`) {
    if (pkg.main !== `${cliConfig.outDir}/${inputName}.js`) {
        logger.printError(`'main' in package.json is not the same as 'module'`);
        process.exit(1);
    }
    if (pkg.typings !== `${cliConfig.outDir}/${inputName}.d.ts`) {
        logger.printError(`'typings' in package.json is not named after 'module'`);
        process.exit(1);
    }
    libraryMode = true;
    buildModes.push("module");
}
// NOTE: replace directory tree with first directory only, since shared modules my not live in the root of the project
const pathReplacer = new RegExp(`^${cliConfig.outDir.replace(/^(\.\/)?([^\/]+)(.*)?/, "$1$2")}`);
const replaceDir = inputDir.replace(/^(\.\/)?([^\/]+)(.*)?/, "$1$2");
const extReplacer = /\.js$/;
if (pkg.bin) {
    let binaries;
    if (typeof pkg.bin === "string") {
        binaries = [[pkg.name, pkg.bin]];
    } else {
        binaries = Object.entries(pkg.bin);
    }
    for (const [binName, binPath] of binaries) {
        if (binPath === `${cliConfig.outDir}/${inputName}.js`) {
            moduleName = binName;
            binaryMode = true;
            buildModes.push("binary");
        } else {
            let binarySource = binPath.replace(pathReplacer, replaceDir);
            if (!cliConfig.jsMode) {
                binarySource = binarySource.replace(extReplacer, ".ts");
            }
            excludedBinaries.push(binarySource);
        }
    }
}
if (pkg.shared) {
    let sharedModules;
    if (typeof pkg.shared === "string") {
        sharedModules = [pkg.shared];
    } else {
        sharedModules = pkg.shared;
    }
    sharedModules.forEach((sharedPath) => {
        if (sharedPath === `${cliConfig.outDir}/${inputName}.js`) {
            moduleName = inputName;
            sharedMode = true;
            buildModes.push("shared");
        } else {
            let sharedSource = sharedPath.replace(pathReplacer, replaceDir);
            if (!cliConfig.jsMode) {
                cliConfig.sharedExternals.push(sharedSource);
                sharedSource = sharedSource.replace(extReplacer, ".ts");
            }
            cliConfig.sharedExternals.push(sharedSource);
        }
    });
}

if (!libraryMode && !binaryMode && !sharedMode) {
    logger.printError("nor 'binary' nor 'module' nor 'shared' build mode could be resolved from package.json");
    process.exit(1);
}

//#endregion

//#region PRINT SETTINGS

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
if (excludedBinaries.length) {
    logger.printLog(`excluded binary sources: '${excludedBinaries.join(arrayOfStringLogJoiner)}'`);
}
logger.printLog(`build context: ${JSON.stringify(cliConfig.compilationContext, null, 2).replace(/\n/g, "\n      ")}`);

//#endregion

//#region BUNDLE CREATION

logger.printTask(
    `bundling ${buildModes.join(" & ")} '${pkg.name}${
        moduleName && pkg.name !== moduleName ? ":" + moduleName : ""
    }' (${pkg.version}) in [${cliConfig.bundleMode}] mode`
);

logger.printLog(`importing dependencies`);

const [rollup, externals, jscc, typescript, terser, dts, renameExtensions] = await Promise.all([
    import("rollup").then((m) => m.rollup),
    import("rollup-plugin-node-externals").then((m) => m.default),
    import("rollup-plugin-jscc").then((m) => m.default),
    import("@rollup/plugin-typescript").then((m) => m.default),
    import("rollup-plugin-terser").then((m) => m.terser),
    import("rollup-plugin-dts").then((m) => m.default),
    !cliConfig.jsMode && cliConfig.sharedExternals.length
        ? import("@betit/rollup-plugin-rename-extensions").then((m) => m.default.default) // TODO: weird...
        : Promise.resolve()
]);

const externalsOptions = {
    packagePath: "package.json",
    deps: true
};

const typescriptOptions = {
    // plugin options
    // NOTE: exclude all sources from generated declarations that are used as binary targets
    // this won't exclude modules imported by them, but those will be removed by tree-shaking
    // in 'release' mode if not in use by the default exported module (if one exists)
    exclude: excludedBinaries,
    // tsc compiler options override
    outDir,
    target,
    rootDir: inputDir,
    allowJs: cliConfig.jsMode,
    declaration: libraryMode,
    declarationDir: libraryMode
        ? `${cliConfig.outDir}${cliConfig.compilationContext._DEBUG ? "" : "/" + tempTypesDir}`
        : undefined,
    declarationMap: libraryMode && cliConfig.compilationContext._DEBUG,
    preserveConstEnums: cliConfig.compilationContext._DEBUG,
    sourceMap: cliConfig.compilationContext._DEBUG,
    module: "ESNext",
    alwaysStrict: true,
    removeComments: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    noImplicitReturns: true,
    noImplicitAny: true,
    noImplicitThis: true,
    noUnusedLocals: true,
    noUnusedParameters: true
};

const jsccOptions = {
    values: cliConfig.compilationContext,
    sourcemap: cliConfig.compilationContext._DEBUG,
    mapContent: false,
    asloader: false
};

const outputOptions = {
    dir: cliConfig.outDir,
    format: "es",
    sourcemap: cliConfig.compilationContext._DEBUG,
    sourcemapExcludeSources: true,
    banner: binaryMode ? "#!/usr/bin/env node" : undefined
};

try {
    logger.printLog("creating javascript bundle");

    const sourceBundle = await rollup({
        input: cliConfig.input,
        preserveEntrySignatures: libraryMode || sharedMode ? "strict" : false,
        external: cliConfig.outerExternals.length ? cliConfig.outerExternals : undefined,
        plugins: [
            externals(externalsOptions),
            // since using es modules, ts transpilation must come first
            // NOTE: this will include all 'debug' files in the bundle regardless of build mode, but since later the code using them will be
            // stripped by JSCC in 'release', tree-shaking will not include those in the final bundle
            // WARNING: do not remove comments in this step, they are needed by JSCC
            typescript(typescriptOptions),
            // TypeScript shared externals' import extension will get rewritten from '.js' to '.ts', we fix that with this plugin in the final output
            !cliConfig.jsMode && cliConfig.sharedExternals.length
                ? renameExtensions({
                      include: ["**/*.ts"],
                      mappings: { ".ts": ".js" },
                      sourceMap: cliConfig.compilationContext._DEBUG
                  })
                : undefined,
            // resolve compile-time conditions in resulting javascript files
            jscc(jsccOptions),
            // minify code in release mode
            cliConfig.compilationContext._RELEASE ? terser() : undefined
        ]
    });

    logger.printLog("writing javascript bundle");
    await sourceBundle.write(outputOptions);

    logger.printLog("closing javascript bundle");
    await sourceBundle.close();

    if (libraryMode && cliConfig.compilationContext._RELEASE) {
        logger.printLog("creating typings bundle");

        const typingsOutputOptions = {
            file: `${cliConfig.outDir}/${inputName}.d.ts`,
            sourcemap: cliConfig.compilationContext._DEBUG,
            format: "es"
        };

        // NOTE: in release mode the typings by tsc get written to a temporary folder '${tempTypesDir}' before flattening them to output directory
        const typingsBundle = await rollup({
            input: `${cliConfig.outDir}/${tempTypesDir}/${inputName}.d.ts`,
            plugins: [externals(externalsOptions), dts()]
        });

        logger.printLog("writing typings bundle");
        await typingsBundle.write(typingsOutputOptions);

        logger.printLog("closing typings bundle");
        await typingsBundle.close();

        logger.printLog(`removing intermediate typings files from '${tempTypesDir}'`);
        shell.rm("-rf", `${cliConfig.outDir}/${tempTypesDir}`);
    }
} catch (e) {
    logger.printError("unhandled bundling error:");
    logger.printLog(e);
    process.exit(1);
}

//#endregion

logger.printFalkor("finished");
process.exit(0);
