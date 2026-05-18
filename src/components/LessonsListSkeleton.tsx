import { Skeleton } from "@/components/ui/skeleton";

export function LessonsListSkeleton() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-12 md:pt-16">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-12 w-3/4" />
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-4 h-6 w-32 rounded-full" />
      <div className="mt-10 space-y-6">
        {[1, 2, 3].map((w) => (
          <div key={w} className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
