import express from "express";
import net from "net";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

const PORT = Number(process.env.LOCAL_PRINTER_BRIDGE_PORT || 17354);

const sendToNetworkPrinter = (host, port, content) =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      const feedCommand = "\x1Bd\x05";
      const cutCommand = "\x1dV\x00";
      socket.write(content, "latin1");
      socket.write(feedCommand, "binary");
      socket.write(cutCommand, "binary");
      socket.end();
    });
    socket.setTimeout(7000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Printer connection timed out"));
    });
    socket.on("error", (error) => reject(error));
    socket.on("close", () => resolve());
  });

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/print-raw", async (req, res) => {
  try {
    const host = String(req.body?.host || "").trim();
    const port = Number(req.body?.port || 9100);
    const content = String(req.body?.content || "");
    if (!host) {
      return res.status(400).json({ message: "host is required" });
    }
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      return res.status(400).json({ message: "port is invalid" });
    }
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }
    await sendToNetworkPrinter(host, port, content);
    return res.json({ status: "printed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Local print bridge failed";
    return res.status(500).json({ message });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[local-printer-bridge] listening on http://127.0.0.1:${PORT}`);
});
