import React from 'react'
import "./rules.css"

function Rules() {
  return (
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
  )
}

export default Rules