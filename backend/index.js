const { createServer } = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const rooms = {};
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  }
});

io.on("connection", (socket) => {
  // create new game and join
  socket.on("create", (data, callback) => {
    const roomId = uuidv4();
    socket.join(roomId);
    rooms[roomId] = {
      [socket.id]: 'X',
      "clients": [socket.id],
      "nextPlayer": socket.id,
      "nextLocalBoard": 15,
      "globalBoardState": {},
      "declaredLocalBoard": {},
      "roomId": roomId,
    }
    var room = io.sockets.adapter.rooms.get(roomId);
    callback({ "roomData": rooms[roomId], "clientsNumber": [...room], "symbol": "X" });
  })

  // join game 
  socket.on("join", (data, callback) => {
    var room = io.sockets.adapter.rooms.get(data);
    if (room) {
      if (room.size < 2) {
        socket.join(data);
        rooms[data][socket.id] = 'O';
        rooms[data].clients.push(socket.id);
        rooms[data].nextLocalBoard = -1;
        socket.to(data).emit("newPlayerJoin", "Join second");
        callback({ message: "joined room", "clientsNumber": [...room], "roomData": rooms[data], symbol: 'O' });
      } else {
        callback("Hey you can't join the room as it is already filled....")
      }
    } else {
      callback("Looks like you have randomly generated game id please Create new game instead..");
    }

  })

  // listen client move
  socket.on("sendUpdate", (data, callback) => {
    const { cell, roomId } = data;
    // player is in that room
    if (socket.rooms.has(roomId)) {
      const room = rooms[roomId];
      // player is allowed to play in turn
      if (room.nextPlayer === socket.id) {
        // this cell is already occupied
        if (!room.globalBoardState[cell]) {
          // valid cell to play 
          // cell is valid in localboard
          if ((room.nextLocalBoard === -1 && cell >= 0 && cell <= 80) || (cell >= room.nextLocalBoard * 9 && cell <= room.nextLocalBoard * 9 + 8)) {
            // check for local board win move 
            room.globalBoardState[cell] = room[socket.id];
            let declaredLocalBoard = {};
            const playedLocalBoard = Math.floor(cell / 9);
            let isWoned = false;
            // check for coloumn win
            for (let i = 0; i < 3; i++) {
              let temp = true;
              for (let j = 0; j < 3; j++) {

                if (room.globalBoardState[j * 3 + playedLocalBoard * 9 + i] !== room[socket.id]) {
                  temp = false;
                  break;
                }
              }
              if (temp) {
                isWoned = true;
                break;
              }
            }
            // check for row win
            for (let i = 0; i < 3; i++) {
              let temp = true;
              for (let j = 0; j < 3; j++) {
                if (room.globalBoardState[playedLocalBoard * 9 + j + i * 3] !== room[socket.id]) {
                  temp = false;
                  break;
                }
              }
              if (temp) {
                isWoned = true;
                break;
              }
            }
            // check for upper left to lower right
            let diagonal = true;
            for (let i = 0, j = 0; i < 3; i++, j++) {
              if (room.globalBoardState[playedLocalBoard * 9 + i * 3 + j] !== room[socket.id]) {
                diagonal = false;
                break;
              }
            }
            // check for upper right to lower left
            let diagonal2 = true;
            for (let i = 0, j = 2; j >= 0; j--, i++) {
              if (room.globalBoardState[playedLocalBoard * 9 + i * 3 + j] !== room[socket.id]) {
                diagonal2 = false;
                break;
              }
            }
            if (isWoned || diagonal || diagonal2) {
              room.declaredLocalBoard = { ...room.declaredLocalBoard, [playedLocalBoard]: socket.id }
              declaredLocalBoard[playedLocalBoard] = socket.id
            } else {
              // check local board is full 
              let isEmpty = false;
              for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                  if (!room.globalBoardState[playedLocalBoard * 9 + i * 3 + j]) {
                    isEmpty = true;
                    break;
                  }
                }
              }

              if (!isEmpty) {
                room.declaredLocalBoard = { [playedLocalBoard]: -1 }
                declaredLocalBoard[playedLocalBoard] = -1;
              }
            }

            // global board win 
            let globalBoardWin = null;
            // check coloumn wise 
            for(let i=0;i<3;i++) {
              let temp = true;
              for (let j=0;j<3;j++) {
                if (room.declaredLocalBoard[ j*3 + i] !== socket.id) {
                  temp = false;
                  break;
                }
              }

              if (temp) {
                globalBoardWin = socket.id;
                break;
              }
            }

            // check row wise 
            for(let i=0;i<3;i++) {
              let temp = true;
              for (let j=0;j<3;j++) {
                if (room.declaredLocalBoard[ j + i*3] !== socket.id) {
                  temp = false;
                }
              }
              if (temp) {
                globalBoardWin = socket.id;
                break;
              }
            }

            // check upper left to lower right diagonal 
            let winDiagonal1 = true;
            for (let i=0,j=0; j<3; j++, i++) {
              if (room.declaredLocalBoard[ i*3 + j] !== socket.id) {
                winDiagonal1 = false;
                break;
              }
            }

            // check upper right to lower left 
            let winDiagonal2 = true;
            for (let i= 0, j=2; i<3; j--,i++) {
              if (room.declaredLocalBoard[ i*3 + j] !== socket.id) {
                winDiagonal2 = false;
                break;
              }
            }
            if (winDiagonal1 || winDiagonal2) {
              globalBoardWin = socket.id;
            } else {
              // global board is full 
              let isEmpty = false;
              for (let i=0;i<3;i++) {
                for (let j=0;j<3;j++) {
                  if (!room.declaredLocalBoard[i*3 + j]) {
                    isEmpty = true;
                    break;
                  }
                }
              }
              if (!isEmpty) {
                globalBoardWin = -1
              }
            }

            
            callback({message:"Valid", declaredLocalBoard, globalBoardWin});
            // calcualte nextPlayer
            let nextPlayer = "";
            if (room.clients[0] === socket.id) nextPlayer = room.clients[1];
            else nextPlayer = room.clients[0];
            // calculate next local board
            let nextLocalBoard = cell % 9;
            // check calcualted next local board is already not filled up or not won 
            if (room.declaredLocalBoard[nextLocalBoard]) {
              nextLocalBoard = -1;
            }
            // add move and state change in globalboardState

            room.nextPlayer = nextPlayer;
            room.nextLocalBoard = nextLocalBoard;
            socket.to(roomId).emit("getUpdate", { globalBoardChange: [{ [cell]: room[socket.id] }], nextLocalBoard, declaredLocalBoard, globalBoardWin, nextPlayer })
          } else {
            callback("Invalid cell other than out of local board range");
          }
        } else {
          callback("This cell is already filled")
        }
      } else {
        callback("Not Your turn");
      }
    } else {
      callback("Wrong room");
    }
  })
});

httpServer.listen(PORT);