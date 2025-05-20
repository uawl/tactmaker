import * as yaml from "yaml";
import { parseArgs } from "util";
import { TactParser } from "./parser";
import p from "path";

const { positionals } = parseArgs({
  args: Bun.argv,
  strict: true,
  allowPositionals: true
});

for (const path of positionals) {
  if (!path.endsWith(".tact")) continue;
  const file = Bun.file(path);
  if (!await file.exists()) {
    console.error(`File ${path} does not exist`);
    process.exit(1);
  }
  (async () => {
    console.log(`Parsing ${path}...`)
    const text = await file.text();
    const parser = new TactParser(path, text);
    parser.parse();
  })().catch(console.error);
}



