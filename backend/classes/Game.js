
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
        // if the current player was playing in this room before then join the room only
        if (this.clients.includes(socket.userID)) {
            socket.join(this.id)
            socket.to(this.id).emit("newPlayerJoin", { roomData: this });
            callback({ message: "joined room", "roomData": this, symbol: this.signs[socket.userID] });
        }
        // if there are less than 2 players in the room then join the room
        else if (this.clients.length < 2) {
            socket.join(this.id);
            this.signs = { ...this.signs, [socket.userID]: 'O' }
            this.clients.push(socket.userID);
            this.nextLocalBoard = -1;
            socket.to(this.id).emit("newPlayerJoin", { roomData: this });
            callback({ message: "joined room", "roomData": this, symbol: 'O' });
        } else {
            callback("Hey you can't join the room as it is already filled....")
        }
    }

    isColumnMatch(board, sign, localBoardNumber) {
        for (let j = 0; j < 3; j++) {
            // checking jth column
            if (board[j+localBoardNumber*9] === sign && board[j+3+ localBoardNumber*9] === sign && board[j+6+ localBoardNumber*9] === sign) {
                return true;
            }
        }
        return false;
    }

    isRowMatched(board, sign, localBoardNumber) {
        for (let i = 0; i < 3; i++) {
            // checking ith row
            if (board[i*3+localBoardNumber*9] === sign && board[i*3+1+localBoardNumber*9] === sign && board[i*3+2+localBoardNumber*9] === sign) {
                return true;
            }
        }
        return false;
    }

    isDiagonalMatch(board, sign, localBoardNumber) {
        let isWoned = true;
        // checking upper left to lower right diagonal
        for (let i = 0; i < 3; i++) {
            if (board[i*4+localBoardNumber*9] !== sign) {
                isWoned = false;
                break;
            }
        }
        if (!isWoned) {
            isWoned = true;
            // checking upper right to lower left diagonal
            for (let i = 0; i < 3; i++) {
                if (board[i*2+2+localBoardNumber*9] !== sign) {
                    isWoned = false;
                    break;
                }
            }
        }
        return isWoned;
    }

    isBoardFull(board, localBoardNumber) {
        let isFull = true 
        for (let i = 0; i < 9; i++) {
            if (!board[i+localBoardNumber*9]) {
                isFull = false;
                break;
            }
        }
        return isFull;
    }

    updateState(socket, callback, cell) {

        // check if player is not allowed to play in this turn
        if (this.nextPlayer !== socket.userID) return callback("Not your turn");
        //   check if cell is already occupied
        if (this.globalBoardState[cell]) return callback("Cell already occupied");
        // check if played cell is not valid
        if ((this.nextLocalBoard === -1 && (cell < 0 || cell > 80)) || (this.nextLocalBoard != -1 && (cell < this.nextLocalBoard * 9 || cell > this.nextLocalBoard * 9 + 8))) return callback("Invalid cell other than out of local board range");

        // accept the move
        this.globalBoardState[cell] = this.signs[socket.userID];
        
        // check for local board win move 
        let declaredLocalBoard = {};
        const playedLocalBoard = Math.floor(cell / 9);

        // check for coloumn win
        const isColoumnWoned = this.isColumnMatch(this.globalBoardState, this.signs[socket.userID], playedLocalBoard);

        // check for row win
        const isRowWoned = this.isRowMatched(this.globalBoardState, this.signs[socket.userID], playedLocalBoard);

        // check for diagonal win
        const isDiagonalWoned = this.isDiagonalMatch(this.globalBoardState, this.signs[socket.userID], playedLocalBoard);

        if (isColoumnWoned || isRowWoned || isDiagonalWoned) {
            this.declaredLocalBoard = { ...this.declaredLocalBoard, [playedLocalBoard]: socket.userID }
            declaredLocalBoard[playedLocalBoard] = socket.userID
        } else {
            // check local board is full 
            if (this.isBoardFull(this.globalBoardState, playedLocalBoard)) {
                this.declaredLocalBoard = { ...this.declaredLocalBoard, [playedLocalBoard]: -1 }
                declaredLocalBoard[playedLocalBoard] = -1;
            }
        }

        // global board win 
        let globalBoardWin = null;

        // check coloumn wise win
        const isGlobalColoumnWoned = this.isColumnMatch(this.declaredLocalBoard, socket.userID, 0);
        // check row wise win
        const isGlobalRowWoned = this.isRowMatched(this.declaredLocalBoard, socket.userID, 0);
        // check diagonal wise win
        const isGlobalDiagonalWoned = this.isDiagonalMatch(this.declaredLocalBoard, socket.userID, 0);

        if (isGlobalColoumnWoned || isGlobalRowWoned || isGlobalDiagonalWoned) {
            globalBoardWin = socket.userID;
        } else {
            if (this.isBoardFull(this.declaredLocalBoard, 0)) {
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
       
        // stop the game if global board is won/ filled up
        if (globalBoardWin) {
            nextPlayer = -1;
            nextLocalBoard = 15;
        }

        // update next player and next local board in game state
        this.nextPlayer = nextPlayer;
        this.nextLocalBoard = nextLocalBoard;


        socket.to(this.id).emit("getUpdate", { globalBoardChange: [{ [cell]: this.signs[socket.userID] }], nextLocalBoard, declaredLocalBoard, globalBoardWin, nextPlayer })
    }
}

module.exports = Game