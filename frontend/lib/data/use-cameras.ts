"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { keys } from "./keys";

export function useCameras() {
  return useQuery({ queryKey: keys.cameras.all, queryFn: api.getCameras });
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCamera,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.cameras.all }),
  });
}
