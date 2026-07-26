import { NextRequest } from "next/server";
import { proxyBackendGet, proxyBackendWrite } from "@/lib/server/backend-proxy";

// GET /api/cameras?page=&limit= → câmeras cadastradas (checkpoint aninhado).
export async function GET(request: NextRequest) {
  return proxyBackendGet(request, "/api/v1/cameras");
}

// POST /api/cameras → cadastra câmera; 422 do class-validator repassado
// intacto (fonteFisica fora da whitelist, etc.).
export async function POST(request: NextRequest) {
  return proxyBackendWrite(request, "/api/v1/cameras", "POST");
}
