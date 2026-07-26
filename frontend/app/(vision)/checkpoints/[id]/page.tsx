import { DetalheCheckpoint } from "./_components/detalhe";

export default async function Page({ params }: PageProps<"/checkpoints/[id]">) {
  const { id } = await params;
  return <DetalheCheckpoint id={id} />;
}
