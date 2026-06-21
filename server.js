const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 3000;
const MAX_ROOM_SIZE = 2; // this is built for two people on a "direct line"
const MAX_MESSAGE_LEN = 2000;
const MAX_NAME_LEN = 24;
const HISTORY_LIMIT = 300; // messages kept in memory per room, for late joiners in the same session

app.use(express.static(path.join(__dirname, "public")));

// In-memory room state. No database — chat is meant to be ephemeral.
// rooms: Map<roomCode, { users: Map<socketId, {name}>, history: Array<message> }>
const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, { users: new Map(), history: [] });
  }
  return rooms.get(code);
}

function sanitizeText(s, max) {
  return String(s || "").slice(0, max).trim();
}

function roomUserCount(code) {
  const r = rooms.get(code);
  return r ? r.users.size : 0;
}

function cleanupIfEmpty(code) {
  const r = rooms.get(code);
  if (r && r.users.size === 0) {
    rooms.delete(code);
  }
}

io.on("connection", (socket) => {
  let joinedRoom = null;
  let userName = null;

  socket.on("join_room", ({ room, name }, ack) => {
    const code = sanitizeText(room, 40).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const cleanName = sanitizeText(name, MAX_NAME_LEN) || "Guest";

    if (!code) {
      if (ack) ack({ ok: false, error: "Room code can't be empty." });
      return;
    }

    const existing = roomUserCount(code);
    if (existing >= MAX_ROOM_SIZE) {
      if (ack) ack({ ok: false, error: "That room already has two people in it." });
      return;
    }

    joinedRoom = code;
    userName = cleanName;

    const r = getRoom(code);
    r.users.set(socket.id, { name: cleanName });
    socket.join(code);

    if (ack) {
      ack({
        ok: true,
        history: r.history,
        peerCount: r.users.size,
      });
    }

    socket.to(code).emit("peer_joined", { name: cleanName, peerCount: r.users.size });
    io.to(code).emit("presence", { peerCount: r.users.size });
  });

  socket.on("send_message", ({ text }, ack) => {
    if (!joinedRoom) {
      if (ack) ack({ ok: false, error: "Not in a room." });
      return;
    }
    const clean = sanitizeText(text, MAX_MESSAGE_LEN);
    if (!clean) {
      if (ack) ack({ ok: false, error: "Empty message." });
      return;
    }

    const r = getRoom(joinedRoom);
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      from: userName,
      socketId: socket.id,
      text: clean,
      ts: Date.now(),
    };

    r.history.push(message);
    if (r.history.length > HISTORY_LIMIT) {
      r.history = r.history.slice(r.history.length - HISTORY_LIMIT);
    }

    io.to(joinedRoom).emit("new_message", message);
    if (ack) ack({ ok: true, id: message.id });
  });

  socket.on("typing", (isTyping) => {
    if (!joinedRoom) return;
    socket.to(joinedRoom).emit("peer_typing", { name: userName, isTyping: !!isTyping });
  });

  socket.on("disconnect", () => {
    if (!joinedRoom) return;
    const r = rooms.get(joinedRoom);
    if (r) {
      r.users.delete(socket.id);
      const peerCount = r.users.size;
      socket.to(joinedRoom).emit("peer_left", { name: userName, peerCount });
      io.to(joinedRoom).emit("presence", { peerCount });
      cleanupIfEmpty(joinedRoom);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Direct Line chat server running on port ${PORT}`);
});
