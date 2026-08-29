import { useState } from 'react';

export function useGlobeControls() {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showCurrentVectors, setShowCurrentVectors] = useState<boolean>(true);
  const [showArgoFloats, setShowArgoFloats] = useState<boolean>(true);

  return {
    zoomLevel,
    setZoomLevel,
    autoRotate,
    setAutoRotate,
    showCurrentVectors,
    setShowCurrentVectors,
    showArgoFloats,
    setShowArgoFloats,
  };
}
