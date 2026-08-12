"use client";

import {
  CreditWalletProvider,
  useCreditWallet,
} from "@/components/membership/CreditWalletProvider";
import {
  actionLabel,
  formatUtcDateTime,
  type SafeWalletHistoryItem,
} from "@/lib/membership/membership-wallet-presentation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  Loader2,
  RefreshCw,
  RotateCcw,
  WalletCards,
} from "lucide-react";

function historyCopy(item: SafeWalletHistoryItem) {
  const amount = Math.abs(item.credits);
  const unit = amount === 1 ? "credit" : "credits";
  return {
    monthly_grant: { title: "Monthly allowance granted", amount: `+${amount} ${unit}`, Icon: ArrowDownLeft, tone: "text-emerald-300" },
    credit_reserved: { title: `${actionLabel(item.actionCode)} reserved`, amount: `${amount} ${unit} reserved`, Icon: Clock3, tone: "text-cyan-300" },
    credit_used: { title: `${actionLabel(item.actionCode)} completed`, amount: `-${amount} ${unit}`, Icon: ArrowUpRight, tone: "text-amber-300" },
    credit_returned: { title: `${actionLabel(item.actionCode)} returned`, amount: `+${amount} ${unit}`, Icon: RotateCcw, tone: "text-emerald-300" },
    monthly_grant_expired: { title: "Monthly allowance expired", amount: `${amount} ${unit} expired`, Icon: CalendarClock, tone: "text-zinc-400" },
    balance_adjusted: { title: "Balance adjusted", amount: `${item.credits >= 0 ? "+" : ""}${item.credits} ${unit}`, Icon: RefreshCw, tone: "text-zinc-300" },
  }[item.kind];
}

function CreditWalletContent() {
  const { wallet, loading, error, refresh } = useCreditWallet();

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-amber-400 motion-reduce:animate-none" aria-hidden="true" />
        Loading your credit wallet…
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="rounded-xl border border-red-900/70 bg-red-950/30 p-6" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-red-100">Credit wallet is temporarily unavailable</h2>
            <p className="mt-1 text-sm leading-6 text-red-200/80">No credit action was taken. Generation stays closed until your server-owned balance can be verified.</p>
            <button type="button" onClick={() => void refresh()} className="mt-4 min-h-11 rounded-lg border border-red-700 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-900/40 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none">Try again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50" aria-labelledby="credit-wallet-heading">
        <div className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-medium text-amber-400">Prism Credits</p>
            <h2 id="credit-wallet-heading" className="mt-1 text-2xl font-bold text-amber-100">Your monthly wallet</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Credits are used only by enabled generative actions. Reading, ordinary search, Graph, Journal, and reopening saved results do not spend credits.</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
        </div>
        <dl className="grid gap-px bg-zinc-800 sm:grid-cols-3">
          <div className="bg-zinc-950/50 py-4 pr-5 pl-12 sm:px-6"><dt className="text-sm text-zinc-400">Available</dt><dd className="mt-1 font-mono text-3xl font-semibold text-zinc-50 tabular-nums">{wallet.availableCredits}</dd></div>
          <div className="bg-zinc-950/50 py-4 pr-5 pl-12 sm:px-6"><dt className="text-sm text-zinc-400">Reserved</dt><dd className="mt-1 font-mono text-3xl font-semibold text-cyan-200 tabular-nums">{wallet.reservedCredits}</dd></div>
          <div className="bg-zinc-950/50 py-4 pr-5 pl-12 sm:px-6"><dt className="text-sm text-zinc-400">Current total</dt><dd className="mt-1 font-mono text-3xl font-semibold text-amber-200 tabular-nums">{wallet.totalCredits}</dd></div>
        </dl>
        <div className="border-t border-zinc-800 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-zinc-100">{wallet.grant ? `${wallet.grant.planCode[0].toUpperCase()}${wallet.grant.planCode.slice(1)} allowance` : "No current allowance"}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{wallet.grant ? `Resets ${formatUtcDateTime(wallet.grant.resetsAt)}. Included credits do not roll over.` : "No reset date is available. Generation remains safely closed."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6" aria-labelledby="pending-credit-heading">
        <h2 id="pending-credit-heading" className="text-lg font-bold text-amber-100">Pending reservations</h2>
        {wallet.pending.length ? (
          <ul className="mt-4 divide-y divide-zinc-800">
            {wallet.pending.map((item) => (
              <li key={`${item.actionCode}-${item.createdAt}`} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium text-zinc-100">{actionLabel(item.actionCode)}</p><p className="mt-1 text-sm text-zinc-400">Held while work completes; stale holds return automatically by {formatUtcDateTime(item.expiresAt)}.</p></div>
                <span className="font-mono text-sm font-semibold text-cyan-200 tabular-nums">{item.credits} {item.credits === 1 ? "credit" : "credits"} reserved</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm leading-6 text-zinc-400">No credits are currently reserved.</p>}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6" aria-labelledby="credit-history-heading">
        <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-amber-400" aria-hidden="true" /><h2 id="credit-history-heading" className="text-lg font-bold text-amber-100">Recent history</h2></div>
        {wallet.history.length ? (
          <ul className="mt-4 divide-y divide-zinc-800">
            {wallet.history.map((item, index) => {
              const copy = historyCopy(item);
              return (
                <li key={`${item.occurredAt}-${item.kind}-${index}`} className="flex items-start gap-3 py-4">
                  <copy.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${copy.tone}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1"><p className="font-medium text-zinc-100">{copy.title}</p><p className="mt-1 text-sm text-zinc-500">{formatUtcDateTime(item.occurredAt)} · {item.availableAfter} available after</p></div>
                  <span className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${copy.tone}`}>{copy.amount}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-3 text-sm leading-6 text-zinc-400">No wallet activity yet. Monthly grants and enabled generative actions will appear here.</p>}
      </section>
    </div>
  );
}

export default function CreditWalletTab() {
  return <CreditWalletProvider><CreditWalletContent /></CreditWalletProvider>;
}
