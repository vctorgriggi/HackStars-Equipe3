// Server component fino: resolve o param (Promise no Next 16) e delega ao
// client, que carrega peça + timeline via react-query.

import { DetalheTransformador } from "./_components/detalhe";

export default async function Page({
  params,
}: PageProps<"/transformadores/[serie]">) {
  const { serie } = await params;
  return <DetalheTransformador serie={decodeURIComponent(serie)} />;
}
