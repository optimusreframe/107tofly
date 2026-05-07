import { createServerFn } from "@tanstack/react-start";
import {
  getFeatureFlags,
  getCertificateSettings,
  getStudySettings,
  getPublicRuntimeSnapshot,
  RUNTIME_CONNECTED_KEYS,
} from "./runtime-settings.server";

export const getPublicRuntimeSettings = createServerFn({ method: "GET" }).handler(async () => {
  const [features, study, cert, snapshot] = await Promise.all([
    getFeatureFlags(),
    getStudySettings(),
    getCertificateSettings(),
    getPublicRuntimeSnapshot(),
  ]);
  return {
    features,
    study,
    certificate: cert,
    snapshot,
    connectedKeys: RUNTIME_CONNECTED_KEYS,
  };
});
