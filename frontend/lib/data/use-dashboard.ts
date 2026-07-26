"use client";

import { useQuery } from "@tanstack/react-query";
import type { PeriodoDashboard } from "@/lib/domain/types";
import * as api from "./api";
import { keys } from "./keys";

export function useDashboard(
  periodo: PeriodoDashboard,
  de?: string,
  ate?: string,
) {
  return useQuery({
    queryKey: keys.dashboard(periodo, de, ate),
    queryFn: () => api.getDashboard(periodo, de, ate),
    placeholderData: (prev) => prev, // troca de período sem flash de skeleton
  });
}
