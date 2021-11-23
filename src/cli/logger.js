class Logger {
    printFalkor(...l) {
        console.log("[Falkor Module Bundler]", ...l);
    }
    printTask(...l) {
        console.log("  #", ...l);
    }
    printLog(...l) {
        console.log("    >", ...l);
    }
    printWarning(...l) {
        console.log("    ! WARNING:", ...l);
    }
    printError(...l) {
        console.error("    ! ERROR:", ...l);
    }
}

export default (argv) =>
    argv.s || argv.silent
        ? {
              printFalkor: () => void 0,
              printTask: () => void 0,
              printLog: () => void 0,
              printWarning: () => void 0,
              printError: () => void 0
          }
        : new Logger();
