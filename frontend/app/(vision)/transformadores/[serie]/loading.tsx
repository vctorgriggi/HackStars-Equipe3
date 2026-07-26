import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy>
      <Skeleton className="h-6 w-56 rounded-md" />
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-64 min-w-[260px] flex-1 rounded-lg" />
        <Skeleton className="h-64 min-w-[280px] flex-[2] rounded-lg" />
      </div>
    </div>
  );
}
