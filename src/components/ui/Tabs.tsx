import { ReactNode, useState } from "react";

interface Tab { id: string; label: string; icon?: ReactNode; }
interface TabsProps { tabs: Tab[]; activeTab?: string; onChange: (id: string) => void; children: ReactNode; }

export default function Tabs({ tabs, activeTab, onChange, children }: TabsProps) {
  const [internal, setInternal] = useState(tabs[0]?.id || "");
  const active = activeTab || internal;

  const handleChange = (id: string) => { setInternal(id); onChange(id); };

  return (
    <div>
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className="relative flex-1 flex items-center justify-center gap-1.5 px-3 h-9 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: active === tab.id ? "var(--bg-elevated)" : "transparent",
              color: active === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}
