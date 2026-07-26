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

export async function fetchJson<T>(url: string): Promise<T> {
  let response = await fetch(url);

  if (response.status === 401 && (await tentarRefresh())) {
    response = await fetch(url);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${url} → ${response.status}`);
  }

  return response.json() as Promise<T>;
}
