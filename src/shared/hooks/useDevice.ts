import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const getDeviceType = (width: number): DeviceType => {
  if (width < 768) { // Corresponds to Tailwind's 'md' breakpoint
    return 'mobile';
  }
  if (width < 1024) { // Corresponds to Tailwind's 'lg' breakpoint
    return 'tablet';
  }
  return 'desktop';
};

export const useDevice = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => getDeviceType(window.innerWidth));

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
};
