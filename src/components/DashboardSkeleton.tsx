import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-72 md:w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="glass-strong rounded-3xl p-6 shadow-glass lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[88px] w-[88px] rounded-full" />
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <Skeleton className="h-3 w-32" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>

      <Skeleton className="mt-4 h-48 rounded-3xl" />
    </section>
  );
}
