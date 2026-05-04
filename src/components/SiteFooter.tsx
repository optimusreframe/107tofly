import { useTranslation } from "react-i18next";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-display text-base font-semibold text-foreground">107toFly</div>
            <p className="mt-2 max-w-xs">{t("footer.tagline")}</p>
          </div>
          <div>
            <div className="font-medium text-foreground">{t("footer.product")}</div>
            <ul className="mt-2 space-y-1">
              <li>{t("nav.course")}</li>
              <li>{t("nav.simulator")}</li>
              <li>FlyCoach AI</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-foreground">{t("footer.legal")}</div>
            <p className="mt-2 text-xs leading-relaxed">{t("footer.disclaimer")}</p>
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-xs">
          © {new Date().getFullYear()} 107toFly. Built with care for safer skies.
        </div>
      </div>
    </footer>
  );
}
