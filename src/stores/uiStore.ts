import { create } from "zustand";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  currentLanguage: string;
  locked: boolean;

  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setLanguage: (language: string) => void;
  lock: () => void;
  unlock: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: (localStorage.getItem("theme") as any) || "system",
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  currentLanguage: localStorage.getItem("language") || "zh-CN",
  locked: false,

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  toggleCommandPalette: () => {
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
  },

  setCommandPaletteOpen: (open) => {
    set({ commandPaletteOpen: open });
  },

  setLanguage: (language) => {
    set({ currentLanguage: language });
    localStorage.setItem("language", language);
  },

  lock: () => {
    set({ locked: true });
  },

  unlock: () => {
    set({ locked: false });
  },
}));

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;

  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", theme);
  }
}
