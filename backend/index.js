require('dotenv').config()
const { createServer } = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const { InMemorySessionStore } = require("./stores/sessionStore");
const { InMemoryGameStore } = require("./stores/gameStore");
const Game = require("./classes/Game");

const sessionStore = new InMemorySessionStore();
const gameStore = new InMemoryGameStore();
const randomId = () => crypto.randomBytes(8).toString("hex");
const PORT = process.env.PORT || 8000;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.FRONTEND_URL,
  }
});

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      return next();
    }
  }
  socket.sessionID = randomId();
  socket.userID = randomId();
  next();
});


io.on("connection", (socket) => {
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    connected: true,
  });

  // emit session details
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  // join the "userID" room
  socket.join(socket.userID);

  // create new game and join
  socket.on("create", (data, callback) => {
    const game = new Game(socket, callback)
    gameStore.saveGame(game.id, game)
  })

  // join game 
  socket.on("join", (roomId, callback) => {
    var game = gameStore.findGame(roomId)
    if (game) {
      game.join(socket, callback, game)
    } else {
      callback("Looks like you have randomly generated game id please Create new game instead..");
    }

  })

  // listen client move
  socket.on("sendUpdate", (data, callback) => {
    const { cell, roomId } = data;
    // player is in that room
    if (socket.rooms.has(roomId)) {
      const game = gameStore.findGame(roomId)
      game.updateState(socket, callback, cell)
    } else {
      callback("Wrong room");
    }
  })
});

httpServer.listen(PORT, () => console.log("Running.."));