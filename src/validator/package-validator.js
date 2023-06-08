import shell from "shelljs";
import stripJsonComments from "strip-json-comments";

const extReplacer = /\.js$/;
const packageConfig = {
    version: "",
    packageName: "",
    moduleName: "",
    libraryMode: false,
    binaryMode: false,
    sharedMode: false,
    buildModes: [],
    excludedBinaries: []
};

/** @throws 1 */
export default (cliConfig, logger) => {
    logger.printTask("validating package.json");

    let pkg;
    try {
        pkg = JSON.parse(shell.cat("package.json"));
    } catch (e) {
        logger.printError("invalid package.json, working directory must be NodeJS module root");
        throw 1;
    }
    packageConfig.version = pkg.version;
    packageConfig.packageName = pkg.name;
    if (pkg.type !== "module") {
        if (pkg.type === "commonjs") {
            logger.printWarning("'type' in package.json is 'commonjs'");
        } else {
            logger.printError("'type' in package.json is not 'module'");
            throw 1;
        }
    }
    if (pkg.module && pkg.module === `${cliConfig.outDir}/${cliConfig.inputName}.js`) {
        if (pkg.main !== `${cliConfig.outDir}/${cliConfig.inputName}.js`) {
            logger.printError(`'main' in package.json is not the same as 'module'`);
            process.exit(1);
        }
        if (pkg.typings !== `${cliConfig.outDir}/${cliConfig.inputName}.d.ts`) {
            logger.printError(`'typings' in package.json is not named after 'module'`);
            throw 1;
        }
        packageConfig.libraryMode = true;
        packageConfig.buildModes.push("library");
    }
    // NOTE: replace directory tree with first directory only, since shared modules my not live in the root of the project
    const pathReplacer = new RegExp(`^${cliConfig.outDir.replace(/^(\.\/)?([^\/]+)(.*)?/, "$1$2")}`);
    const replaceDir = cliConfig.inputDir.replace(/^(\.\/)?([^\/]+)(.*)?/, "$1$2");
    if (pkg.bin) {
        let binaries;
        if (typeof pkg.bin === "string") {
            binaries = [[pkg.name, pkg.bin]];
        } else {
            binaries = Object.entries(pkg.bin);
        }
        for (const [binName, binPath] of binaries) {
            if (binPath === `${cliConfig.outDir}/${cliConfig.inputName}.js`) {
                packageConfig.moduleName = binName;
                packageConfig.binaryMode = true;
                packageConfig.buildModes.push("binary");
            } else {
                let binarySource = binPath.replace(pathReplacer, replaceDir);
                if (!cliConfig.jsMode) {
                    binarySource = binarySource.replace(extReplacer, ".ts");
                }
                packageConfig.excludedBinaries.push(binarySource);
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
            if (sharedPath === `${cliConfig.outDir}/${cliConfig.inputName}.js`) {
                packageConfig.moduleName = cliConfig.inputName;
                packageConfig.sharedMode = true;
                packageConfig.buildModes.push("shared");
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

    if (!(packageConfig.libraryMode || packageConfig.binaryMode || packageConfig.sharedMode)) {
        logger.printError("nor 'binary' nor 'library' nor 'shared' build mode could be resolved from package.json");
        throw 1;
    }

    return packageConfig;
};
