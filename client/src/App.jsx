import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import KeyModal from './components/KeyModal';
import Canvas from './components/Canvas';
import ContextMenu from './components/ContextMenu';
import Toasts from './components/Toasts';
import DrawerBackdrop from './components/DrawerBackdrop';
import WorkspaceDeleteConfirm from './components/WorkspaceDeleteConfirm';
import { SettingsProvider } from './context/SettingsProvider';
import { UIProvider } from './context/UIProvider';
import { WorkspaceProvider } from './context/WorkspaceProvider';

function App() {
  return (
    <SettingsProvider>
      <UIProvider>
        <WorkspaceProvider>
          <div className="app">
            <Sidebar />
            <div className="main">
              <TopBar />
              <main className="canvas-area">
                <Canvas />
              </main>
            </div>
          </div>
          <DrawerBackdrop />
          <KeyModal />
          <WorkspaceDeleteConfirm />
          <ContextMenu />
          <Toasts />
        </WorkspaceProvider>
      </UIProvider>
    </SettingsProvider>
  );
}

export default App;