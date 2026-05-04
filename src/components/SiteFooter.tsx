export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-display text-base font-semibold text-foreground">107toFly</div>
            <p className="mt-2 max-w-xs">
              Tu copiloto para aprobar la FAA Part 107. Aprende, practica, repite, vuela.
            </p>
          </div>
          <div>
            <div className="font-medium text-foreground">Producto</div>
            <ul className="mt-2 space-y-1">
              <li>Curso 4 semanas</li>
              <li>Simulador UAG</li>
              <li>FlyCoach AI</li>
              <li>Certificado interno</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-foreground">Legal</div>
            <p className="mt-2 text-xs leading-relaxed">
              107toFly es una plataforma independiente de estudio y preparación. No está
              afiliada, respaldada ni operada por la Federal Aviation Administration.
              Los certificados emitidos son constancias internas y no reemplazan el
              FAA Remote Pilot Certificate, el examen UAG ni el proceso en IACRA.
            </p>
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-xs">
          © {new Date().getFullYear()} 107toFly. Built with care for safer skies.
        </div>
      </div>
    </footer>
  );
}
