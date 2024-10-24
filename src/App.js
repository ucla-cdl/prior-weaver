import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import './App.css';
import routes from './shared/routes';
import Workspace from "./containers/Workspace";
import Logger from "./containers/Logger";

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path={routes.home} element={<Workspace />}></Route>
          <Route path={routes.workspace} element={<Workspace />}></Route>
          <Route path={routes.logger} element={<Logger />}></Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
