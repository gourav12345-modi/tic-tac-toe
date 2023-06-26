
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

class Game {
    constructor(socket, callback) {
        const id = randomId();
        socket.join(id);

        this.id = id
        this.signs = {
            [socket.userID]: 'X'
        }
        this.clients = [socket.userID]
        this.nextPlayer = socket.userID
        this.nextLocalBoard = 15
        this.globalBoardState = {}
        this.declaredLocalBoard = {}
        callback(id);
        return this;
    }
    
    join(socket, callback) {
        if (this.clients.includes(socket.userID)) {
            socket.join(this.id)
            socket.to(this.id).emit("newPlayerJoin", {roomData: this});
            callback({ message: "joined room", "roomData": this, symbol: this.signs[socket.userID] });
          }
          else if (this.clients.length < 2) {
            socket.join(this.id);
            this.signs = {...this.signs, [socket.userID]:'O'}
            this.clients.push(socket.userID);
            this.nextLocalBoard = -1;
            socket.to(this.id).emit("newPlayerJoin", {roomData: this});
            callback({ message: "joined room", "roomData": this, symbol: 'O' });
          } else {
            callback("Hey you can't join the room as it is already filled....")
          }
    }

    updateState(socket, callback, cell) {
        // player is allowed to play in turn
      if (this.nextPlayer === socket.userID) {
        // this cell is already occupied
        if (!this.globalBoardState[cell]) {
          // valid cell to play 
          // cell is valid in localboard
          if ((this.nextLocalBoard === -1 && cell >= 0 && cell <= 80) || (cell >= this.nextLocalBoard * 9 && cell <= this.nextLocalBoard * 9 + 8)) {
            // check for local board win move 
            this.globalBoardState[cell] = this.signs[socket.userID];
            let declaredLocalBoard = {};
            const playedLocalBoard = Math.floor(cell / 9);
            let isWoned = false;
            // check for coloumn win
            for (let i = 0; i < 3; i++) {
              let temp = true;
              for (let j = 0; j < 3; j++) {

                if (this.globalBoardState[j * 3 + playedLocalBoard * 9 + i] !== this.signs[socket.userID]) {
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
                if (this.globalBoardState[playedLocalBoard * 9 + j + i * 3] !== this.signs[socket.userID]) {
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
              if (this.globalBoardState[playedLocalBoard * 9 + i * 3 + j] !== this.signs[socket.userID]) {
                diagonal = false;
                break;
              }
            }
            // check for upper right to lower left
            let diagonal2 = true;
            for (let i = 0, j = 2; j >= 0; j--, i++) {
              if (this.globalBoardState[playedLocalBoard * 9 + i * 3 + j] !== this.signs[socket.userID]) {
                diagonal2 = false;
                break;
              }
            }
            if (isWoned || diagonal || diagonal2) {
              this.declaredLocalBoard = { ...this.declaredLocalBoard, [playedLocalBoard]: socket.userID }
              declaredLocalBoard[playedLocalBoard] = socket.userID
            } else {
              // check local board is full 
              let isEmpty = false;
              for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                  if (!this.globalBoardState[playedLocalBoard * 9 + i * 3 + j]) {
                    isEmpty = true;
                    break;
                  }
                }
              }

              if (!isEmpty) {
                this.declaredLocalBoard = { [playedLocalBoard]: -1 }
                declaredLocalBoard[playedLocalBoard] = -1;
              }
            }

            // global board win 
            let globalBoardWin = null;
            // check coloumn wise 
            for (let i = 0; i < 3; i++) {
              let temp = true;
              for (let j = 0; j < 3; j++) {
                if (this.declaredLocalBoard[j * 3 + i] !== socket.userID) {
                  temp = false;
                  break;
                }
              }

              if (temp) {
                globalBoardWin = socket.userID;
                break;
              }
            }

            // check row wise 
            for (let i = 0; i < 3; i++) {
              let temp = true;
              for (let j = 0; j < 3; j++) {
                if (this.declaredLocalBoard[j + i * 3] !== socket.userID) {
                  temp = false;
                }
              }
              if (temp) {
                globalBoardWin = socket.userID;
                break;
              }
            }

            // check upper left to lower right diagonal 
            let winDiagonal1 = true;
            for (let i = 0, j = 0; j < 3; j++, i++) {
              if (this.declaredLocalBoard[i * 3 + j] !== socket.userID) {
                winDiagonal1 = false;
                break;
              }
            }

            // check upper right to lower left 
            let winDiagonal2 = true;
            for (let i = 0, j = 2; i < 3; j--, i++) {
              if (this.declaredLocalBoard[i * 3 + j] !== socket.userID) {
                winDiagonal2 = false;
                break;
              }
            }
            if (winDiagonal1 || winDiagonal2) {
              globalBoardWin = socket.userID;
            } else {
              // global board is full 
              let isEmpty = false;
              for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                  if (!this.declaredLocalBoard[i * 3 + j]) {
                    isEmpty = true;
                    break;
                  }
                }
              }
              if (!isEmpty) {
                globalBoardWin = -1
              }
            }


            callback({ message: "Valid", declaredLocalBoard, globalBoardWin });
            // calcualte nextPlayer
            let nextPlayer = "";
            if (this.clients[0] === socket.userID) nextPlayer = this.clients[1];
            else nextPlayer = this.clients[0];
            // calculate next local board
            let nextLocalBoard = cell % 9;
            // check calcualted next local board is already not filled up or not won 
            if (this.declaredLocalBoard[nextLocalBoard]) {
              nextLocalBoard = -1;
            }
            // add move and state change in globalboardState
            
            if(globalBoardWin) {
              nextPlayer = -1;
              nextLocalBoard = 15;
            }

            this.nextPlayer = nextPlayer;
            this.nextLocalBoard = nextLocalBoard;

            
            socket.to(this.id).emit("getUpdate", { globalBoardChange: [{ [cell]: this.signs[socket.userID] }], nextLocalBoard, declaredLocalBoard, globalBoardWin, nextPlayer })
          } else {
            callback("Invalid cell other than out of local board range");
          }
        } else {
          callback("This cell is already filled")
        }
      } else {
        callback("Not Your turn");
      }
    }
}

module.exports = Game