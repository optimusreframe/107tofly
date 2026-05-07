import { useEffect, useState } from "react";

export type DeviceMode = "desktop" | "tablet" | "mobile";

export interface DeviceState {
  mode: DeviceMode;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isTouch: boolean;
  orientation: "portrait" | "landscape";
  prefersReducedMotion: boolean;
}

function read(): DeviceState {
  if (typeof window === "undefined") {
    return {
      mode: "desktop",
      isDesktop: true,
      isTablet: false,
      isMobile: false,
      isTouch: false,
      orientation: "landscape",
      prefersReducedMotion: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const mode: DeviceMode = w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  const isTouch =
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
  return {
    mode,
    isDesktop: mode === "desktop",
    isTablet: mode === "tablet",
    isMobile: mode === "mobile",
    isTouch,
    orientation: h >= w ? "portrait" : "landscape",
    prefersReducedMotion:
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  };
}

export function useDeviceMode(): DeviceState {
  const [state, setState] = useState<DeviceState>(() => read());
  useEffect(() => {
    const update = () => setState(read());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener?.("change", update);
    update();
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      mq.removeEventListener?.("change", update);
    };
  }, []);
  return state;
}
