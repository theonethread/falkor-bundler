import path from "path";
import minimist from "minimist";
import shell from "shelljs";
import stripJsonComments from "strip-json-comments";

//#region COMMAND LINE INTERFACE

// NOTE: differentiate between positional arguments, and options passed after "--" POSIX separator
const argv = minimist(process.argv.slice(2), { "--": true, string: "--" });
if ((short = argv.v || argv.version) || argv.h || argv.help) {
    (await import("./cli/index-cli.js")).default(import.meta.url, short);
    process.exit(0);
}

const arrayOfStringLogJoiner = "', '";
const cwd = process.cwd();

let printFalkor;
let printTask;
let printLog;
let printWarning;
let printError;
if (argv.s || argv.silent) {
    printFalkor = () => void 0;
    printTask = () => void 0;
    printLog = () => void 0;
    printWarning = () => void 0;
    printError = () => void 0;
} else {
    printFalkor = (...l) => console.log("[Falkor Module Bundler]", ...l);
    printTask = (...l) => console.log("  #", ...l);
    printLog = (...l) => console.log("    >", ...l);
    printWarning = (...l) => console.log("    ! WARNING:", ...l);
    printError = (...l) => console.error("    ! ERROR:", ...l);
}

//#endregion

printFalkor("starting");

//#region COMMAND LINE VALIDATION

let input = "src/index.ts";
let outDir = ".dist";
let jsMode = false;
let bundleMode = "release";
let bundleModeSet = false;
const outerExternals = [];
const sharedExternals = [];
const compilationContext = {
    _DEBUG: false,
    _RELEASE: true
};
// FUTURE: maybe make this configurable?
const tempTypesDir = ".types";

printTask("validating command line arguments");

Object.keys(argv).forEach((arg) => {
    switch (arg) {
        case "d":
        case "debug":
        case "r":
        case "release":
            const tryingDebug = arg === "d" || arg === "debug";
            if (bundleModeSet || typeof argv[arg] !== "boolean") {
                printError(
                    `'${tryingDebug ? "debug" : "release"}: -${
                        arg.length > 1 ? "-" : ""
                    }${arg}' must be boolean, or already set (using argument: ${argv[arg]})`
                );
                process.exit(1);
            }
            if (tryingDebug) {
                compilationContext._DEBUG = argv[arg];
                compilationContext._RELEASE = !argv[arg];
                bundleMode = "debug";
            }
            bundleModeSet = true;
            break;

        case "i":
        case "input":
            if (typeof argv[arg] !== "string") {
                printError(
                    `'input: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`
                );
                process.exit(1);
            }
            input = argv[arg];
            break;

        case "o":
        case "out":
            if (typeof argv[arg] !== "string") {
                printError(`'out: -${arg.length > 1 ? "-" : ""}${arg}' must be string (using argument: ${argv[arg]})`);
                process.exit(1);
            }
            outDir = argv[arg];
            break;

        case "c":
        case "context":
            if (typeof argv[arg] !== "string") {
                printError(
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
                printError(`'context: -${arg.length > 1 ? "-" : ""}${arg}' parse error (using argument: ${argv[arg]})`);
                process.exit(1);
            }
            const excludeContextKeys = ["DEBUG", "RELEASE", "_", "__", "--"];
            Object.keys(ctx).forEach((c) => {
                if (excludeContextKeys.includes(c)) {
                    printWarning(`discarding excluded context key '${c}'`);
                    return;
                }
                compilationContext["_" + c] = ctx[c];
            });
            break;

        // extra arguments provided by minimist - must be listed in the end following '--' POSIX separator
        case "--":
            if (argv[arg].length) {
                outerExternals.push(...argv[arg]);
            }
            break;

        // positional arguments provided by minimist
        case "_":
            break;

        default:
            printWarning(`unhandled CLI argument: '-${arg.length > 1 ? "-" : ""}${arg}' (${argv[arg]})`);
            break;
    }
});

const { ext: inputExt, dir: inputDir, name: inputName } = path.parse(input);
if (inputExt === ".js") {
    jsMode = true;
} else if (inputExt !== ".ts") {
    printError(`invalid entry point '${path.resolve(input)}'`);
    process.exit(1);
}
if (!shell.test("-f", input)) {
    printError(`entry point '${path.resolve(input)}' not found`);
    process.exit(1);
}
if (shell.test("-e", `${inputDir}/${tempTypesDir}`)) {
    printError(`output subdirectory '${tempTypesDir}' is reserved, please consider restructuring your sources`);
    process.exit(1);
}

//#endregion

//#region TSCONFIG VALIDATION

printTask("validating tsconfig.json");

const target = "ESNext";
try {
    // tsconfig.json allows comments, need to strip them
    const tsc = JSON.parse(stripJsonComments(shell.cat("tsconfig.json").toString()));
    // FUTURE: extract 'target', support ES5 with package 'browser'?
    if (tsc.target && tsc.target !== target) {
        printError("invalid 'target' in tsconfig.json, currently only 'ESNext' is supported");
        process.exit(1);
    }
} catch (e) {
    printError("invalid tsconfig.json, working directory must be TypeScript project root");
    process.exit(1);
}

//#endregion

//#region PACKAGE VALIDATION

printTask("validating package.json");

let pkg;
let moduleName;
let moduleMode = false;
let binaryMode = false;
let sharedMode = false;
const buildModes = [];
const excludedBinaries = [];

try {
    pkg = JSON.parse(shell.cat("package.json"));
} catch (e) {
    printError("invalid package.json, working directory must be NodeJS module root");
    process.exit(1);
}

if (pkg.type !== "module") {
    printError("'type' in package.json is not 'module'");
    process.exit(1);
}
if (pkg.module && pkg.module === `${outDir}/${inputName}.js`) {
    if (pkg.main !== `${outDir}/${inputName}.js`) {
        printError(`'main' in package.json is not the same as 'module'`);
        process.exit(1);
    }
    if (pkg.typings !== `${outDir}/${inputName}.d.ts`) {
        printError(`'typings' in package.json is not named after 'module'`);
        process.exit(1);
    }
    moduleMode = true;
    buildModes.push("module");
}
// NOTE: replace directory tree with first directory only, since shared modules my not live in the root of the project
const pathReplacer = new RegExp(`^${outDir.replace(/^(\.\/)?([^\/]+)(.*)?/, "$1$2")}`);
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
        if (binPath === `${outDir}/${inputName}.js`) {
            moduleName = binName;
            binaryMode = true;
            buildModes.push("binary");
        } else {
            let binarySource = binPath.replace(pathReplacer, replaceDir);
            if (!jsMode) {
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
        if (sharedPath === `${outDir}/${inputName}.js`) {
            moduleName = inputName;
            sharedMode = true;
            buildModes.push("shared");
        } else {
            let sharedSource = sharedPath.replace(pathReplacer, replaceDir);
            if (!jsMode) {
                sharedExternals.push(sharedSource);
                sharedSource = sharedSource.replace(extReplacer, ".ts");
            }
            sharedExternals.push(sharedSource);
        }
    });
}

if (!moduleMode && !binaryMode && !sharedMode) {
    printError("nor 'binary' nor 'module' nor 'shared' build mode could be resolved from package.json");
    process.exit(1);
}

//#endregion

//#region PRINT SETTINGS

printTask("validated settings");
printLog(`working directory: '${cwd}'`);
printLog(`input: '${input}'${jsMode ? " (JS mode)" : ""}`);
printLog(`out directory: '${outDir}'`);
if (outerExternals.length) {
    printLog(`externals: '${outerExternals.join(arrayOfStringLogJoiner)}'`);
}
if (sharedExternals.length) {
    printLog(`shared externals: '${sharedExternals.join(arrayOfStringLogJoiner)}'`);

    sharedExternals.forEach((e) => outerExternals.push(path.join(cwd, e)));
}
if (excludedBinaries.length) {
    printLog(`excluded binary sources: '${excludedBinaries.join(arrayOfStringLogJoiner)}'`);
}
printLog(`build context: ${JSON.stringify(compilationContext, null, 2).replace(/\n/g, "\n      ")}`);

//#endregion

//#region BUNDLE CREATION

printTask(
    `bundling ${buildModes.join(" & ")} '${pkg.name}${
        moduleName && pkg.name !== moduleName ? ":" + moduleName : ""
    }' (${pkg.version}) in [${bundleMode}] mode`
);

printLog(`importing dependencies`);

const [rollup, externals, jscc, typescript, terser, dts, renameExtensions] = await Promise.all([
    import("rollup").then((m) => m.rollup),
    import("rollup-plugin-node-externals").then((m) => m.default),
    import("rollup-plugin-jscc").then((m) => m.default),
    import("@rollup/plugin-typescript").then((m) => m.default),
    import("rollup-plugin-terser").then((m) => m.terser),
    import("rollup-plugin-dts").then((m) => m.default),
    !jsMode && sharedExternals.length
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
    allowJs: jsMode,
    declaration: moduleMode,
    declarationDir: moduleMode ? `${outDir}${compilationContext._DEBUG ? "" : "/" + tempTypesDir}` : undefined,
    declarationMap: moduleMode && compilationContext._DEBUG,
    preserveConstEnums: compilationContext._DEBUG,
    sourceMap: compilationContext._DEBUG,
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
    values: compilationContext,
    sourcemap: compilationContext._DEBUG,
    mapContent: false,
    asloader: false
};

const outputOptions = {
    dir: outDir,
    format: "es",
    sourcemap: compilationContext._DEBUG,
    sourcemapExcludeSources: true,
    banner: binaryMode ? "#!/usr/bin/env node" : undefined
};

try {
    printLog("creating javascript bundle");

    const sourceBundle = await rollup({
        input,
        preserveEntrySignatures: moduleMode || sharedMode ? "strict" : false,
        external: outerExternals.length ? outerExternals : undefined,
        plugins: [
            externals(externalsOptions),
            // since using es modules, ts transpilation must come first
            // NOTE: this will include all 'debug' files in the bundle regardless of build mode, but since later the code using them will be
            // stripped by JSCC in 'release', tree-shaking will not include those in the final bundle
            // WARNING: do not remove comments in this step, they are needed by JSCC
            typescript(typescriptOptions),
            // TypeScript shared externals' import extension will get rewritten from '.js' to '.ts', we fix that with this plugin in the final output
            !jsMode && sharedExternals.length
                ? renameExtensions({
                      include: ["**/*.ts"],
                      mappings: { ".ts": ".js" },
                      sourceMap: compilationContext._DEBUG
                  })
                : undefined,
            // resolve compile-time conditions in resulting javascript files
            jscc(jsccOptions),
            // minify code in release mode
            compilationContext._RELEASE ? terser() : undefined
        ]
    });

    printLog("writing javascript bundle");
    await sourceBundle.write(outputOptions);

    printLog("closing javascript bundle");
    await sourceBundle.close();

    if (moduleMode && compilationContext._RELEASE) {
        printLog("creating typings bundle");

        const typingsOutputOptions = {
            file: `${outDir}/${inputName}.d.ts`,
            sourcemap: compilationContext._DEBUG,
            format: "es"
        };

        // NOTE: in release mode the typings by tsc get written to a temporary folder '${tempTypesDir}' before flattening them to output directory
        const typingsBundle = await rollup({
            input: `${outDir}/${tempTypesDir}/${inputName}.d.ts`,
            plugins: [externals(externalsOptions), dts()]
        });

        printLog("writing typings bundle");
        await typingsBundle.write(typingsOutputOptions);

        printLog("closing typings bundle");
        await typingsBundle.close();

        printLog(`removing intermediate typings files from '${tempTypesDir}'`);
        shell.rm("-rf", `${outDir}/${tempTypesDir}`);
    }
} catch (e) {
    printError("unhandled bundling error:");
    printLog(e);
    process.exit(1);
}

//#endregion

printFalkor("finished");
process.exit(0);
