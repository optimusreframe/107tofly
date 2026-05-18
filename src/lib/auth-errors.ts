import i18n from "@/i18n";

/**
 * Map raw Supabase auth error messages to localized i18n keys.
 * Falls back to a generic message when no specific mapping matches.
 */
export function mapAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const msg = raw.toLowerCase();
  const t = i18n.t.bind(i18n);

  if (!raw) return t("auth.errors.generic");
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return t("auth.errors.invalidCredentials");
  }
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return t("auth.errors.emailNotConfirmed");
  }
  if (msg.includes("already registered") || msg.includes("user already")) {
    return t("auth.errors.userExists");
  }
  if (msg.includes("password should be at least") || msg.includes("weak password") || msg.includes("password is too short")) {
    return t("auth.errors.weakPassword");
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return t("auth.errors.rateLimit");
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return t("auth.errors.network");
  }
  if (msg.includes("invalid email") || msg.includes("email address is invalid")) {
    return t("auth.errors.invalidEmail");
  }
  if (msg.includes("token has expired") || msg.includes("expired") || msg.includes("invalid token")) {
    return t("auth.errors.tokenExpired");
  }
  return t("auth.errors.generic");
}
