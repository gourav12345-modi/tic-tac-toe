import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router';
import { socketContext } from './context';
import Rules from './components/Rules';

function Game(props) {
  const [activePlayer, setActivePlayer] = useState(null);
  const [opponentText, setOpponentText] = useState("Waiting For another to join.")
  const socket = useContext(socketContext);
  const { id } = useParams();
  const [gameState, setGameState] = useState({});
  useEffect(() => {
    // let state = props.location.state;
    // console.log(props.location)
    // if (state && state.response && socket) {
    //   state = state.response;
    //   if (state && state.roomData && socket.id === state.roomData.nextPlayer) setActivePlayer(true);
    //   else setActivePlayer(false);
    //   if (state && state.roomData && state.roomData.clients.length === 2) {
    //     setOpponentText("Opponent");
    //   }
    //   setGameState(state);
    // }
    // else {
    if (socket) {
      socket.emit("join", id, (response) => {
        console.log("ROOM JOINED!!!!!!!!!!!!!!!!!!!!!!!")
        if (response.message === "joined room") {
          const state = response;
          if (state && state.roomData && socket.userID === state.roomData.nextPlayer) setActivePlayer(true);
          else setActivePlayer(false);
          if (state && state.roomData && state.roomData.clients.length === 2) {
            setOpponentText("Opponent");
          }
          setGameState(state);
        } else {
          alert(response);
          props.history.push('/');
        }
      })
      // }
    }


  }, [socket])

  useEffect(() => {
    if (socket) {
      socket.on("newPlayerJoin", (data) => {
        console.log("newPlayer ", data)
        const roomData = data.roomData
        if (data !== roomData.userID) {
          setGameState((gameState) => {
            const newGameState = { ...gameState };
            newGameState.roomData = roomData
            return newGameState
          })
          if (roomData.clients.length >= 2) {
            setOpponentText("Opponent");
          }
        }
      });
      socket.on("getUpdate", (data) => {
        const { globalBoardChange, nextLocalBoard, nextPlayer, declaredLocalBoard, globalBoardWin } = data;
        setGameState((gameState) => {
          const newGameState = { ...gameState };
          newGameState.roomData.nextPlayer = nextPlayer;
          newGameState.roomData.nextLocalBoard = nextLocalBoard;
          newGameState.roomData.declaredLocalBoard = { ...newGameState.roomData.declaredLocalBoard, ...declaredLocalBoard }
          for (const key of Object.keys(globalBoardChange[0])) {
            newGameState.roomData.globalBoardState[key] = globalBoardChange[0][parseInt(key)]
          }
          return newGameState;
        })
        setActivePlayer((activePlayer) => !activePlayer);
        if (globalBoardWin !== null) {
          setTimeout(() => {
            if (globalBoardChange === -1) {
              alert("Draw");
            } else if (globalBoardChange === socket.userID) {
              alert("You won");
            } else alert("Opponnent won");
            props.history.push('/')
          }, 5000)
        }


      })
    }
  }, [socket])

  const handleClick = (e, data) => {
    e.preventDefault();
    socket.emit("sendUpdate", { "cell": data, "roomId": gameState.roomData.roomId }, (response) => {
      if (response.message === "Valid") {
        setGameState({ ...gameState, roomData: { ...gameState.roomData, globalBoardState: { ...gameState.roomData.globalBoardState, [data]: gameState.symbol }, declaredLocalBoard: { ...gameState.roomData.declaredLocalBoard, ...response.declaredLocalBoard } } })
        setActivePlayer(!activePlayer);
        const { globalBoardWin } = response;
        if (globalBoardWin !== null) {
          setTimeout(() => {
            if (globalBoardWin === -1) {
              alert("draw");
            } else {
              alert("You won!");
            }
            props.history.push("/");
          }, 5000)
        }

      }
    });
  }
  return (
    <>
      <div>
        <div className="players">
          <div className={"player" + (activePlayer === true ? " currentPlayer" : "")}
          >You</div>
          <div className={"opponentPlayer" + (activePlayer === false ? " currentPlayer" : "")}>{opponentText}</div>
        </div>
        <div className="sources">
          <p>Click to copy</p>
          <p>Share code: <span onClick={() => { navigator.clipboard.writeText(id) }}>{id}</span> </p>
          <p>Share Link: <span onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${id}`) }}>{`${window.location.origin}/${id}`}</span> </p>
        </div>
        <div className="globalBoard" style={{ marginLeft: 'auto', marginRight: 'auto', display: 'block' }}>
          {
            [...Array(9)].map((numb, localBaord) => {
              return (

                <React.Fragment key={localBaord}>
                  {
                    (localBaord % 3 === 0 && localBaord !== 0) && (<br />)
                  }
                  <div className="localBoard" >
                    {
                      [...Array(9)].map((_, cell) => {
                        return (
                          <React.Fragment key={cell}>
                            {
                              (cell % 3 === 0 && cell !== 0) && (<br />)
                            }
                            <button
                              onClick={(e) => handleClick(e, localBaord * 9 + cell)}
                              className="btnSelect"
                              style={
                                (gameState && gameState.roomData && gameState.roomData.declaredLocalBoard[localBaord] ? (gameState.roomData.declaredLocalBoard[localBaord] === -1 ? { backgroundColor: "blue" } : (socket.userID === gameState.roomData.declaredLocalBoard[localBaord] ? { "backgroundColor": "blanchedalmond" } : { "backgroundColor": "coral" })) : {})
                              }
                              disabled={
                                activePlayer ? !(gameState && gameState.roomData && (!gameState.roomData.globalBoardState[localBaord * 9 + cell]) && (!gameState.roomData.declaredLocalBoard[localBaord]) && (gameState.roomData.nextLocalBoard === -1 || gameState.roomData.nextLocalBoard === localBaord)) : true
                              }>{
                                gameState && gameState.roomData && gameState.roomData.globalBoardState[localBaord * 9 + cell] ?
                                  (gameState.roomData.globalBoardState[localBaord * 9 + cell]) :
                                  null
                              }</button>
                          </React.Fragment>
                        )
                      })
                    }
                  </div>
                </React.Fragment>
              )
            })
          }
        </div>
      </div>
      <Rules />
    </>

  )
}

export default Game
