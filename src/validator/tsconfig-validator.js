import shell from "shelljs";
import stripJsonComments from "strip-json-comments";

const tsConfig = {
    target: "ESNext"
};

/** @throws 1 */
export default (logger) => {
    logger.printTask("validating tsconfig.json");
    try {
        // tsconfig.json allows comments, need to strip them
        const tsc = JSON.parse(stripJsonComments(shell.cat("tsconfig.json").toString()));
        // FUTURE: extract 'target', support ES5 with package 'browser'?
        if (tsc.target && tsc.target !== tsConfig.target) {
            logger.printError("invalid 'target' in tsconfig.json, currently only 'ESNext' is supported");
            process.exit(1);
        }
    } catch (e) {
        logger.printError("invalid tsconfig.json, working directory must be TypeScript project root");
        throw 1;
    }

    return tsConfig;
};
