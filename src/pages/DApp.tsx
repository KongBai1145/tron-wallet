import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ExternalLink, Bookmark, Globe, Zap, Search, Palette, Star, StarOff, X, ChevronRight, Clock, ArrowLeft, RotateCw, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLocation } from "react-router-dom";

interface DAppItem {
  name: string;
  url: string;
  category: string;
  icon: React.ElementType;
}

const popularDApps: DAppItem[] = [
  { name: "SunSwap", url: "https://sun.io", category: "DEX", icon: Zap },
  { name: "JustLend", url: "https://justlend.org", category: "Lending", icon: Globe },
  { name: "TRONSCAN", url: "https://tronscan.org", category: "Explorer", icon: Search },
  { name: "APENFT", url: "https://apenft.org", category: "NFT", icon: Palette },
  { name: "Curve", url: "https://curve.fi", category: "DEX", icon: Zap },
  { name: "APY.Vision", url: "https://apy.vision", category: "Analytics", icon: Search },
  { name: "TronLink", url: "https://www.tronlink.org", category: "Wallet", icon: Globe },
  { name: "TRON DAO", url: "https://trondaoscan.io", category: "Governance", icon: Palette },
];

const STORAGE_KEY_HISTORY = "tron_wallet_dapp_history";
const STORAGE_KEY_BOOKMARKS = "tron_wallet_dapp_bookmarks";

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) ?? "[]"); } catch { return []; }
}
function getBookmarks(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARKS) ?? "[]"); } catch { return []; }
}
function saveHistory(urls: string[]) { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(urls)); }
function saveBookmarks(names: string[]) { localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(names)); }

// Generate unique webview label
function generateWebviewLabel(): string {
  return `dapp-browser-${Date.now()}`;
}

export default function DApp() {
  const { t } = useTranslation();
  const location = useLocation();
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [browseInput, setBrowseInput] = useState("");
  const [history, setHistory] = useState<string[]>(getHistory);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserWindow, setBrowserWindow] = useState<WebviewWindow | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-open URL from navigation state (e.g., from SwapModal)
  useEffect(() => {
    const openUrl = (location.state as { openUrl?: string })?.openUrl;
    if (openUrl && !currentUrl && !isLoading) {
      openDApp(openUrl);
      // Clear the state to prevent re-opening on subsequent visits
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Cleanup browser window on unmount
  useEffect(() => {
    return () => {
      if (browserWindow) {
        browserWindow.close().catch(() => {});
      }
    };
  }, [browserWindow]);

  // Open DApp in embedded browser
  const openDApp = async (url: string, _name?: string) => {
    void _name;
    setIsLoading(true);
    try {
      // Close existing browser window if any
      if (browserWindow) {
        await browserWindow.close();
        setBrowserWindow(null);
      }

      // Get current window for positioning
      const mainWindow = getCurrentWindow();
      const mainWindowSize = await mainWindow.innerSize();

      // Create new browser window (90% of main window size)
      const browserWidth = Math.floor(mainWindowSize.width * 0.9);
      const browserHeight = Math.floor(mainWindowSize.height * 0.9);

      const webview = new WebviewWindow(generateWebviewLabel(), {
        url: url,
        width: browserWidth,
        height: browserHeight,
        center: true,
        title: `TRON Wallet - ${url.replace(/^https?:\/\//, "").split("/")[0]}`,
        decorations: true,
        transparent: false,
      });

      webview.once("tauri://created", () => {
        setIsLoading(false);
        setCurrentUrl(url);
        setBrowserWindow(webview);

        // Add to history
        const newHistory = [url, ...getHistory().filter((u) => u !== url)].slice(0, 20);
        setHistory(newHistory);
        saveHistory(newHistory);
      });

      webview.once("tauri://error", (e) => {
        console.error("Webview error:", e);
        setIsLoading(false);
      });

      // Listen for window close
      webview.onCloseRequested(() => {
        setBrowserWindow(null);
        setCurrentUrl(null);
      });

    } catch (e) {
      console.error("Failed to open browser:", e);
      setIsLoading(false);
    }
  };

  // Close browser
  const closeBrowser = async () => {
    if (browserWindow) {
      await browserWindow.close();
      setBrowserWindow(null);
      setCurrentUrl(null);
    }
  };

  const toggleBookmark = (name: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      saveBookmarks(next);
      return next;
    });
  };

  // Filter displayed DApps
  const filteredDApps = searchQuery.trim()
    ? popularDApps.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularDApps;

  const displayedDApps = showBookmarks
    ? filteredDApps.filter((d) => bookmarks.includes(d.name))
    : filteredDApps;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("dapp.title")}</h1>
        <div className="flex items-center gap-2">
          {bookmarks.length > 0 && (
            <Button variant={showBookmarks ? "primary" : "secondary"} size="sm" onClick={() => setShowBookmarks(!showBookmarks)}>
              <Bookmark className="w-4 h-4" />{t("dapp.bookmarks")} ({bookmarks.length})
            </Button>
          )}
          {currentUrl && (
            <Button variant="secondary" size="sm" onClick={closeBrowser}>
              <X className="w-4 h-4" />{t("common.exit")}
            </Button>
          )}
        </div>
      </div>

      {/* Browser Status */}
      {currentUrl && (
        <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <Globe className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-xs font-mono truncate flex-1" style={{ color: "var(--text-secondary)" }}>
            {currentUrl.replace(/^https?:\/\//, "").split("/")[0]}
          </span>
          <Button size="sm" variant="ghost" onClick={closeBrowser}>
            <ArrowLeft className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4" style={{ color: "var(--text-tertiary)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{t("dapp.loading", "Opening browser...")}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          placeholder={t("dapp.searchDApps")}
          className="w-full pl-9 pr-4 h-9 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Recent History */}
      {!showBookmarks && history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
            <Clock className="w-3 h-3" />{t("dapp.recentlyVisited")}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {history.slice(0, 6).map((url) => {
              const name = popularDApps.find((d) => d.url === url)?.name;
              return (
                <button
                  key={url}
                  onClick={() => openDApp(url, name)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap transition-colors"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                >
                  {name || new URL(url).hostname.replace("www.", "")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick URL Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder={t("dapp.enterUrl")}
            className="w-full pl-8 pr-3 h-8 rounded-lg text-xs outline-none"
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            value={browseInput}
            onChange={(e) => setBrowseInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && browseInput.trim()) {
                let url = browseInput.trim();
                if (!url.startsWith("http")) url = "https://" + url;
                openDApp(url);
                setBrowseInput("");
              }
            }}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => { if (browseInput.trim()) { let url = browseInput.trim(); if (!url.startsWith("http")) url = "https://" + url; openDApp(url); setBrowseInput(""); } }}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* DApp Grid */}
      <div className="grid grid-cols-2 gap-2">
        {displayedDApps.map((dapp) => {
          const Icon = dapp.icon;
          const isBookmarked = bookmarks.includes(dapp.name);
          const isActive = currentUrl === dapp.url;
          return (
            <div
              key={dapp.name}
              className="rounded-xl p-4 cursor-pointer transition-colors"
              style={{ background: isActive ? "var(--bg-elevated)" : "var(--bg-surface)", border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)" }}
              onClick={() => openDApp(dapp.url, dapp.name)}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#1F1F1F"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-elevated)" }}>
                  <Icon className="w-5 h-5" style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate" style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}>{dapp.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(dapp.name); }}
                      className="shrink-0 cursor-pointer"
                      style={{ color: isBookmarked ? "var(--warning)" : "var(--text-tertiary)" }}
                    >
                      {isBookmarked ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{dapp.category}</p>
                </div>
                {isActive ? <RotateCw className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: "var(--accent)" }} /> : <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />}
              </div>
            </div>
          );
        })}

        {/* Show empty state only when bookmark filter has no results */}
        {showBookmarks && displayedDApps.length === 0 && (
          <div className="col-span-2 px-4 py-8 text-center">
            <Bookmark className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dapp.noBookmarks")}</p>
          </div>
        )}

        {/* Search no results */}
        {!showBookmarks && searchQuery.trim() && displayedDApps.length === 0 && (
          <div className="col-span-2 px-4 py-8 text-center">
            <Search className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dapp.noResults", { query: searchQuery })}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}