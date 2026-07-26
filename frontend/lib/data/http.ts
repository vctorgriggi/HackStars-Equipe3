// fetch dos handlers BFF (/api/*) com o mesmo tratamento de sessão do
// use-session: 401 → tenta UM refresh → refaz. Persistindo o 401, lança
// erro tipado — a tela mostra estado de erro e a próxima navegação cai no
// /login pelo proxy.ts (o cookie expira por maxAge).

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function tentarRefresh(): Promise<boolean> {
  const refreshResponse = await fetch("/api/auth/refresh", { method: "POST" });
  return refreshResponse.ok;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response = await fetch(url, init);

  if (response.status === 401 && (await tentarRefresh())) {
    response = await fetch(url, init);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${init?.method ?? "GET"} ${url} → ${response.status}`,
    );
  }

  // DELETE do CRUD gerado (e 204 em geral) responde sem corpo — chamar
  // response.json() aqui estouraria em SyntaxError.
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || !contentType.includes("application/json")) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
