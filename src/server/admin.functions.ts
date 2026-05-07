import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // verify admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("FORBIDDEN");

    const tables = [
      "profiles",
      "lessons",
      "questions",
      "quiz_attempts",
      "exam_simulations",
      "certificates",
    ] as const;

    const counts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabaseAdmin
          .from(t)
          .select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      }),
    );

    return {
      users: counts.profiles,
      lessons: counts.lessons,
      questions: counts.questions,
      quizAttempts: counts.quiz_attempts,
      examSimulations: counts.exam_simulations,
      certificates: counts.certificates,
    };
  });
