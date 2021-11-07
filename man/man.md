% FALKOR-BUNDLER(1) The Falkor Framework **1.0.0** | **Falkor** General Commands Manual % Barnabas Bucsy % October 2021

# NAME

**falkor-bundler** - Opinionated ES6 JavaScript / TypeScript module bundler - part of the **Falkor Framework**

# SYNOPSIS

```
falkor-bundler [--release | --debug] [--silent] [(--input <file>)] [(--out <dir>)] [(--context <ctx>)] [(-- <externals>...)]
falkor-bundler [-r | -d] [-s] [(-i <file>)] [(-o <dir>)] [(-c <ctx>)] [(-- <externals>...)]
falkor-bundler (-v | --version | -h | --help)
```

# DESCRIPTION

The **falkor-bundler** project is a standalone npm command-line application written in Vanilla JavaScript to bundle ES6 NodeJS JavaScript or TypeScript projects (mainly to be used with the **Falkor Framework**).

The project aims to abstract away distinct build setting difficulties from developers, requiring only to follow certain predefined rules, which are necessary for the automation of:

- TypeScript compilation
- Resolution of compile-time conditions
- Module bundling - including tree-shaking
- Plus:
  - In **debug** mode:
    - Sourcemaps for generated JavaScript, and declaration-maps pointing to local TS sources (for linked usage while developing)
  - In **release** mode:
    - Minification of resulting JavaScript bundle
    - Creation of flattened declaration file (for consuming when used as a dependency)

# OPTIONS

`-v`, `--version`  
: Show version and exit

`-h`, `--help`  
: Show help and exit

`-r`, `--release`  
: Bundle in **release** mode, only used for readability (default)

`-d`, `--debug`  
: Bundle in **debug** mode

`-s`, `--silent`  
: Do not print messages

`-i <file>`, `--input <file>`  
: Entry **.ts** or **.js** file (default: **src/index.ts**)

`-o <dir>`, `--out <dir>`  
: Output directory of bundle (default: **.dist**)

`-c <ctx>`, `--context <ctx>`  
: JSCC compilation context (see below)

`-- <externals>...`  
: Treat all positional arguments after double dash as externals

# JSCC CONTEXT

A space delimited string that uses `#` prefix for variables when parsed. Eg. `"#VALUE #KEY example"` will extend the compilation context with `{ _VALUE: true, _KEY: "example" }` after parsed.

If for some reason the `#` character is reserved in your workflow, it can be substituted with any special character starting the value with the `":<special-char> "` sequence, eg. `":$ $VALUE $KEY example"`.

# COPYRIGHT

(C)2020-2021 Barnabas Bucsy - All rights reserved.
