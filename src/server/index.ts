import { extname } from "node:path";
import vfs from "./vfs";
import open from "open";


const server = Bun.serve({
  routes: {
    "/api": Response.json({ message: "Not Implemented" }, { status: 501 }),
    "/api/*": Response.json({ message: "Not Implemented" }, { status: 501 }),
    "/*": req => {
      const pathname = decodeURIComponent(new URL(req.url).pathname);
      const path = extname(pathname) === "" ? pathname + "/index.html" : pathname;
      console.log(`Request: ${pathname}`);
      const [raw, type] = vfs[`./${path}`] ?? [null, null];
      if (raw) {
        console.log(`200 OK: ${path}`);
        return new Response(raw, { headers: { 'Content-Type': type } });
      }
      else {
        console.error(`404 Not Found: ${path}`);
        return Response.json({ message: "Not Found" }, { status: 404 });
      }
    }
  },
  hostname: "127.0.0.1"
});

console.log(`Server is running at ${server.hostname}:${server.port ?? 3000}`);

await open("http://127.0.0.1:3000/");
