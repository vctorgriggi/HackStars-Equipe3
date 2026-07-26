"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-sm justify-items-center gap-3 py-16 text-center">
      <p className="text-base font-semibold text-text-1">
        Algo deu errado nesta tela
      </p>
      <p className="text-sm text-text-3">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 w-full rounded-md bg-brand-primary px-4 text-base font-semibold text-brand-on hover:bg-brand-primary-600"
      >
        Tentar novamente
      </button>
    </div>
  );
}
