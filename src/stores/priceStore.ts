import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface TokenPrice {
  price_usd: number;
  price_change_24h: number;
  market_cap: number;
}

interface PriceState {
  trxPrice: TokenPrice | null;
  isLoading: boolean;
  error: string | null;
  _interval: ReturnType<typeof setInterval> | null;

  fetchPrice: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  trxPrice: null,
  isLoading: false,
  error: null,
  _interval: null,

  fetchPrice: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await invoke<any>("get_trx_price");
      set({
        trxPrice: {
          price_usd: data["tron"]?.["usd"] ?? 0,
          price_change_24h: data["tron"]?.["usd_24h_change"] ?? 0,
          market_cap: data["tron"]?.["usd_market_cap"] ?? 0,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  startPolling: () => {
    const state = get();
    if (state._interval) return;
    get().fetchPrice();
    const interval = setInterval(() => get().fetchPrice(), 60000);
    set({ _interval: interval });
  },

  stopPolling: () => {
    const state = get();
    if (state._interval) {
      clearInterval(state._interval);
      set({ _interval: null });
    }
  },
}));
