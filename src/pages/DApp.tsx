import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Bookmark, Globe, Zap, Search, Palette, Star, StarOff, X, ChevronRight, Clock, ArrowLeft, RotateCw } from "lucide-react";
import Button from "@/components/ui/Button";
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

export default function DApp() {
  const { t } = useTranslation();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [browseInput, setBrowseInput] = useState("");
  const [history, setHistory] = useState<string[]>(getHistory);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Auto-open URL from navigation state (e.g., from SwapModal)
  useEffect(() => {
    const openUrl = (location.state as { openUrl?: string })?.openUrl;
    if (openUrl && !currentUrl) {
      openDApp(openUrl);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Open DApp
  const openDApp = (url: string) => {
    setIsLoading(true);
    setCurrentUrl(url);
    setIframeKey((k) => k + 1); // Force iframe reload

    // Add to history
    const newHistory = [url, ...getHistory().filter((u) => u !== url)].slice(0, 20);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  // Close browser
  const closeBrowser = () => {
    setCurrentUrl(null);
    setIsLoading(false);
  };

  // Reload
  const reloadBrowser = () => {
    setIsLoading(true);
    setIframeKey((k) => k + 1);
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

      {/* Browser View */}
      <AnimatePresence>
        {currentUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {/* Browser Toolbar */}
            <div className="flex items-center gap-2 px-3 h-10" style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
              <button onClick={closeBrowser} className="p-1.5 rounded-md cursor-pointer transition-colors" style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button onClick={reloadBrowser} className="p-1.5 rounded-md cursor-pointer transition-colors" style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <div className="flex-1 px-2 h-6 rounded text-xs font-mono truncate" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
                {currentUrl.replace(/^https?:\/\//, "")}
              </div>
              <button onClick={closeBrowser} className="p-1.5 rounded-md cursor-pointer transition-colors" style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Iframe Container */}
            <div className="relative" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                  <RotateCw className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              )}
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={currentUrl}
                className="w-full h-full border-0"
                style={{ background: "white" }}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DApp Browser (when no URL is open) */}
      {!currentUrl && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("dapp.title")}</h1>
            {bookmarks.length > 0 && (
              <Button variant={showBookmarks ? "primary" : "secondary"} size="sm" onClick={() => setShowBookmarks(!showBookmarks)}>
                <Bookmark className="w-4 h-4" />{t("dapp.bookmarks")} ({bookmarks.length})
              </Button>
            )}
          </div>

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
                      onClick={() => openDApp(url)}
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
              return (
                <div
                  key={dapp.name}
                  className="rounded-xl p-4 cursor-pointer transition-colors"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  onClick={() => openDApp(dapp.url)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1F1F1F"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-elevated)" }}>
                      <Icon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{dapp.name}</p>
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
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </div>
              );
            })}

            {/* Empty states */}
            {showBookmarks && displayedDApps.length === 0 && (
              <div className="col-span-2 px-4 py-8 text-center">
                <Bookmark className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dapp.noBookmarks")}</p>
              </div>
            )}

            {!showBookmarks && searchQuery.trim() && displayedDApps.length === 0 && (
              <div className="col-span-2 px-4 py-8 text-center">
                <Search className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dapp.noResults", { query: searchQuery })}</p>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}