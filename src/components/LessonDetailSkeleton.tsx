import { Skeleton } from "@/components/ui/skeleton";

export function LessonDetailSkeleton() {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-12 md:pt-16">
      <Skeleton className="h-4 w-28" />
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-10 w-4/5" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <div className="glass-strong mt-8 space-y-3 rounded-3xl p-6 shadow-glass md:p-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="mt-4 h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-9/12" />
        <Skeleton className="mt-4 h-6 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-8/12" />
      </div>
      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>
    </article>
  );
}
