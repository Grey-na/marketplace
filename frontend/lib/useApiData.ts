"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiFetch } from "./client-api";
import type { ApiResponse } from "@/types/api";

export function useApiData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [pagination, setPagination] = useState<ApiResponse<T>["pagination"]>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const response = await apiFetch<T>(path);
      setData(response.result);
      setPagination(response.pagination);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not load this. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  // reload() fetches again without showing the loading state, so the page does not flicker
  return { data, pagination, error, loading, reload: load, setData };
}