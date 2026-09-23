"use client";
import { cloneElement, useId, type ReactElement } from "react";

export const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed";
export const primaryClass = `${buttonClass} border-amber-300 bg-amber-200 text-zinc-950 hover:bg-amber-100`;
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="space-y-2 text-sm text-zinc-300">
      <label htmlFor={id} className="block">
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}
export async function inquiryRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request failed. Please try again.");
  return data as T;
}
