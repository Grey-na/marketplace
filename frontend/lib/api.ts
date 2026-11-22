import type { ApiResponse } from "@/types/api";

const API_URL = process.env.API_URL || "http://localhost:3005";

export class ApiHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

// revalidate: keep the answer for this many seconds. Without it, every request asks the backend again
export async function apiGet<T>(path: string, options?: { revalidate?: number }): Promise<ApiResponse<T>> {
  const response = await fetch(
    `${API_URL}/api${path}`,
    options?.revalidate ? { next: { revalidate: options.revalidate } } : { cache: "no-store" }
  );
  if (!response.ok) {
    throw new ApiHttpError(`The API call ${path} failed with status ${response.status}`, response.status);
  }
  return response.json();
}