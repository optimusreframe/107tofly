import { Skeleton } from "@/components/ui/skeleton";

export function PracticeSkeleton() {
  return (
    <section className="mx-auto max-w-2xl px-6 pt-12">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
      <div className="glass-strong mt-6 rounded-3xl p-6 shadow-glass md:p-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-6 w-full" />
        <Skeleton className="mt-2 h-6 w-4/5" />
        <div className="mt-5 grid gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}
