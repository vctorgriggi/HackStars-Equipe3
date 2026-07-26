import { SkeletonCharts, SkeletonKpis } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy aria-live="polite" className="grid gap-4">
      <SkeletonKpis />
      <SkeletonCharts />
    </div>
  );
}
