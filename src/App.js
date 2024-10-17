import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import './App.css';
import routes from './shared/routes';
import Workspace from "./containers/Workspace";

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path={routes.home} element={<Workspace />}></Route>
          <Route path={routes.workspace} element={<Workspace />}></Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
