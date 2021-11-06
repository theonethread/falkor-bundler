import path from "path";
import { fileURLToPath } from "url";
import shell from "shelljs";

const getOwnVersion = (fileUrl) =>
    JSON.parse(shell.cat(path.join(path.dirname(fileURLToPath(fileUrl)), "../package.json"))).version;

export default (fileUrl, short = false) => {
    if (short) {
        console.log("falkor-bundler version", getOwnVersion(fileUrl));
        return;
    }

    console.log(`
[Falkor Bundler]
version ${getOwnVersion(fileUrl)}
(C)2020-2021 Barnabas Bucsy - All rights reserved.

Opinionated ES6 JavaScript / TypeScript module bundler - part of the Falkor Framework

Usage:
  falkor-bundler [--release | --debug] [--silent] [(--input <file>)] [(--out <dir>)] [(--context <ctx>)] [(-- <externals>...)]
  falkor-bundler [-r | -d] [-s] [(-i <file>)] [(-o <dir>)] [(-c <ctx>)] [(-- <externals>...)]
  falkor-bundler (-v | --version | -h | --help)

Options:
  -v, --version              Show version and exit
  -h, --help                 Show this screen and exit
  -r, --release              Bundle in release mode, only used for readability [default]
  -d, --debug                Bundle in debug mode
  -s, --silent               Do not print messages
  -i <file>, --input <file>  Entry .ts or .js file [default: src/index.ts]
  -o <dir>, --out <dir>      Output directory of bundle [default: .dist]
  -c <ctx>, --context <ctx>  JSCC compilation context (see below)
  -- <externals>...          Treat all positional arguments after double dash as externals

JSCC Context:
  A space delimited string that uses '#' prefix for variables when parsed. Eg. "#VALUE #KEY example"
  will extend the compilation context with { _VALUE: true, _KEY: "example" } after parsed.

  If for some reason the '#' character is reserved in your workflow, it can be substituted with any
  special character starting the value with the ':<special-char> ' sequence, eg. ":$ $VALUE $KEY example".
`);
};
