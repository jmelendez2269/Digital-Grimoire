"use client";

import {
  parseSafeToolCostsResponse,
  parseSafeWalletResponse,
  type SafeCreditWallet,
  type SafeToolCost,
  type SafeToolCosts,
  type ToolActionCode,
} from "@/lib/membership/membership-wallet-presentation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface CreditWalletContextValue {
  wallet: SafeCreditWallet | null;
  toolCosts: SafeToolCosts | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

export interface ToolCreditState {
  action: SafeToolCost | null;
  availableCredits: number | null;
  requiredCredits: number | null;
  resetAt: string | null;
  loading: boolean;
  status: "loading" | "unavailable" | "disabled" | "insufficient" | "ready";
  canSubmit: boolean;
}

const CreditWalletContext = createContext<CreditWalletContextValue | null>(null);

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function CreditWalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<SafeCreditWallet | null>(null);
  const [toolCosts, setToolCosts] = useState<SafeToolCosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const [walletResponse, costsResponse] = await Promise.all([
        fetch("/api/membership/wallet", { cache: "no-store", signal }),
        fetch("/api/membership/tool-costs", { cache: "no-store", signal }),
      ]);
      const [walletBody, costsBody] = await Promise.all([
        readJson(walletResponse),
        readJson(costsResponse),
      ]);
      const safeWallet = parseSafeWalletResponse(walletBody);
      const safeToolCosts = parseSafeToolCostsResponse(costsBody);
      if (!walletResponse.ok || !safeWallet) {
        throw new Error("WALLET_STATE_UNAVAILABLE");
      }
      setWallet(safeWallet);
      setToolCosts(costsResponse.ok ? safeToolCosts : null);
    } catch {
      if (signal?.aborted) return;
      setWallet(null);
      setToolCosts(null);
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const value = useMemo<CreditWalletContextValue>(
    () => ({
      wallet,
      toolCosts,
      loading,
      error,
      refresh: () => load(),
    }),
    [error, load, loading, toolCosts, wallet],
  );

  return (
    <CreditWalletContext.Provider value={value}>
      {children}
    </CreditWalletContext.Provider>
  );
}

export function useCreditWallet(): CreditWalletContextValue {
  const value = useContext(CreditWalletContext);
  if (!value) {
    throw new Error("Credit wallet components require CreditWalletProvider");
  }
  return value;
}

export function useToolCreditState(actionCode: ToolActionCode): ToolCreditState {
  const { wallet, toolCosts, loading, error } = useCreditWallet();
  const action =
    toolCosts?.actions.find((candidate) => candidate.actionCode === actionCode) ??
    null;
  const requiredCredits = action?.creditCost ?? null;
  const availableCredits = wallet?.availableCredits ?? null;
  const resetAt = wallet?.grant?.resetsAt ?? null;

  if (loading) {
    return {
      action,
      availableCredits,
      requiredCredits,
      resetAt,
      loading: true,
      status: "loading",
      canSubmit: false,
    };
  }
  if (
    error ||
    !wallet ||
    wallet.status !== "current" ||
    !action ||
    requiredCredits === null
  ) {
    return {
      action,
      availableCredits,
      requiredCredits,
      resetAt,
      loading: false,
      status: "unavailable",
      canSubmit: false,
    };
  }
  if (!action.enabled) {
    return {
      action,
      availableCredits,
      requiredCredits,
      resetAt,
      loading: false,
      status: "disabled",
      canSubmit: false,
    };
  }
  if (wallet.availableCredits < requiredCredits) {
    return {
      action,
      availableCredits,
      requiredCredits,
      resetAt,
      loading: false,
      status: "insufficient",
      canSubmit: false,
    };
  }
  return {
    action,
    availableCredits,
    requiredCredits,
    resetAt,
    loading: false,
    status: "ready",
    canSubmit: true,
  };
}
