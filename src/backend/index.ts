import backtest from "./backtest";

declare const HTML_STRING: string;

const server = Bun.serve({
  port: Bun.env.PORT ?? 3000,
  hostname: Bun.env.HOST ?? "127.0.0.1",
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(HTML_STRING, {
        headers: {
          "Content-Type": "text/html",
        }
      });
    }

    if (server.upgrade(req)) return;
    console.error("Upgrade failed");
    return new Response("Upgrade Required", { status: 426 });
  },
  websocket: {
    async message(ws, message) {
      if (typeof message === "string") {
        await backtest(ws, JSON.parse(message));
      }
      console.log("Backtest done");
      ws.close();
    }
  }
});

console.log(`Server is running on http://${server.hostname}:${server.port}`);

