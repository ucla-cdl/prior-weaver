import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import './App.css';
import routes from './shared/routes';
import Workspace from "./containers/Workspace";

function App() {
  return (
    <Router>
      <Routes>
        <Route path={routes.workspace} element={<Workspace />}></Route>
      </Routes>
    </Router>
  );
}

export default App;
