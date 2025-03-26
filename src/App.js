import { Routes, Route, HashRouter } from "react-router-dom";
import './App.css';
import routes from './shared/routes';
import Workspace from "./containers/Workspace";
import Logger from "./containers/Logger";
import Home from "./containers/Home";
import Admin from "./containers/Admin";
import Doc from "./containers/Doc";

import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { VariableProvider } from "./contexts/VariableContext";
import { EntityProvider } from "./contexts/EntityContext";
import { SelectionProvider } from "./contexts/SelectionContext";

function App() {
  return (
    <HashRouter>
      <WorkspaceProvider>
        <VariableProvider>
          <EntityProvider>
          <SelectionProvider>
              <div className="App">
                  <Routes>
                    <Route path={routes.home} element={<Home />}></Route>
                    <Route path={routes.workspace} element={<Workspace />}></Route>
                    <Route path={routes.logger} element={<Logger />}></Route>
                    <Route path={routes.admin} element={<Admin />}></Route>
                    <Route path={routes.doc} element={<Doc />}></Route>
                  </Routes>
              </div>
          </SelectionProvider>
        </EntityProvider>
      </VariableProvider>
    </WorkspaceProvider>
    </HashRouter>
  );
}

export default App;
