import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface WalletInfo {
  id: string;
  name: string;
  address: string;
  wallet_type: string;
  network: string;
  created_at: string;
}

interface WalletState {
  wallets: WalletInfo[];
  currentWallet: WalletInfo | null;
  isLoading: boolean;
  error: string | null;

  fetchWallets: () => Promise<void>;
  setCurrentWallet: (wallet: WalletInfo | null) => void;
  createWallet: (name: string, password: string, walletType: string) => Promise<WalletInfo>;
  importWallet: (name: string, walletType: string, secret: string, password?: string) => Promise<WalletInfo>;
  deleteWallet: (id: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  currentWallet: null,
  isLoading: false,
  error: null,

  fetchWallets: async () => {
    set({ isLoading: true, error: null });
    try {
      const wallets = await invoke<WalletInfo[]>("get_wallets");
      set({ wallets, isLoading: false });
      if (wallets.length > 0 && !get().currentWallet) {
        const savedId = localStorage.getItem("currentWalletId");
        const saved = wallets.find((w) => w.id === savedId);
        set({ currentWallet: saved || wallets[0] });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  setCurrentWallet: (wallet) => {
    set({ currentWallet: wallet });
    if (wallet) localStorage.setItem("currentWalletId", wallet.id);
  },

  createWallet: async (name, password, walletType) => {
    set({ isLoading: true, error: null });
    try {
      const wallet = await invoke<WalletInfo>("create_wallet", {
        request: { name, password, wallet_type: walletType },
      });
      set((state) => ({
        wallets: [wallet, ...state.wallets],
        currentWallet: wallet,
        isLoading: false,
      }));
      return wallet;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  importWallet: async (name, walletType, secret, password) => {
    set({ isLoading: true, error: null });
    try {
      const wallet = await invoke<WalletInfo>("import_wallet", {
        request: { name, wallet_type: walletType, secret, password },
      });
      set((state) => ({
        wallets: [wallet, ...state.wallets],
        currentWallet: wallet,
        isLoading: false,
      }));
      return wallet;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteWallet: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("delete_wallet", { id });
      set((state) => {
        const wallets = state.wallets.filter((w) => w.id !== id);
        return {
          wallets,
          currentWallet: state.currentWallet?.id === id ? wallets[0] ?? null : state.currentWallet,
          isLoading: false,
        };
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
}));
