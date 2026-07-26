import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-sm justify-items-center gap-3 py-16 text-center">
      <p className="text-base font-semibold text-text-1">
        Página não encontrada
      </p>
      <p className="text-sm text-text-3">
        O endereço não existe ou o registro foi removido.
      </p>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-brand-medium hover:text-brand-primary-600"
      >
        Voltar ao dashboard
      </Link>
    </div>
  );
}
