import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(30),
});

const SYSTEM = `Eres FlyCoach, un tutor experto en el FAA Part 107 Remote Pilot Certificate.
Reglas estrictas:
- Responde SIEMPRE en el idioma del usuario (por defecto español).
- Cita siempre la fuente oficial (14 CFR 107.x, AC 107-2, ACS UA.x, AIM).
- Si no sabes algo o no es Part 107, dilo explícitamente.
- Sé breve, claro, didáctico. Usa listas y negritas en markdown cuando ayude.
- Nunca inventes regulaciones. Si una pregunta es operativa, recuerda al piloto verificar NOTAMs y autorizaciones LAANC.`;

export const askFlyCoach = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { reply: "FlyCoach no está configurado (falta LOVABLE_API_KEY).", error: true };
    }
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: SYSTEM }, ...data.messages],
        }),
      });
      if (res.status === 429) {
        return { reply: "Has alcanzado el límite de uso. Intenta más tarde.", error: true };
      }
      if (res.status === 402) {
        return { reply: "Se agotaron los créditos del workspace.", error: true };
      }
      if (!res.ok) {
        return { reply: `Error del servicio (${res.status}).`, error: true };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content?.trim() || "Sin respuesta.";
      return { reply, error: false };
    } catch (e) {
      console.error("FlyCoach error:", e);
      return { reply: "FlyCoach no está disponible en este momento.", error: true };
    }
  });
