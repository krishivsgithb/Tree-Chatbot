import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import KeyModal from './components/KeyModal';
import Canvas from './components/Canvas';
import ContextMenu from './components/ContextMenu';
import Toasts from './components/Toasts';
import WorkspaceDeleteConfirm from './components/WorkspaceDeleteConfirm';
import { SettingsProvider } from './context/SettingsProvider';
import { WorkspaceProvider } from './context/WorkspaceProvider';

function App() {
  return (
    <SettingsProvider>
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
        <KeyModal />
        <WorkspaceDeleteConfirm />
        <ContextMenu />
        <Toasts />
      </WorkspaceProvider>
    </SettingsProvider>
  );
}

export default App;