import type { ReactNode } from "react";
import { useDeviceMode, type DeviceState } from "@/hooks/use-device-mode";

interface Props {
  desktop?: ReactNode;
  tablet?: ReactNode;
  mobile?: ReactNode;
  children?: (d: DeviceState) => ReactNode;
}

/**
 * Reusable device-adaptive renderer. Either pass per-device slots or a
 * function-as-children that receives the full device state.
 */
export function DeviceAdaptiveLayout({ desktop, tablet, mobile, children }: Props) {
  const device = useDeviceMode();
  if (children) return <>{children(device)}</>;
  if (device.isMobile) return <>{mobile ?? tablet ?? desktop}</>;
  if (device.isTablet) return <>{tablet ?? desktop ?? mobile}</>;
  return <>{desktop ?? tablet ?? mobile}</>;
}
