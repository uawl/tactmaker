import { mkdir } from "fs/promises";
import { ZstdInit } from "@oneidentity/zstd-js";
import path from "path";

const BUILD_DIR = "out";
const CLIENT_ENTRY = "src/client/index.html";
const SERVER_ENTRY = "src/server/index.ts";

await mkdir(BUILD_DIR, { recursive: true });

const clientResult = await Bun.build({
  entrypoints: [CLIENT_ENTRY],
  minify: true,
});

if (!clientResult.success) {
  console.error("Build Failed: ", clientResult.logs);
  process.exit(1);
}

const { ZstdSimple } = await ZstdInit();

const data: Record<string, [string, string]> = {};

await Promise.all(clientResult.outputs.map(async v => {
  data[path.normalize(v.path)] = [new Uint8Array(await v.arrayBuffer()).toBase64(), v.type];
}));

const cdata = ZstdSimple.compress(Buffer.from(JSON.stringify(data), 'utf-8'));

const clientBin = Bun.file(`${BUILD_DIR}/client.bin`);
await clientBin.write(cdata);

const targets = [
  "linux-x64", "linux-arm64",
  "windows-x64",
  "darwin-x64", "darwin-arm64",
  "linux-x64-musl", "linux-arm64-musl"
];

await Promise.all(targets.map(async target => {
  const serverBuild = Bun.spawn({
    cmd: [
      "bun", "build",
      "--compile", SERVER_ENTRY,
      `--target=bun-${target}`,
      `--outfile=${BUILD_DIR}/tactfolio-${target}`,
      "--asset-naming", "[name].[ext]",
      "--root", BUILD_DIR,
      `${BUILD_DIR}/client.bin`],
    stdout: "pipe",
    stderr: "pipe"
  });

  if (await serverBuild.exited !== 0) {
    console.error(`Build Failed for ${target}: `, await Bun.readableStreamToText(serverBuild.stderr));
    process.exit(1);
  }

  console.log(`Build Success for ${target}`);
}));

await clientBin.delete();
