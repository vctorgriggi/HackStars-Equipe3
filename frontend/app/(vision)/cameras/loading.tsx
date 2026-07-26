import { SkeletonListagem } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy aria-live="polite">
      <SkeletonListagem />
    </div>
  );
}
