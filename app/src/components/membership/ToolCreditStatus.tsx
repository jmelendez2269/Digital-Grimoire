"use client";

import { useToolCreditState } from "@/components/membership/CreditWalletProvider";
import type { ToolRunState } from "@/lib/membership/metering-customer-presentation";
import {
  formatUtcDateTime,
  type ToolActionCode,
} from "@/lib/membership/membership-wallet-presentation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

interface ToolCreditStatusProps {
  actionCode: ToolActionCode;
  runState?: ToolRunState;
  capacityResetAt?: string | null;
}

function credits(value: number) {
  return `${value} ${value === 1 ? "credit" : "credits"}`;
}

export default function ToolCreditStatus({
  actionCode,
  runState = "idle",
  capacityResetAt,
}: ToolCreditStatusProps) {
  const state = useToolCreditState(actionCode);
  const required = state.requiredCredits;
  const available = state.availableCredits;
  const resetAt = capacityResetAt ?? state.resetAt;

  if (state.status === "loading") {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-400" role="status">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Checking server-owned cost and balance…
      </div>
    );
  }

  if (runState === "capacity_paused") {
    return (
      <div className="rounded-lg border border-orange-800/60 bg-orange-950/30 px-4 py-3 text-sm leading-6 text-orange-100" role="alert">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-1 h-4 w-4 shrink-0 text-orange-300" aria-hidden="true" />
          <p>
            Reader generation is paused{resetAt ? ` until ${formatUtcDateTime(resetAt)}` : " until the next UTC month"}. Paid-member generation and non-generative reading, search, Graph, Journal, and saved results remain available.
          </p>
        </div>
      </div>
    );
  }

  if (runState === "reserved" && required !== null) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100" role="status">
        <Clock3 className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
        {credits(required)} reserved while this request runs. Your input stays here.
      </div>
    );
  }

  if (runState === "committed" && required !== null) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100" role="status">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
        Saved successfully; {credits(required)} committed once.
      </div>
    );
  }

  if (runState === "returned" && required !== null) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-100" role="status">
        <RotateCcw className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        The request did not complete; {credits(required)} returned. Your input is ready to revise or retry.
      </div>
    );
  }

  if (runState === "retry") {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-100" role="status">
        <RotateCcw className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        Retry will reuse the same request so a completed result is reopened without a second charge.
      </div>
    );
  }

  if (runState === "reconcile") {
    return (
      <div className="flex min-h-11 items-start gap-2 rounded-lg border border-orange-800/60 bg-orange-950/30 px-3 py-2 text-sm leading-6 text-orange-100" role="alert">
        <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-orange-300" aria-hidden="true" />
        Your result was saved, but its credit record needs reconciliation. Open the saved result; do not start a new request.
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="flex min-h-11 items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm leading-6 text-red-200" role="alert">
        <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        Credit status could not be verified, so no generation can start. Your input remains unchanged.
      </div>
    );
  }

  if (state.status === "disabled" || runState === "disabled") {
    return (
      <div className="flex min-h-11 items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm leading-6 text-zinc-300" role="status">
        <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
        {required === null ? "This generation action is safely closed." : `${credits(required)} required; this generation action is safely closed.`} Reading and saved work remain available.
      </div>
    );
  }

  if (state.status === "insufficient" && required !== null && available !== null) {
    return (
      <div className="flex min-h-11 items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm leading-6 text-red-200" role="alert">
        <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {credits(required)} required; {credits(available)} available.
          {resetAt ? ` Your allowance resets ${formatUtcDateTime(resetAt)}.` : ""} Your input remains unchanged.
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-300" role="status">
      <WalletCards className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      <span className="tabular-nums">
        {required === null ? "Cost unavailable" : `${credits(required)} required`} · {available === null ? "Balance unavailable" : `${credits(available)} available`}
      </span>
    </div>
  );
}
