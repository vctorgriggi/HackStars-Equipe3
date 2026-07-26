"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "./api";
import { keys } from "./keys";

export function useClientes() {
  return useQuery({ queryKey: keys.clientes.all, queryFn: api.getClientes });
}

export function useProjetos() {
  return useQuery({ queryKey: keys.projetos.all, queryFn: api.getProjetos });
}
