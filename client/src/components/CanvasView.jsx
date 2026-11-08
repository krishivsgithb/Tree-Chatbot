import CanvasFlow from './CanvasFlow';
import MobileCanvas from './MobileCanvas';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';

function CanvasView() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return isMobile ? <MobileCanvas /> : <CanvasFlow />;
}

export default CanvasView;