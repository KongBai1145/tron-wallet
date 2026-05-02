import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  network: string;
  group: string;
  tags: string;
  is_favorite: boolean;
  created_at: string;
  last_used_at: string;
}

interface AddressBookState {
  entries: AddressBookEntry[];
  isLoading: boolean;
  error: string | null;

  fetchEntries: () => Promise<void>;
  addEntry: (name: string, address: string, group?: string, tags?: string) => Promise<void>;
  updateEntry: (id: string, name: string, address: string, group?: string, tags?: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const useAddressBookStore = create<AddressBookState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await invoke<AddressBookEntry[]>("get_addresses");
      set({ entries, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addEntry: async (name: string, address: string, group?: string, tags?: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("save_address", {
        request: { name, address, group: group ?? "", tags: tags ?? "", is_favorite: false },
      });
      await get().fetchEntries();
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  updateEntry: async (id: string, name: string, address: string, group?: string, tags?: string) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      await invoke("update_address", {
        id,
        name,
        address,
        group: group ?? "",
        tags: tags ?? "",
        is_favorite: entry.is_favorite,
      });
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, name, address, group: group ?? "", tags: tags ?? "" } : e
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteEntry: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("delete_address", { id });
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  toggleFavorite: async (id: string) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;

    try {
      await invoke("update_address", {
        id,
        name: entry.name,
        address: entry.address,
        group: entry.group,
        tags: entry.tags,
        is_favorite: !entry.is_favorite,
      });
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, is_favorite: !e.is_favorite } : e
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
