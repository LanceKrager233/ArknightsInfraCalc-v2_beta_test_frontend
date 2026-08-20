"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface WebsiteSessionIdentity {
  user: {
    id: string;
  };
}

export function parseWebsiteSessionIdentity(value: unknown): WebsiteSessionIdentity | null {
  if (!value || typeof value !== "object") return null;
  const user = "user" in value ? value.user : null;
  if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "string" || !user.id) {
    return null;
  }
  return { user: { id: user.id } };
}

export function useWebsiteSessionIdentity() {
  const [data, setData] = useState<WebsiteSessionIdentity | null>(null);
  const [isPending, setIsPending] = useState(true);
  const requestGeneration = useRef(0);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setIsPending(true);
    try {
      const response = await fetch("/api/auth/get-session", {
        cache: "no-store",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Website session request failed with ${response.status}`);
      const session = parseWebsiteSessionIdentity(await response.json());
      if (mounted.current && generation === requestGeneration.current) setData(session);
      return session;
    } catch {
      return null;
    } finally {
      if (mounted.current && generation === requestGeneration.current) setIsPending(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refetch();
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
    };
  }, [refetch]);

  return { data, isPending, refetch };
}
