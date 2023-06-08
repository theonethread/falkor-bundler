import shell from "shelljs";
import stripJsonComments from "strip-json-comments";

const tsConfig = {
    module: "ESNext",
    target: "ESNext"
};

/** @throws 1 */
export default (logger) => {
    logger.printTask("validating tsconfig.json");
    try {
        // tsconfig.json allows comments, need to strip them
        const tsc = JSON.parse(stripJsonComments(shell.cat("tsconfig.json").toString()));
        // FUTURE: extract 'target', support ES5 with package 'browser'?
        if (tsc.compilerOptions?.target !== tsConfig.target) {
            logger.printWarning("'target' in tsconfig.json is not 'ESNext', but", tsc.compilerOptions.target);
            tsConfig.target = tsc.compilerOptions.target;
        }
        if (tsc.compilerOptions?.module !== tsConfig.module) {
            logger.printWarning("'module' in tsconfig.json is not 'ESNext', but", tsc.compilerOptions.module);
            tsConfig.module = tsc.compilerOptions.module;
        }
    } catch (e) {
        logger.printError("invalid tsconfig.json, working directory must be TypeScript project root");
        throw 1;
    }

    return tsConfig;
};
