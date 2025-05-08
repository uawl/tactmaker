import path from "node:path";
import { ZstdInit } from "@oneidentity/zstd-js/wasm/decompress";

const rawFile = Bun.embeddedFiles.find((v:any) => v.name === "client.bin");

if (!rawFile) {
  console.error("Client Was Not Bundled!");
  process.exit(1);
}

const { ZstdSimple } = await ZstdInit();

const rawJson = Buffer.from(ZstdSimple.decompress(await rawFile.bytes())).toString('utf-8');
const rawvfs: Record<string, [Uint8Array, string]> = Object.fromEntries(
  Object.entries(JSON.parse(rawJson)).map(([k, [v, type]]: any) => [k, [Uint8Array.fromBase64(v), type]])
);

export default new Proxy(rawvfs, {
  get: (target, name) => {
    return target[path.normalize(name.toString())];
  }
});
