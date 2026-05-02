import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Book, Plus, Star, StarOff, Trash2, Copy, Check, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useAddressBookStore, AddressBookEntry } from "@/stores/addressBookStore";

export default function AddressBook() {
  const { t } = useTranslation();
  const { entries, fetchEntries, addEntry, updateEntry, deleteEntry, toggleFavorite } = useAddressBookStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [group, setGroup] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !address.trim()) return;
    try {
      if (editingId) {
        await updateEntry(editingId, name, address, group);
        setEditingId(null);
      } else {
        await addEntry(name, address, group);
      }
      setName("");
      setAddress("");
      setGroup("");
      setShowAdd(false);
    } catch {}
  };

  const startEdit = (entry: AddressBookEntry) => {
    setEditingId(entry.id);
    setName(entry.name);
    setAddress(entry.address);
    setGroup(entry.group);
    setShowAdd(true);
  };

  const copyAddr = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("addressBook.deleteConfirm"))) {
      await deleteEntry(id);
    }
  };

  // Group entries by group
  const grouped = entries.reduce<Record<string, AddressBookEntry[]>>((acc, entry) => {
    const g = entry.group || "default";
    if (!acc[g]) acc[g] = [];
    acc[g].push(entry);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("addressBook.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />{t("addressBook.add")}</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<Book className="w-6 h-6" />}
          title={t("addressBook.noAddresses")}
          description={t("addressBook.addDesc")}
        />
      ) : (
        Object.entries(grouped).map(([groupName, groupEntries]) => (
          <div key={groupName} className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            {groupName !== "default" && (
              <div className="px-4 h-9 flex items-center" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{groupName}</span>
              </div>
            )}
            {groupEntries.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 h-14 cursor-pointer transition-colors"
                style={{ borderBottom: i < groupEntries.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    {entry.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{entry.name}</p>
                      {entry.is_favorite && <Star className="w-3 h-3" style={{ color: "var(--warning)" }} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyAddr(entry.address); }}
                        className="cursor-pointer"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {copied === entry.address ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(entry.id); }}
                    className="p-1.5 rounded cursor-pointer"
                    style={{ color: entry.is_favorite ? "var(--warning)" : "var(--text-tertiary)" }}
                  >
                    {entry.is_favorite ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                    className="p-1.5 rounded cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                    className="p-1.5 rounded cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Add/Edit Address Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); setName(""); setAddress(""); setGroup(""); }} title={editingId ? t("common.edit") : t("addressBook.add")}>
        <div className="space-y-4">
          <Input
            label={t("addressBook.name")}
            placeholder={t("addressBook.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            label={t("addressBook.address")}
            placeholder="T..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label={t("addressBook.group")}
            placeholder={t("addressBook.groupPlaceholder")}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleAdd} disabled={!name.trim() || !address.trim()}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
