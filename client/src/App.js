import logo from './logo.svg';
import { useEffect, useState } from 'react'
import { socketContext } from './context';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import './App.css';
import Home from './Home';
import Game from './Game';
import { io } from "socket.io-client";

function App(props) {
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const sessionID = localStorage.getItem("sessionID")
    const newSocket = io("http://localhost:8000", {
      auth: {
        sessionID,
      }
    });

    newSocket.on("session", (data) => {
      const { sessionID, userID } = data
      localStorage.setItem("sessionID", sessionID)
      newSocket.userID = userID
      setSocket(newSocket)
    })
    
    setSocket(newSocket);
    return () => newSocket.close();
  }, [setSocket])




  return (
    <socketContext.Provider value={socket}>
      <div className="app">
        <Router>
          <Switch>
            <Route path='/' exact component={Home} />
            <Route path='/:id' component={Game} />
          </Switch>
        </Router>
      </div>
    </socketContext.Provider>
  );
}



export default App;
