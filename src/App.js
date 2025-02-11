import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import './App.css';
import routes from './shared/routes';
import Workspace from "./containers/Workspace";
import Logger from "./containers/Logger";
import Home from "./containers/Home";
import Admin from "./containers/Admin";

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path={routes.default} element={<Workspace />}></Route>
          <Route path={routes.home} element={<Home />}></Route>
          <Route path={routes.workspace} element={<Workspace />}></Route>
          <Route path={routes.logger} element={<Logger />}></Route>
          <Route path={routes.admin} element={<Admin />}></Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
