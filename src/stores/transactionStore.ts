import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Transaction {
  tx_id: string;
  block_number: number;
  block_timestamp: number;
  owner_address: string | null;
  to_address: string | null;
  amount: number | null;
  contract_type: string | null;
  confirmed: boolean | null;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  fingerprint: string | null;

  fetchTransactions: (address: string, network?: string, limit?: number) => Promise<void>;
  loadMore: (address: string, network?: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  hasMore: true,
  fingerprint: null,

  fetchTransactions: async (address: string, network = "mainnet", limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const data = await invoke<any>("get_transactions", {
        address,
        network,
        limit,
      });

      const txs: Transaction[] = (data?.data ?? []).map((tx: any) => ({
        tx_id: tx.txID ?? "",
        block_number: tx.blockNumber ?? 0,
        block_timestamp: tx.blockTimeStamp ?? 0,
        owner_address: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address ?? null,
        to_address: tx.raw_data?.contract?.[0]?.parameter?.value?.to_address ?? null,
        amount: tx.raw_data?.contract?.[0]?.parameter?.value?.amount ?? null,
        contract_type: tx.raw_data?.contract?.[0]?.type ?? null,
        confirmed: tx.confirmed ?? null,
      }));

      const fp = data?.meta?.fingerprint ?? null;
      set({ transactions: txs, isLoading: false, hasMore: !!fp, fingerprint: fp });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  loadMore: async (address: string, network = "mainnet") => {
    const { fingerprint, isLoading } = get();
    if (!fingerprint || isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const data = await invoke<any>("get_transactions", {
        address,
        network,
        limit: 50,
        fingerprint,
      });

      const txs: Transaction[] = (data?.data ?? []).map((tx: any) => ({
        tx_id: tx.txID ?? "",
        block_number: tx.blockNumber ?? 0,
        block_timestamp: tx.blockTimeStamp ?? 0,
        owner_address: tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address ?? null,
        to_address: tx.raw_data?.contract?.[0]?.parameter?.value?.to_address ?? null,
        amount: tx.raw_data?.contract?.[0]?.parameter?.value?.amount ?? null,
        contract_type: tx.raw_data?.contract?.[0]?.type ?? null,
        confirmed: tx.confirmed ?? null,
      }));

      const fp = data?.meta?.fingerprint ?? null;
      set((state) => ({
        transactions: [...state.transactions, ...txs],
        isLoading: false,
        hasMore: !!fp,
        fingerprint: fp,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
}));
