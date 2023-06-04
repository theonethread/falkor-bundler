# **Falkor Bundler**

[![Npm Keywords](https://img.shields.io/github/package-json/keywords/theonethread/falkor-bundler "Keywords")](https://www.npmjs.com/package/@falkor/falkor-bundler "Visit") &nbsp; [![Npm Package](https://img.shields.io/npm/v/@falkor/falkor-bundler "Npm")](https://www.npmjs.com/package/@falkor/falkor-bundler "Visit") &nbsp; [![Node Version](https://img.shields.io/node/v/@falkor/falkor-bundler "Node")](https://nodejs.org/ "Visit") &nbsp; [![Build](https://img.shields.io/github/workflow/status/theonethread/falkor-bundler/Falkor%20CI%20-%20Release "Build")](https://github.com/theonethread/falkor-bundler/actions "Visit") &nbsp; [![Security](https://img.shields.io/github/workflow/status/theonethread/falkor-bundler/Falkor%20CI%20-%20Security?label=security "Security")](https://github.com/theonethread/falkor-bundler/actions "Visit") &nbsp; [![Activity](https://img.shields.io/github/last-commit/theonethread/falkor-bundler "Activity")](https://github.com/theonethread/falkor-bundler "Visit") &nbsp; [![Rollup](https://img.shields.io/npm/dependency-version/@falkor/falkor-bundler/rollup "Rollup")](https://www.npmjs.com/package/rollup "Visit") &nbsp; [![TypeScript](https://img.shields.io/npm/dependency-version/@falkor/falkor-bundler/typescript "TypeScript")](https://www.npmjs.com/package/typescript "Visit") &nbsp; [![Snyk Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/github/theonethread/falkor-bundler "Snyk")](https://snyk.io/test/github/theonethread/falkor-bundler "Visit") &nbsp; [![License](https://img.shields.io/npm/l/@falkor/falkor-bundler "MIT")](https://github.com/theonethread/falkor-bundler/blob/master/license.txt "Visit")

The `falkor-bundler` project is a standalone `npm` command-line application written in vanilla JavaScript to bundle ES6 Node.js JavaScript or TypeScript projects (mainly to be used with the **Falkor Framework**).

The project aims to abstract away distinct build setting difficulties from developers, requiring only to follow certain predefined rules, which are necessary for the automation of:

- TypeScript compilation
- Resolution of compile-time conditions
- Module bundling - including tree-shaking
- Plus:
  - In `debug` mode:
    - Sourcemaps for generated JavaScript, and declaration-maps pointing to local TS sources (for linked usage while developing)
  - In `release` mode:
    - Minification of resulting JavaScript bundle
    - Creation of flattened declaration file (for consuming when used as a dependency)

## **Installation**

### **Development Dependency**

Include the `@falkor/falkor-bundler` in the `package.json` file under `devDependencies`:

```
...
  "devDependencies": {
    ...
    "@falkor/falkor-bundler": "1.2.3"
  }
```

_**NOTE:** And don't forget to run `npm install` afterwards._

### **Command Line Interface**

To install the package locally with `npm` (this will alter your `package.json`):

```
$ npm install @falkor/falkor-bundler --save-dev
```

It's also possible to install the package globally, so it's available in your `PATH`:

```
$ npm install @falkor/falkor-bundler --global
```

## **Usage**

### **Development Dependency**

As a dependency, one can use the command-line executable in `npm` scripts. As part of `package.json` under `scripts` this will suffice:

```
  "scripts": {
    ...
    "debug": "rimraf .dist/**/* && falkor-bundler --debug",
    "release": "rimraf .dist/**/* && falkor-bundler"
  }
```

_**NOTE:** `falkor-bundler` creates a release bundle by default, and **will not** empty the output directory before. It was designed this way to support building multiple outputs (eg. both an exported module and a command line application), so a good starter for bundling is to use [`rimraf`](https://www.npmjs.com/package/rimraf "Visit") or similar, to do the cleanup of the exact output(s) of your distinct jobs yourself._

### **Command Line Interface**

Usage:

```
falkor-bundler [--release | --debug] [--silent] [(--input <file>)] [(--out <dir>)] [(--context <ctx>)] [(-- <externals>...)]
falkor-bundler [-r | -d] [-s] [(-i <file>)] [(-o <dir>)] [(-c <ctx>)] [(-- <externals>...)]
falkor-bundler (-v | --version | -h | --help)
```

Options:

- `-v` or `--version`: Show version and exit
- `-h` or `--help`: Show help and exit
- `-r` or `--release`: Bundle in `release` mode, only used for readability (default)
- `-d` or `--debug`: Bundle in `debug` mode
- `-s` or `--silent`: Do not print messages
- `-i <file>` or `--input <file>`: Entry `.ts` or `.js` file (default: `src/index.ts`)
- `-o <dir>` or `--out <dir>`: Output directory of bundle (default: `.dist`)
- `-c <ctx>` or `--context <ctx>`: [JSCC](https://github.com/aMarCruz/jscc "Visit") compilation context (see below)
- `-- <externals>...`: Treat all positional arguments after double dash as externals

JSCC Context:

A space delimited string that uses `#` prefix for variables when parsed. Eg. `"#VALUE #KEY example"` will extend the compilation context with `{ "_VALUE": true, "_KEY": "example" }` after parsed.

If for some reason the `#` character is reserved in your workflow, it can be substituted with any special character starting the value with the `":<special-char> "` sequence, eg. `":$ $VALUE $KEY example"`.

_**NOTE:** `cwd` must be the project root, where `package.json` and `tsconfig.json` can be found. The `--input` file and `--out` directory will be resolved from here._

## **Required Repository Structure**

The `falkor-bundler` project was mainly developed to compile ES6 `npm` packages in the **Falkor Framework** infrastructure, for that these repositories **must**:

- Be valid ES modules written in strict TypeScript (or vanilla JavaScript)
- Have `"type": "module"` entry in `package.json`
- Have either a `"module"` or `"bin"` entry in `package.json`

### **Required Library Structure**

If a module exposes a library, that must be its main purpose, and it must be indicated in `package.json`. This does not mean, that it can not have accompanying binaries, eg. tools, boilerplate generators, etc. For a library project `package.json` **must**:

- Have `module` entry named after `main` entry's base name with `js` extension (default: `index.js`)
- Have `typings` entry named after `main` and `module` entries' base names with `d.ts` extension (default: `index.d.ts`)

> While developing a library, best practice is to bundle it up locally in `debug` mode, and link this local package to your application with `npm`. Since in `debug` mode both sourcemaps and declaration-maps are present, one will get meaningful source code locations in errors, and your IDE will navigate seamless between the consuming application and the linked module's sources.
>
> _**SEE:** [`npm-link`](https://docs.npmjs.com/cli/v7/commands/npm-link "Visit") for further reference._

### **Required Binary Structure**

Binaries can be standalone Node.js applications, or accompanying tools for your exposed library. For binary projects `package.json` **must**:

- Have a `bin` entry that is:
  - Either a single string input location (in this case the binary will use your project's name from `package.json`)
  - Or an object that's keys are the names of the binaries, and their values are the input locations

> _It is a good idea to package a `man` page with standalone applications. You can check out this project's setup in [`package.json`](https://github.com/theonethread/falkor-bundler/blob/master/package.json "Open") and [`man.md`](https://github.com/theonethread/falkor-bundler/blob/master/man/man.md "Open") for details._

### **Required Shared Module Structure**

It is possible to internally share modules between binaries and your library, in this case the shared module will not get compiled into both your projects' artifacts, but it will have to be handled separately. For internally shared modules `package.json` **must**:

- Have a `shared` entry that is:
  - Either a single string input location
  - Or an array of string input locations

> _It is advised not to over-complicate these setups, one should consider the whole dependency tree of all projects when doing so._
>
> _For a complex setup using this technique you can check out the `falkor-auth-server` project on [GitHub](https://github.com/theonethread/falkor-auth-server "Visit")._

### **TypeScript Configuration**

The project needs a valid `tsconfig.json` in the root directory, but all compiler options will be overridden by the internal mechanism, so this file is merely used as linter settings by your IDE.

## **Further Development**

To clone the repository and compile `falkor-bundler` one can use the commands:

```
$ git clone --branch develop git@github.com:theonethread/falkor-commander.git
$ cd falkor-commander
$ npm install
$ npm run [ debug | release ]
```

This will use the project's raw JavaScript source to create a distribution from itself. :sunglasses:

> _**SEE:** `"scripts"` entry in [`package.json`](https://github.com/theonethread/falkor-library/blob/master/package.json "Open") for further reference._

### **Man Page**

By default the `falkor-bundler` module ships with a pre-compiled man page when installed on Unix-like operating systems. The manual was created by converting the file [`man/man.md`](https://github.com/theonethread/falkor-bundler/blob/master/man/man.md "Open").

To recompile the manual, make sure that [`Pandoc`](https://pandoc.org/ "Visit") is installed, and present in the `PATH`, then run:

```
$ npm run man
```

### **Linting**

The project uses [`prettier`](https://www.npmjs.com/package/prettier "Visit") for code formatting and [`cspell`](https://www.npmjs.com/package/cspell "Visit") to avoid general typos in both sources and documentation - it is advised to install these packages as extensions in your IDE to prevent CI errors beforehand. To lint the project run:

```
$ npm run lint
```

> _**SEE:** [`.prettierrc`](https://github.com/theonethread/falkor-bundler/blob/develop/.prettierrc "Open") and [`.cspell.json`](https://github.com/theonethread/falkor-bundler/blob/develop/.cspell.json "Open") for further reference._

- To fix formatting issues run `$ npx prettier --write <path-to-file>`. This will overwrite the file with the default formatting applied locally, so then you can review the changes in `git` and **ensure those did not affect production artifacts**.
- To fix spelling errors run `$ npx cspell lint --wordsOnly --unique --gitignore --exclude .git ** .*` for details, and either make the fixes in the sources listed, add `cspell` favored comments, or extend the project-wide `.cspell.json` accordingly.

### **Versioning and Branching Strategy**

Release sources can be found on the `master` branch, this one always points to the latest tagged release. Previous sources of releases can be found using `git` version tags (or browsing GitHub releases). Released packages can be found on [npmjs](https://www.npmjs.com/package/@falkor/falkor-bundler "Visit").

The repository's main branch is `develop` (due to technical reasons), this holds all developments that are already decided to be included in the next release. Usually this branch is ahead of `master` one patch version (but based on upcoming features to include this can become minor, or major), so prepared external links may yet be broken.

The `feature/*` branches usually hold ideas and POC code, these will only be merged into `develop` once their impact measured and quality meets release requirements.

> _The project uses [SemVer](https://semver.org "Visit"), `git` tags are prefixed with a `v` character._

### **GitHub Actions**

The workflows can be found [here](https://github.com/theonethread/falkor-bundler/blob/develop/.github/workflows "Open").

#### **Continuous Integration**

Automatic builds are achieved via GitHub actions, CI will make nightly builds of the `develop` branch (using Ubuntu image), and test `master` when there is a pull request, or commit on it (using Ubuntu - Win - MacOS image matrix).

### **Security**

The project uses [CodeQL](https://codeql.github.com "Visit") and [Snyk](https://snyk.io "Visit") to ensure standard security.

> _The **Falkor Framework** supports a healthy and ubiquitous Internet Immune System enabled by security research, reporting, and disclosure. Check out our [Vulnerability Disclosure Policy](https://github.com/theonethread/falkor-bundler/security/policy "Open") - based on [disclose.io](https://disclose.io "Visit")'s best practices._

### **Free and Open Source**

The latest sources can always be found on [GitHub](https://github.com/theonethread/falkor-bundler "Visit").

#### **Getting Involved**

We believe - and we hope you do too - that learning how to code, how to think, and how to contribute to free- and open source software can empower the next generation of coders and creators. We **value** first time contributors just the same as rock stars of the OSS world, so if you're interested in getting involved, just head over to our [Contribution Guidelines](https://github.com/theonethread/.github/blob/master/.github/contributing.md "Open") for a quick heads-up!

#### **License**

[MIT](https://github.com/theonethread/falkor-bundler/blob/master/license.txt "Open")

_©2020-2023 Barnabas Bucsy - All rights reserved._
