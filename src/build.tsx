import renderToString from "preact-render-to-string";
import { App } from "./frontend";

const tsxFile = Bun.file("src/index.tsx");

const tsx = `
import { hydrate } from "preact";
import { App } from "./frontend";

hydrate(<App />, document.body);
`;

await tsxFile.write(tsx);

const res = await Bun.build({
  entrypoints: ["src/index.tsx"],
  splitting: false,
  target: "browser"
});

tsxFile.delete();

if (!res.success) {
  console.error(res.logs);
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tactmaker</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${renderToString(<App />)}
  <script src="data:application/javascript;base64,${Buffer.from(
    await res.outputs[0]!.text()
  ).toString("base64")}"></script>
</body>
</html>`;

const res2 = await Bun.build({
  entrypoints: ["src/backend/index.ts"],
  define: { HTML_STRING: JSON.stringify(html) },
  target: "bun",
  splitting: false,
  outdir: "dist"
});

if (!res2.success) {
  console.error(res2.logs);
  process.exit(1);
}
