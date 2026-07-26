"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { SessionUser } from "./types";

export interface LoginInput {
  email: string;
  password: string;
}

export class LoginRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, fieldErrors?: Record<string, string>) {
    super("login_failed");
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function login(input: LoginInput): Promise<SessionUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (response.status === 422) {
    const data = await response.json();
    throw new LoginRequestError(422, data.errors);
  }
  if (!response.ok) {
    throw new LoginRequestError(response.status);
  }

  const data = await response.json();
  return data.user as SessionUser;
}

export function useLogin(next?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(["session"], user);
      router.push(next || "/dashboard");
    },
  });
}
