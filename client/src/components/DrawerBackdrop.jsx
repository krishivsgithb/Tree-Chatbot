import { useUI } from '../hooks/useUI';

function DrawerBackdrop() {
  const { drawerOpen, closeDrawer } = useUI();
  return <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={closeDrawer} />;
}

export default DrawerBackdrop;