# **Falkor Bundler**

The `falkor-bundler` project is a standalone `npm` command-line application written in vanilla JavaScript to bundle ES6 Node.js JavaScript or TypeScript projects (mainly to be used with the **Falkor Framework**).

The project aims to abstract away distinct build setting difficulties from developers, requiring only to follow certain predefined rules, which are necessary for the automation of:

* TypeScript compilation
* Resolution of compile-time conditions
* Module bundling - including tree-shaking
* Plus:
    * In `debug` mode:
        * Sourcemaps for generated JavaScript, and declaration-maps pointing to local TS sources (for linked usage while developing)
    * In `release` mode:
        * Minification of resulting JavaScript bundle
        * Creation of flattened declaration file (for consuming when used as a dependency)

## **Installation**

### **Development Dependency**

Include the `@falkor/falkor-bundler` in the `package.json` file under `devDependencies`:

```
...
  "devDependencies": {
    ...
    "@falkor/falkor-bundler": "1.0.0"
  }
```

_**NOTE:** And don't forget to run `npm install` afterwards._

### **Command Line Interface**

To install the package locally with `npm` (this will alter your `package.json`):

```
$ npm install "@falkor/falkor-bundler" --save-dev
```

It's also possible to install the package globally, so it's available in your `PATH`:

```
$ npm install "@falkor/falkor-bundler" --global
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

_**NOTE:** `falkor-bundler` creates a release bundle by default, and **will not** empty the output directory before. It was designed this way to support building multiple outputs (eg. both an exported module and a command line application), so a good starter for bundling is to use [`rimraf`](https://www.npmjs.com/package/rimraf "Visit") or similar, to do the cleanup yourself._

### **Command Line Interface**

Usage:

```
falkor-bundler [--release | --debug] [--silent] [(--input <file>)] [(--out <dir>)] [(--context <ctx>)] [(-- <externals>...)]
falkor-bundler [-r | -d] [-s] [(-i <file>)] [(-o <dir>)] [(-c <ctx>)] [(-- <externals>...)]
falkor-bundler (-v | --version | -h | --help)
```

Options:

* `-v` or `--version`: Show version and exit
* `-h` or `--help`: Show help and exit
* `-r` or `--release`: Bundle in `release` mode, only used for readability (default)
* `-d` or `--debug`: Bundle in `debug` mode
* `-s` or `--silent`: Do not print messages
* `-i <file>` or `--input <file>`: Entry `.ts` or `.js` file (default: `src/index.ts`)
* `-o <dir>` or `--out <dir>`: Output directory of bundle (default: `.dist`)
* `-c <ctx>` or `--context <ctx>`: [JSCC](https://github.com/aMarCruz/jscc "Visit") compilation context (see below)
* `-- <externals>...`: Treat all positional arguments after double dash as externals

JSCC Context:

A space delimited string that uses `#` prefix for variables when parsed. Eg. `"#VALUE #KEY example"` will extend the compilation context with `{ "_VALUE": true, "_KEY": "example" }` after parsed.

_**NOTE:** `cwd` must be the project root, where `package.json` and `tsconfig.json` can be found. The `--input` file and `--out` directory will be resolved from here._

## **Required Repository Structure**

The `falkor-bundler` project was mainly developed to compile ES6 `npm` packages in the **Falkor Framework** infrastructure, for that these repositories **must**:

* Be valid ES modules written in strict TypeScript (or vanilla JavaScript)
* Have `"type": "module"` entry in `package.json`
* Have either a `"module"` or `"bin"` entry in `package.json`

### **Required Module Structure**

If a module exposes a library, that must be its main purpose, and it must be indicated in `package.json`. This does not mean, that it can not have accompanying binaries, eg. tools, boilerplate generators, etc. For a module project `package.json` **must**:

* Have `module` entry named after `main` entry's base name with `js` extension (default: `index.js`)
* Have `typings` entry named after `main` and `module` entries' base names with `d.ts` extension (default: `index.d.ts`)

While developing a module, best practice is to bundle it up locally in `debug` mode, and link this local package to your application with `npm`. Since in `debug` mode both sourcemaps and declaration-maps are present, one will get meaningful source code locations in errors, and VSCode will navigate seamless between consuming application and linked `debug` module sources.

### **Required Binary Structure**

Binaries can be standalone Node.js applications, or accompanying tools for your exposed library. For binary projects `package.json` **must**:

* Have a `bin` entry that is:
    * Either a single string input location (in this case the binary will use your project's name from `package.json`)
    * Or an object that's keys are the names of the binaries, and their values are the input locations

> _It is a good idea to package a `man` page with standalone applications. You can check out this project's setup in [`package.json`](package.json "Open") and [`man.md`](man.md) for details._

### **Required Shared Structure**

Since `v1.1.0` it is possible to internally share modules between binaries and the library. In this case the shared module will not get compiled into both your projects output, but will have to compile it separately. For internally shared modules `package.json` **must**:

* Have a `shared` entry that is:
    * Either a single string input location (in this case the binary will use your input file's basename)
    * Or an object that's keys are the names of the shared modules, and their values are the input locations

It is advised not to over-complicate these setups, one should consider the whole dependency tree of all projects when doing so.

> _For a complex setup using this technique you can check out my `falkor-auth-server` project on [GitHub](https://github.com/theonethread/falkor-auth-server "Open")._

### **TypeScript Configuration**

The project needs a valid `tsconfig.json` in the root directory, but all compiler options will be overridden by the internal mechanism, so this file is merely used as linter settings by VSCode.

## **Further Development**

To compile `falkor-bundler` one can use the commands in the root directory:

```
$ npm install
$ npm run [ debug | release ]
```

This will use the project's raw JavaScript source to create a distribution from itself. :sunglasses:

### **Man Page**

By default the `falkor-bundler` module ships with a pre-compiled man page when installed on Unix-like operating systems. The manual was created by converting the file [`man/man.md`](man/man.md "Open").

To recompile the manual, make sure that [`Pandoc`](https://pandoc.org/ "Visit") is installed, and present in the `PATH`, then run:

```
$ npm run man
```

### **Open Source**

You can always find the latest sources on [GitHub](https://github.com/theonethread/falkor-bundler "Visit").

_©2020-2021 Barnabas Bucsy - All rights reserved._
