import { SkeletonListagem } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy aria-live="polite">
      <span className="sr-only">Carregando transformadores…</span>
      <SkeletonListagem />
    </div>
  );
}
