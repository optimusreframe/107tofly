import { useEffect, useState } from "react";

type OttoMood = "idle" | "happy" | "sad" | "thinking" | "cheer";

export function Otto({ mood = "idle", size = 96, label }: { mood?: OttoMood; size?: number; label?: string }) {
  // Bob animation via CSS keyframes injected once.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("otto-kf")) return;
    const s = document.createElement("style");
    s.id = "otto-kf";
    s.textContent = `
      @keyframes otto-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
      @keyframes otto-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      @keyframes otto-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
      @keyframes otto-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1)} }
    `;
    document.head.appendChild(s);
  }, []);

  const [pop, setPop] = useState(false);
  useEffect(() => { setPop(true); const t = setTimeout(() => setPop(false), 400); return () => clearTimeout(t); }, [mood]);

  const bob = mood === "sad" ? "otto-shake 0.35s ease-in-out" : "otto-bob 2.4s ease-in-out infinite";
  const eyeY = mood === "sad" ? 30 : mood === "happy" || mood === "cheer" ? 26 : 28;
  const mouth =
    mood === "happy" || mood === "cheer" ? "M18 36 Q24 42 30 36" :
    mood === "sad" ? "M18 40 Q24 34 30 40" :
    mood === "thinking" ? "M18 38 L30 38" :
    "M18 38 Q24 40 30 38";
  const accent =
    mood === "happy" || mood === "cheer" ? "hsl(var(--primary))" :
    mood === "sad" ? "hsl(var(--destructive))" :
    "hsl(var(--primary))";

  return (
    <div style={{ width: size, height: size, animation: pop ? "otto-pop 0.35s ease-out" : undefined }} aria-label={label ?? "Otto the drone"}>
      <div style={{ animation: bob, width: "100%", height: "100%" }}>
        <svg viewBox="0 0 48 48" width="100%" height="100%" role="img" aria-hidden>
          {/* Rotors */}
          <g style={{ transformOrigin: "8px 12px", animation: "otto-spin 0.2s linear infinite" }}>
            <ellipse cx="8" cy="12" rx="7" ry="1.2" fill={accent} opacity="0.35" />
          </g>
          <g style={{ transformOrigin: "40px 12px", animation: "otto-spin 0.2s linear infinite" }}>
            <ellipse cx="40" cy="12" rx="7" ry="1.2" fill={accent} opacity="0.35" />
          </g>
          {/* Arms */}
          <rect x="6" y="19" width="36" height="2" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          {/* Body */}
          <rect x="12" y="18" width="24" height="22" rx="8" fill="hsl(var(--card))" stroke={accent} strokeWidth="1.5" />
          {/* Visor */}
          <rect x="15" y="22" width="18" height="10" rx="5" fill={accent} opacity="0.12" />
          {/* Eyes */}
          <circle cx="19" cy={eyeY} r="1.8" fill={accent} />
          <circle cx="29" cy={eyeY} r="1.8" fill={accent} />
          {/* Mouth */}
          <path d={mouth} stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Landing gear */}
          <line x1="16" y1="40" x2="14" y2="44" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="32" y1="40" x2="34" y2="44" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      {label ? <div className="mt-1 text-center text-[11px] text-muted-foreground">{label}</div> : null}
    </div>
  );
}
