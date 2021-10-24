import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router';
import { socketContext } from './context';

function Game(props) {
  const [activePlayer, setActivePlayer] = useState(null);
  const [opponentText, setOpponentText] = useState("Waiting For another to join.")
  const socket = useContext(socketContext);
  const { id } = useParams();
  const [gameState, setGameState] = useState({});
  useEffect(() => {
    let state = props.location.state;
    if (state && state.response && socket) {
      state = state.response;
      if (state && state.roomData && socket.id === state.roomData.nextPlayer) setActivePlayer(true);
      else setActivePlayer(false);
      if (state && state.clientsNumber && state.clientsNumber.length === 2) {
        setOpponentText("Opponent");
      }
      setGameState(state);
    }
    else {
      if (socket) {
        socket.emit("join", id, (response) => {
          if (response.message === "joined room") {
            state = response;
            if (state && state.roomData && socket.id === state.roomData.nextPlayer) setActivePlayer(true);
            else setActivePlayer(false);
            if (state && state.clientsNumber && state.clientsNumber.length === 2) {
              setOpponentText("Opponent");
            }
            setGameState(state);
          } else {
            alert(response);
            props.history.push('/');
          }
        })
      }
    }


  }, [socket])

  useEffect(() => {
    if (socket) {
      socket.on("newPlayerJoin", (data) => {
        if (data !== socket.id) {
          setGameState((gameState) => {
            const newGameState = {...gameState};
            newGameState.roomData.nextLocalBoard = -1
            return newGameState
          })
          setOpponentText("Opponent");
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
          if (globalBoardChange === -1) {
            alert("Draw");
           
          } else if (globalBoardChange === socket.id) {
            alert("You won");
          } else alert("Opponnent won");
          props.history.push('/')
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
          if (globalBoardWin === -1) {
            alert("draw");
          } else {
            alert("You won!");
          }
          props.history.push("/");
        }
        
      }
    });
  }
  return (
    <div>
      <div className="players">
        <div className={"player" + (activePlayer === true ? " currentPlayer" : "")}
        >You</div>
        <div className={"opponentPlayer" + (activePlayer === false ? " currentPlayer" : "")}>{opponentText}</div>
      </div>
      <div className="sources">
        <p>Click to copy</p>
        <p>Share code: <span onClick={() => {navigator.clipboard.writeText(id)}}>{id}</span> </p>
        <p>Share Link: <span onClick={() => {navigator.clipboard.writeText(`https://ultimate-king-tictactoe.herokuapp.com/${id}`)}}>{`https://ultimate-king-tictactoe.herokuapp.com/${id}`}</span> </p>
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
                              (gameState && gameState.roomData && gameState.roomData.declaredLocalBoard[localBaord] ? (gameState.roomData.declaredLocalBoard[localBaord] === -1 ? { backgroundColor: "blue" } : (socket.id === gameState.roomData.declaredLocalBoard[localBaord] ? { "backgroundColor": "blanchedalmond" } : { "backgroundColor": "coral" })) : {})
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
      <div className="rules">
        <p>Rules of Game</p>
        <ul>
        <li> Player play in turn.</li>
        <li> Player who creates room get the first chance to play .</li>
        <li> each small board of 3*3 is called local Baord you can win local Baord by normal tic-tac-toe rule.</li>
        <li> If a local Board is won by someone or does not contain free cell that local Baord becomes block. you can not choose any cell in that local Board.</li>
        <li> Each move by a player sends their Opponent to its relative position. for example if current player played in top left square of local board then Opponent can only choose the cell from top left local board in next turn, if current player played in middle of local board then Opponnent can only choose the cell from middle local board in next turn.</li>
        <li> If Opponent got a local Baord which is blocked (either won by any player or does not contain free cell) then Opponent can choose any cell of any local board which ever is free.</li>
        <li> If the local Board makes same configuration as normal tic-tac-toe means if you win three localBaord in any row , coloumn or diagonal you win!. </li>

        </ul>
      </div>
    </div>
  )
}

export default Game
