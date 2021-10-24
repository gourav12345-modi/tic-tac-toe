import React, { useContext, useState } from 'react'
import { socketContext } from './context';

function Home(props) {
  const socket = useContext(socketContext);
  const [roomId, setRoomId] = useState("");
  const createNewGame = () => {
    if (socket) {
      socket.emit("create", "Hey create a game for me...", (response) => {
        // push to game 
        setRoomId(response.roomData.roomId);
        props.history.push(`/${response.roomData.roomId}`, {response});
      });
    }
  }

  const joinRoom = () => {
    if (socket) {
      socket.emit("join", roomId, (response) => {
        if (response.message === "joined room") {
          props.history.push("/"+roomId, {response});
        } else {
          alert(response);
        }
      })
    }
  }
  
  return (
    <div>

      <div className="home">
    <p>Create a new Game</p>  <button id="btnNewGame" className="button" onClick={createNewGame}>New Game</button>
      <p>or</p> 
     <p>Join room</p>
     <input type="text" onChange={(e) => setRoomId(e.target.value)} placeholder="code" className="textArea" value={roomId}/>
     <button id="btnJoinGame" className="button" onClick={joinRoom}>Join Game</button>
    </div>
    </div>
  )
}

export default Home
