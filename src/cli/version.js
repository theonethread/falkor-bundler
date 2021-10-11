import path from "path";
import { fileURLToPath } from "url";
import shell from "shelljs";

export default () =>
    JSON.parse(shell.cat(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../package.json"))).version;
