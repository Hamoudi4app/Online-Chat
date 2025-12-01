// signaling-server.js
const http = require("http");
const { WebSocketServer } = require("ws");

const server = http.createServer();
const wss = new WebSocketServer({ server });
const rooms = new Map(); // code -> Set(ws)

wss.on("connection", (ws) => {
  let code = null;

  ws.on("message", (raw) => {
    let msg = {};
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "join") {
      code = msg.code;
      if (!code) { ws.send(JSON.stringify({ type: "error", msg: "لا يوجد كود غرفة" })); return; }
      if (!rooms.has(code)) rooms.set(code, new Set());
      rooms.get(code).add(ws);
      ws.send(JSON.stringify({ type: "joined", code }));

      // أخطر الموجودين أن طرف جديد دخل
      rooms.get(code).forEach(s => {
        if (s !== ws) s.send(JSON.stringify({ type:"joinedNotice", msg:"✅ طرف آخر انضم للجلسة" }));
      });
    }

    if (msg.type === "signal" && code) {
      rooms.get(code)?.forEach(s => {
        if (s !== ws) s.send(JSON.stringify({ type: "signal", payload: msg.payload }));
      });
    }
  });

  ws.on("close", () => {
    if (code && rooms.has(code)) {
      rooms.get(code).delete(ws);
      if (rooms.get(code).size === 0) rooms.delete(code);
    }
  });
});

server.listen(8080, () => console.log("Signaling server on ws://0.0.0.0:8080"));
