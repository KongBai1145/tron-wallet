import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ExternalLink, Bookmark, Globe, Zap, Search, Palette, Star, StarOff } from "lucide-react";
import Button from "@/components/ui/Button";

const popularDApps = [
  { name: "SunSwap", url: "https://sun.io", category: "DEX", icon: Zap },
  { name: "JustLend", url: "https://justlend.org", category: "Lending", icon: Globe },
  { name: "TRONSCAN", url: "https://tronscan.org", category: "Explorer", icon: Search },
  { name: "APENFT", url: "https://apenft.org", category: "NFT", icon: Palette },
];

export default function DApp() {
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const toggleBookmark = (name: string) => {
    setBookmarks((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const displayDApps = showBookmarks
    ? popularDApps.filter((d) => bookmarks.includes(d.name))
    : popularDApps;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("dapp.title")}</h1>
        <Button variant={showBookmarks ? "primary" : "secondary"} size="sm" onClick={() => setShowBookmarks(!showBookmarks)}>
          <Bookmark className="w-4 h-4" />{t("dapp.bookmarks")}{bookmarks.length > 0 && ` (${bookmarks.length})`}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {displayDApps.map((dapp) => {
          const Icon = dapp.icon;
          const isBookmarked = bookmarks.includes(dapp.name);
          return (
            <div key={dapp.name} className="rounded-xl p-4 cursor-pointer transition-colors" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              onClick={() => window.open(dapp.url, "_blank")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                  <Icon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{dapp.name}</p>
                    <button onClick={(e) => { e.stopPropagation(); toggleBookmark(dapp.name); }} className="cursor-pointer" style={{ color: isBookmarked ? "var(--warning)" : "var(--text-tertiary)" }}>
                      {isBookmarked ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{dapp.category}</p>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              </div>
            </div>
          );
        })}
        {showBookmarks && displayDApps.length === 0 && (
          <div className="col-span-2 px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dapp.noBookmarks")}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
