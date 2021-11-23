/** @throws 1 */
export default async (cliConfig, packageConfig, tempTypesDir, logger) => {
    logger.printTask(
        `bundling ${packageConfig.buildModes.join(" & ")} '${packageConfig.packageName}${
            packageConfig.moduleName && packageConfig.packageName !== packageConfig.moduleName
                ? ":" + packageConfig.moduleName
                : ""
        }' (${packageConfig.version}) in [${cliConfig.bundleMode}] mode`
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
        exclude: packageConfig.excludedBinaries,
        // tsc compiler options override
        outDir: cliConfig.outDir,
        target: packageConfig.target,
        rootDir: cliConfig.inputDir,
        allowJs: cliConfig.jsMode,
        declaration: packageConfig.libraryMode,
        declarationDir: packageConfig.libraryMode
            ? `${cliConfig.outDir}${cliConfig.compilationContext._DEBUG ? "" : "/" + tempTypesDir}`
            : undefined,
        declarationMap: packageConfig.libraryMode && cliConfig.compilationContext._DEBUG,
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
        banner: packageConfig.binaryMode ? "#!/usr/bin/env node" : undefined
    };

    try {
        logger.printLog("creating javascript bundle");

        const sourceBundle = await rollup({
            input: cliConfig.input,
            preserveEntrySignatures: packageConfig.libraryMode || packageConfig.sharedMode ? "strict" : false,
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

        if (packageConfig.libraryMode && cliConfig.compilationContext._RELEASE) {
            logger.printLog("creating typings bundle");

            const typingsOutputOptions = {
                file: `${cliConfig.outDir}/${cliConfig.inputName}.d.ts`,
                sourcemap: false,
                format: "es"
            };

            // NOTE: in release mode the typings by tsc get written to a temporary folder '${tempTypesDir}' before flattening them to output directory
            const typingsBundle = await rollup({
                input: `${cliConfig.outDir}/${tempTypesDir}/${cliConfig.inputName}.d.ts`,
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
};
