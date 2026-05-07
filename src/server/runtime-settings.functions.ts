import { createServerFn } from "@tanstack/react-start";
import {
  getFeatureFlags,
  getCertificateSettings,
  getStudySettings,
  getPublicRuntimeSnapshot,
  RUNTIME_CONNECTED_KEYS,
} from "./runtime-settings.server";

type JsonVal = string | number | boolean | null | JsonVal[] | { [k: string]: JsonVal };

export const getPublicRuntimeSettings = createServerFn({ method: "GET" }).handler(async () => {
  const [features, study, cert, snapshot] = await Promise.all([
    getFeatureFlags(),
    getStudySettings(),
    getCertificateSettings(),
    getPublicRuntimeSnapshot(),
  ]);
  return {
    features: features as unknown as Record<string, JsonVal>,
    study: study as unknown as Record<string, JsonVal>,
    certificate: cert as unknown as Record<string, JsonVal>,
    snapshot: snapshot as unknown as Record<string, JsonVal>,
    connectedKeys: RUNTIME_CONNECTED_KEYS,
  };
});
