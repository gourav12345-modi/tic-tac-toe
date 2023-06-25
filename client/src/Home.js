import React, { useContext, useState } from 'react'
import { socketContext } from './context';
import Rules from './components/Rules';

function Home(props) {
  const socket = useContext(socketContext);
  const [roomId, setRoomId] = useState("");
  const createNewGame = () => {
    if (socket) {
      socket.emit("create", "Hey create a game for me...", (response) => {
        setRoomId(response.roomData.roomId);
        props.history.push(`/${response.roomData.roomId}`, { response });
      });
    }
  }

  const joinRoom = () => {
    if (socket) {
      socket.emit("join", roomId, (response) => {
        if (response.message === "joined room") {
          props.history.push("/" + roomId, { response });
        } else {
          alert(response);
        }
      })
    }
  }

  return (
    <>
    <div className="homePage">
      <h1 className="introHeading">Welcome to <span>Ultimate Tic-Tac-Toe</span> </h1>
      <div className="home">
        <p>Create a new Game</p>  <button id="btnNewGame" className="button" onClick={createNewGame}>New Game</button>
        <p>or</p>
        <p>Join room</p>
        <input type="text" onChange={(e) => setRoomId(e.target.value)} placeholder="code" className="textArea" value={roomId} />
        <button id="btnJoinGame" className="button" onClick={joinRoom}>Join Game</button>
      </div>
    </div>
      <Rules />
    </>

  )
}

export default Home
