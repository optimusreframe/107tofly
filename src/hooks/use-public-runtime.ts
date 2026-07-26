import { useEffect, useState } from "react";
import { getPublicRuntimeSettings } from "@/lib/runtime-settings.functions";

export type PublicRuntime = Awaited<ReturnType<typeof getPublicRuntimeSettings>>;

let cached: PublicRuntime | null = null;
let inflight: Promise<PublicRuntime> | null = null;

export async function loadPublicRuntime(): Promise<PublicRuntime> {
  if (cached) return cached;
  if (!inflight) {
    inflight = getPublicRuntimeSettings().then((r) => {
      cached = r;
      inflight = null;
      return r;
    }).catch((e) => {
      inflight = null;
      throw e;
    });
  }
  return inflight;
}

export function usePublicRuntime() {
  const [data, setData] = useState<PublicRuntime | null>(cached);
  useEffect(() => {
    let alive = true;
    loadPublicRuntime().then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return data;
}
