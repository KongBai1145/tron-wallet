import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Trc20Token {
  contract_address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

export interface UnfreezeInfo {
  amount: number;
  unfreeze_expire_time: number;
}

export interface AccountResource {
  bandwidth_limit: number;
  bandwidth_used: number;
  energy_limit: number;
  energy_used: number;
  trx_balance: number;
  frozen_for_bandwidth: number;
  frozen_for_energy: number;
  tron_power: number;
  trc20_tokens: Trc20Token[];
  unfrozen_list: UnfreezeInfo[];
  withdrawable_balance: number;
  owner_permission?: {
    threshold?: number;
    keys?: Array<{ address?: string; weight?: number; label?: string }>;
  };
  active_permission?: Array<{
    threshold?: number;
    keys?: Array<{ address?: string; weight?: number; label?: string }>;
  }>;
}

interface AccountState {
  accountInfo: AccountResource | null;
  isLoading: boolean;
  error: string | null;

  fetchAccountInfo: (address: string, network?: string) => Promise<void>;
  clearAccount: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  accountInfo: null,
  isLoading: false,
  error: null,

  fetchAccountInfo: async (address: string, network = "mainnet") => {
    set({ isLoading: true, error: null });
    try {
      const info = await invoke<AccountResource>("get_account_info", {
        address,
        network,
      });
      set({ accountInfo: info, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  clearAccount: () => {
    set({ accountInfo: null, error: null });
  },
}));
