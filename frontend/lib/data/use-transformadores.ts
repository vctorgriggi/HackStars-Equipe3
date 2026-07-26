"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "./api";
import { keys } from "./keys";

export function useTransformadores() {
  return useQuery({
    queryKey: keys.transformadores.all,
    queryFn: api.getTransformadores,
  });
}

export function useTransformador(serie: string) {
  return useQuery({
    queryKey: keys.transformadores.one(serie),
    queryFn: () => api.getTransformador(serie),
  });
}

export function useTimeline(serie: string) {
  return useQuery({
    queryKey: keys.transformadores.timeline(serie),
    queryFn: () => api.getTimeline(serie),
  });
}
