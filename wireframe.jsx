import { useState, useCallback, useEffect, useRef } from "react";

// ============================================================================
// DESIGN SYSTEM TOKENS
// Linear/Notion inspired: restrained palette, typography-driven, generous space
// ============================================================================
const tokens = {
  light: {
    bg: "#FFFFFF",
    bgSubtle: "#F7F7F8",
    bgHover: "#F0F0F2",
    bgActive: "#E8E8EC",
    bgPanel: "#FBFBFC",
    bgCard: "#FFFFFF",
    border: "#E4E4E7",
    borderSubtle: "#F0F0F2",
    text: "#18181B",
    textSecondary: "#71717A",
    textTertiary: "#A1A1AA",
    accent: "#2563EB",
    accentSubtle: "#EFF6FF",
    green: "#16A34A",
    greenSubtle: "#F0FDF4",
    greenBg: "#DCFCE7",
    red: "#DC2626",
    redSubtle: "#FEF2F2",
    orange: "#EA580C",
    orangeSubtle: "#FFF7ED",
    purple: "#7C3AED",
    purpleSubtle: "#F5F3FF",
    shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
    shadowLg: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  },
  dark: {
    bg: "#09090B",
    bgSubtle: "#18181B",
    bgHover: "#27272A",
    bgActive: "#3F3F46",
    bgPanel: "#111113",
    bgCard: "#18181B",
    border: "#27272A",
    borderSubtle: "#1E1E22",
    text: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textTertiary: "#52525B",
    accent: "#3B82F6",
    accentSubtle: "#172554",
    green: "#22C55E",
    greenSubtle: "#052E16",
    greenBg: "#14532D",
    red: "#EF4444",
    redSubtle: "#450A0A",
    orange: "#F97316",
    orangeSubtle: "#431407",
    purple: "#8B5CF6",
    purpleSubtle: "#2E1065",
    shadow: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
    shadowLg: "0 4px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)",
  },
};

// ============================================================================
// DUMMY DATA
// ============================================================================
const TRANSACTIONS = [
  { id: 1, date: "2026-02-15", posted: "2026-02-16", desc: "WHOLE FOODS MARKET #10847", displayName: "Whole Foods", category: "Groceries", type: "Sale", amount: -8743, card: "Connor", tags: ["essentials"] },
  { id: 2, date: "2026-02-14", posted: "2026-02-15", desc: "STARBUCKS #12345 ENCIN", displayName: "Starbucks", category: "Food & Drink", type: "Sale", amount: -687, card: "Connor", tags: [] },
  { id: 3, date: "2026-02-14", posted: "2026-02-15", desc: "AMAZON PRIME*MH8KL2", displayName: "Amazon Prime", category: "Shopping", type: "Sale", amount: -1499, card: "Connor", tags: ["subscription"] },
  { id: 4, date: "2026-02-13", posted: "2026-02-14", desc: "TRADER JOE'S #142", displayName: "Trader Joe's", category: "Groceries", type: "Sale", amount: -6521, card: "Heather", tags: ["essentials"] },
  { id: 5, date: "2026-02-13", posted: "2026-02-14", desc: "RETURN - NORDSTROM #892", displayName: "Nordstrom", category: "Shopping", type: "Return", amount: 4599, card: "Heather", tags: [] },
  { id: 6, date: "2026-02-12", posted: "2026-02-13", desc: "SHELL OIL 57442680102", displayName: "Shell Gas", category: "Gas", type: "Sale", amount: -5834, card: "Connor", tags: [] },
  { id: 7, date: "2026-02-12", posted: "2026-02-13", desc: "NETFLIX.COM", displayName: "Netflix", category: "Entertainment", type: "Sale", amount: -1549, card: "Connor", tags: ["subscription"] },
  { id: 8, date: "2026-02-11", posted: "2026-02-12", desc: "TARGET #1284 ENCINITAS", displayName: "Target", category: "Shopping", type: "Sale", amount: -4287, card: "Heather", tags: ["essentials"] },
  { id: 9, date: "2026-02-10", posted: "2026-02-11", desc: "PIZZERIA MOZZA SAN DIE", displayName: "Pizzeria Mozza", category: "Food & Drink", type: "Sale", amount: -7823, card: "Connor", tags: ["date-night"] },
  { id: 10, date: "2026-02-10", posted: "2026-02-11", desc: "CHEVRON 0091234", displayName: "Chevron", category: "Gas", type: "Sale", amount: -5102, card: "Heather", tags: [] },
  { id: 11, date: "2026-02-09", posted: "2026-02-10", desc: "SPOTIFY USA", displayName: "Spotify", category: "Entertainment", type: "Sale", amount: -1099, card: "Connor", tags: ["subscription"] },
  { id: 12, date: "2026-02-08", posted: "2026-02-09", desc: "COSTCO WHSE #0481", displayName: "Costco", category: "Groceries", type: "Sale", amount: -15643, card: "Connor", tags: ["bulk"] },
];

const CATEGORY_COLORS = {
  "Groceries": "#16A34A",
  "Food & Drink": "#EA580C",
  "Shopping": "#7C3AED",
  "Gas": "#0891B2",
  "Entertainment": "#DB2777",
  "Bills & Utilities": "#2563EB",
  "Travel": "#CA8A04",
  "Health & Wellness": "#059669",
  "Personal": "#6366F1",
};

const SUBSCRIPTIONS = [
  { name: "Netflix", amount: 1549, cycle: "monthly", since: "2023-04-01", review: null, category: "Entertainment" },
  { name: "Spotify", amount: 1099, cycle: "monthly", since: "2022-11-01", review: null, category: "Entertainment" },
  { name: "Amazon Prime", amount: 1499, cycle: "monthly", since: "2024-01-15", review: "2026-03-15", category: "Shopping" },
  { name: "iCloud+", amount: 299, cycle: "monthly", since: "2021-06-01", review: null, category: "Bills & Utilities" },
  { name: "Claude Pro", amount: 2000, cycle: "monthly", since: "2025-03-01", review: null, category: "Bills & Utilities" },
  { name: "NYT Digital", amount: 1700, cycle: "monthly", since: "2025-08-01", review: "2026-04-01", category: "Entertainment" },
];

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================
const fmt = (cents) => {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const c = String(abs % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}$${dollars.toLocaleString()}.${c}`;
};

const KbdHint = ({ keys, t }) => (
  <span style={{ display: "inline-flex", gap: 3, marginLeft: 8, opacity: 0.4 }}>
    {keys.map((k, i) => (
      <span key={i} style={{
        fontSize: 10, fontFamily: "'SF Mono', 'Fira Code', monospace",
        padding: "1px 5px", borderRadius: 3, border: `1px solid ${t.border}`,
        background: t.bgSubtle, color: t.textSecondary, lineHeight: "16px",
      }}>{k}</span>
    ))}
  </span>
);

// ============================================================================
// SIDEBAR
// ============================================================================
const SidebarItem = ({ icon, label, active, onClick, t, kbd }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "8px 12px", border: "none", borderRadius: 6, cursor: "pointer",
    background: active ? t.bgHover : "transparent",
    color: active ? t.text : t.textSecondary,
    fontSize: 13, fontWeight: active ? 560 : 440,
    fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    transition: "all 0.15s ease",
    letterSpacing: "-0.01em",
  }}
    onMouseEnter={(e) => { if (!active) e.target.style.background = t.bgHover; }}
    onMouseLeave={(e) => { if (!active) e.target.style.background = "transparent"; }}
  >
    <span style={{ fontSize: 16, width: 20, textAlign: "center", opacity: 0.7 }}>{icon}</span>
    <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
    {kbd && <KbdHint keys={kbd} t={t} />}
  </button>
);

const Sidebar = ({ view, setView, t, card, setCard }) => (
  <div style={{
    width: 232, minWidth: 232, height: "100vh", display: "flex", flexDirection: "column",
    borderRight: `1px solid ${t.border}`, background: t.bgPanel, padding: "16px 10px",
    fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
  }}>
    {/* App Title */}
    <div style={{ padding: "4px 12px 20px", display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${t.accent}, #7C3AED)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: "#fff", fontWeight: 700,
      }}>$</div>
      <span style={{ fontSize: 14, fontWeight: 650, color: t.text, letterSpacing: "-0.02em" }}>SpendLens</span>
      <span style={{
        fontSize: 9, fontWeight: 600, color: t.accent, background: t.accentSubtle,
        padding: "2px 6px", borderRadius: 4, marginLeft: 2, letterSpacing: "0.04em",
      }}>BETA</span>
    </div>

    {/* Card Selector */}
    <div style={{ padding: "0 6px 16px" }}>
      <select value={card} onChange={(e) => setCard(e.target.value)} style={{
        width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
        border: `1px solid ${t.border}`, background: t.bgSubtle, color: t.text,
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif", cursor: "pointer",
        appearance: "none", backgroundImage: "none",
      }}>
        <option value="all">All Cards</option>
        <option value="Connor">Connor's Sapphire</option>
        <option value="Heather">Heather's Freedom</option>
      </select>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SidebarItem icon="⊞" label="Transactions" active={view === "transactions"} onClick={() => setView("transactions")} t={t} kbd={["1"]} />
      <SidebarItem icon="◑" label="Insights" active={view === "insights"} onClick={() => setView("insights")} t={t} kbd={["2"]} />
      <SidebarItem icon="↻" label="Recurring" active={view === "recurring"} onClick={() => setView("recurring")} t={t} kbd={["3"]} />
      <SidebarItem icon="◇" label="Goals" active={view === "goals"} onClick={() => setView("goals")} t={t} kbd={["4"]} />
      <SidebarItem icon="▤" label="Reports" active={view === "reports"} onClick={() => setView("reports")} t={t} kbd={["5"]} />
    </div>

    <div style={{ flex: 1 }} />

    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
      <SidebarItem icon="⚙" label="Settings" active={view === "settings"} onClick={() => setView("settings")} t={t} />
      <SidebarItem icon="?" label="Shortcuts" active={false} onClick={() => {}} t={t} kbd={["?"]} />
    </div>
  </div>
);

// ============================================================================
// SUMMARY BAR (collapsible)
// ============================================================================
const StatCard = ({ label, value, sub, color, t }) => (
  <div style={{
    flex: 1, padding: "14px 18px", borderRadius: 8, background: t.bgCard,
    border: `1px solid ${t.border}`,
  }}>
    <div style={{ fontSize: 11, fontWeight: 500, color: t.textTertiary, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 650, color: color || t.text, letterSpacing: "-0.03em", fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, fontWeight: 500, color: sub.color, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
      <span>{sub.icon}</span> {sub.text}
    </div>}
  </div>
);

const SummaryBar = ({ expanded, setExpanded, t }) => (
  <div style={{ padding: "0 28px" }}>
    <button onClick={() => setExpanded(!expanded)} style={{
      display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
      cursor: "pointer", color: t.textTertiary, fontSize: 11, fontWeight: 550,
      padding: "12px 0 8px", fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>
      <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s ease", fontSize: 10 }}>▶</span>
      February 2026 Summary
    </button>
    {expanded && (
      <div style={{
        display: "flex", gap: 14, paddingBottom: 16,
        animation: "slideDown 0.2s ease",
      }}>
        <StatCard label="Total Spent" value="$724.86" sub={{ icon: "↓", text: "8.2% vs Jan", color: t.green }} t={t} />
        <StatCard label="Top Category" value="Groceries" sub={{ icon: "◉", text: "$309.07 · 42.6%", color: t.textSecondary }} t={t} />
        <StatCard label="Transactions" value="12" sub={{ icon: "↑", text: "3 more than Jan", color: t.orange }} t={t} />
        <StatCard label="Streak" value="18 days" sub={{ icon: "★", text: "Under avg daily spend", color: t.green }} t={t} color={t.green} />
      </div>
    )}
  </div>
);

// ============================================================================
// TRANSACTION TABLE
// ============================================================================
const CategoryBadge = ({ name, t }) => {
  const color = CATEGORY_COLORS[name] || t.textSecondary;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 520, color,
      background: `${color}11`, padding: "3px 9px", borderRadius: 4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, opacity: 0.7 }} />
      {name}
    </span>
  );
};

const TagChip = ({ name, t }) => (
  <span style={{
    fontSize: 10, fontWeight: 500, color: t.textTertiary,
    border: `1px solid ${t.border}`, padding: "1px 7px", borderRadius: 3,
  }}>{name}</span>
);

const TxRow = ({ tx, onClick, selected, t }) => (
  <tr
    onClick={() => onClick(tx)}
    style={{
      cursor: "pointer",
      background: selected ? t.accentSubtle : "transparent",
      transition: "background 0.1s ease",
      borderBottom: `1px solid ${t.borderSubtle}`,
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = t.bgHover; }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
  >
    <td style={{ padding: "10px 14px", fontSize: 12, color: t.textSecondary, fontVariantNumeric: "tabular-nums" }}>{tx.date}</td>
    <td style={{ padding: "10px 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 520, color: t.text, marginBottom: 2 }}>{tx.displayName}</div>
      <div style={{ fontSize: 11, color: t.textTertiary, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{tx.desc.length > 30 ? tx.desc.slice(0, 30) + "…" : tx.desc}</div>
    </td>
    <td style={{ padding: "10px 14px" }}><CategoryBadge name={tx.category} t={t} /></td>
    <td style={{ padding: "10px 14px" }}>
      <span style={{
        fontSize: 11, fontWeight: 500, color: t.textTertiary,
        background: t.bgSubtle, padding: "2px 8px", borderRadius: 4,
      }}>{tx.card}</span>
    </td>
    <td style={{ padding: "10px 14px" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {tx.tags.map((tag) => <TagChip key={tag} name={tag} t={t} />)}
      </div>
    </td>
    <td style={{
      padding: "10px 14px", textAlign: "right",
      fontSize: 13, fontWeight: 580, fontVariantNumeric: "tabular-nums",
      color: tx.amount > 0 ? t.green : t.text,
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    }}>
      {tx.amount > 0 && "+"}{fmt(tx.amount)}
    </td>
  </tr>
);

const TransactionTable = ({ selectedTx, setSelectedTx, t, card, search }) => {
  const filtered = TRANSACTIONS.filter((tx) => {
    if (card !== "all" && tx.card !== card) return false;
    if (search && !tx.displayName.toLowerCase().includes(search.toLowerCase()) && !tx.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            {["Date", "Description", "Category", "Card", "Tags", "Amount"].map((h, i) => (
              <th key={h} style={{
                padding: "8px 14px", fontSize: 10, fontWeight: 600, color: t.textTertiary,
                textAlign: i === 5 ? "right" : "left", letterSpacing: "0.06em", textTransform: "uppercase",
                position: "sticky", top: 0, background: t.bg, zIndex: 1,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((tx) => (
            <TxRow key={tx.id} tx={tx} onClick={setSelectedTx} selected={selectedTx?.id === tx.id} t={t} />
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: t.textTertiary, fontSize: 13 }}>
          No transactions found
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SIDE PANEL (transaction detail / enrichment)
// ============================================================================
const SidePanel = ({ tx, onClose, t }) => {
  if (!tx) return null;
  return (
    <div style={{
      width: 340, minWidth: 340, borderLeft: `1px solid ${t.border}`,
      background: t.bgPanel, height: "100vh", overflowY: "auto",
      animation: "slideIn 0.15s ease",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase" }}>Transaction Detail</span>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", color: t.textTertiary,
          fontSize: 18, lineHeight: 1, padding: "2px 6px", borderRadius: 4,
        }}
          onMouseEnter={(e) => e.target.style.background = t.bgHover}
          onMouseLeave={(e) => e.target.style.background = "none"}
        >×</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Amount */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{
            fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em",
            color: tx.amount > 0 ? t.green : t.text,
            fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          }}>
            {tx.amount > 0 && "+"}{fmt(tx.amount)}
          </div>
          <div style={{ fontSize: 12, color: t.textTertiary, marginTop: 4 }}>
            {tx.type === "Return" ? "Credit / Return" : "Purchase"}
          </div>
        </div>

        {/* Fields */}
        {[
          { label: "Merchant", value: tx.displayName, editable: true },
          { label: "Raw Description", value: tx.desc, mono: true },
          { label: "Date", value: tx.date },
          { label: "Posted", value: tx.posted },
          { label: "Card", value: tx.card },
        ].map(({ label, value, editable, mono }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
            <div style={{
              fontSize: 13, color: t.text, fontWeight: editable ? 520 : 400,
              padding: editable ? "7px 10px" : "0",
              border: editable ? `1px solid ${t.border}` : "none",
              borderRadius: editable ? 6 : 0,
              background: editable ? t.bgSubtle : "transparent",
              fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "inherit",
              fontSize: mono ? 11 : 13,
              cursor: editable ? "text" : "default",
            }}>{value}</div>
          </div>
        ))}

        {/* Category (editable) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Category</div>
          <select style={{
            width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
            border: `1px solid ${t.border}`, background: t.bgSubtle, color: t.text,
            fontFamily: "'Geist', 'Inter', system-ui, sans-serif", cursor: "pointer",
          }} defaultValue={tx.category}>
            {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Tags</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {tx.tags.map((tag) => <TagChip key={tag} name={tag} t={t} />)}
            <button style={{
              fontSize: 10, color: t.accent, background: "none", border: `1px dashed ${t.border}`,
              padding: "1px 8px", borderRadius: 3, cursor: "pointer", fontWeight: 500,
            }}>+ Add</button>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: t.textTertiary, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Notes</div>
          <textarea placeholder="Add a note..." style={{
            width: "100%", minHeight: 72, padding: "8px 10px", borderRadius: 6,
            border: `1px solid ${t.border}`, background: t.bgSubtle, color: t.text,
            fontSize: 12, fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
            resize: "vertical", boxSizing: "border-box",
          }} />
        </div>

        {/* Split Button */}
        <button style={{
          width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 12, fontWeight: 550,
          border: `1px solid ${t.border}`, background: "transparent", color: t.textSecondary,
          cursor: "pointer", fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          transition: "all 0.15s ease",
        }}
          onMouseEnter={(e) => { e.target.style.background = t.bgHover; e.target.style.color = t.text; }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = t.textSecondary; }}
        >
          Split Transaction →
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// INSIGHTS VIEW
// ============================================================================
const MiniBar = ({ pct, color, t }) => (
  <div style={{ flex: 1, height: 8, borderRadius: 4, background: t.bgActive, overflow: "hidden" }}>
    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color, transition: "width 0.5s ease" }} />
  </div>
);

const InsightsView = ({ t }) => {
  const catData = [
    { name: "Groceries", amount: 30907, pct: 42.6, change: -12 },
    { name: "Food & Drink", amount: 8510, pct: 11.7, change: 23 },
    { name: "Gas", amount: 10936, pct: 15.1, change: -5 },
    { name: "Shopping", amount: 5786, pct: 8.0, change: -31 },
    { name: "Entertainment", amount: 2648, pct: 3.7, change: 0 },
  ];

  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const spendData = [3124, 2876, 3456, 4102, 3312, 2891];
  const maxSpend = Math.max(...spendData);

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "100vh" }}>
      <h2 style={{ fontSize: 20, fontWeight: 650, color: t.text, letterSpacing: "-0.02em", marginBottom: 4 }}>Insights</h2>
      <p style={{ fontSize: 13, color: t.textTertiary, marginBottom: 28 }}>February 2026 · All Cards</p>

      {/* Wins Banner */}
      <div style={{
        padding: "16px 20px", borderRadius: 10, marginBottom: 24,
        background: `linear-gradient(135deg, ${t.greenSubtle}, ${t.greenBg})`,
        border: `1px solid ${t.green}22`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 620, color: t.green, marginBottom: 6 }}>★ February Wins</div>
        <div style={{ fontSize: 12, color: t.green, opacity: 0.85, lineHeight: 1.7 }}>
          Shopping down 31% vs. January · Groceries down 12% · 18-day streak under avg daily spend
        </div>
      </div>

      {/* Two Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Category Breakdown */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 18 }}>Spending by Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {catData.map((c) => (
              <div key={c.name}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[c.name] }} />
                    <span style={{ fontSize: 12, fontWeight: 520, color: t.text }}>{c.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 580, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmt(-c.amount)}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 550,
                      color: c.change < 0 ? t.green : c.change > 0 ? t.red : t.textTertiary,
                    }}>
                      {c.change < 0 ? "↓" : c.change > 0 ? "↑" : "="}{Math.abs(c.change)}%
                    </span>
                  </div>
                </div>
                <MiniBar pct={c.pct} color={CATEGORY_COLORS[c.name]} t={t} />
              </div>
            ))}
          </div>
        </div>

        {/* Spending Trend */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 18 }}>6 Month Trend</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, paddingTop: 10 }}>
            {spendData.map((val, i) => {
              const h = (val / maxSpend) * 140;
              const isCurrent = i === spendData.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 550, color: isCurrent ? t.accent : t.textTertiary, fontVariantNumeric: "tabular-nums" }}>${Math.round(val / 100)}</span>
                  <div style={{
                    width: "100%", height: h, borderRadius: 5,
                    background: isCurrent ? t.accent : t.bgActive,
                    transition: "height 0.5s ease",
                  }} />
                  <span style={{ fontSize: 10, fontWeight: 500, color: t.textTertiary }}>{months[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FIRE Impact Card */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 14 }}>FIRE Impact</div>
          <div style={{ fontSize: 13, color: t.text, lineHeight: 1.8, fontWeight: 440 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: t.green, fontWeight: 600 }}>$68/mo saved</span> in Groceries vs. 6-month avg
            </div>
            <div style={{ fontSize: 11, color: t.textSecondary, lineHeight: 1.7 }}>
              If sustained, this compounds to <span style={{ fontWeight: 600, color: t.accent }}>$14,280</span> over 10 years at 7% returns — that's <span style={{ fontWeight: 600, color: t.green }}>0.24%</span> of your FIRE goal.
            </div>
          </div>
        </div>

        {/* Month vs Month */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 14 }}>Jan vs Feb</div>
          {[
            { cat: "Groceries", jan: 35200, feb: 30907 },
            { cat: "Food & Drink", jan: 6910, feb: 8510 },
            { cat: "Shopping", jan: 8400, feb: 5786 },
          ].map(({ cat, jan, feb }) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
              <span style={{ fontSize: 12, color: t.text, fontWeight: 500, flex: 1 }}>{cat}</span>
              <span style={{ fontSize: 11, color: t.textTertiary, fontVariantNumeric: "tabular-nums", width: 70, textAlign: "right" }}>{fmt(-jan)}</span>
              <span style={{ fontSize: 12, color: t.textTertiary, padding: "0 10px" }}>→</span>
              <span style={{ fontSize: 11, fontWeight: 580, color: feb < jan ? t.green : t.red, fontVariantNumeric: "tabular-nums", width: 70, textAlign: "right" }}>{fmt(-feb)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// RECURRING VIEW
// ============================================================================
const RecurringView = ({ t }) => {
  const totalMonthly = SUBSCRIPTIONS.reduce((s, sub) => s + sub.amount, 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "100vh" }}>
      <h2 style={{ fontSize: 20, fontWeight: 650, color: t.text, letterSpacing: "-0.02em", marginBottom: 4 }}>Recurring Charges</h2>
      <p style={{ fontSize: 13, color: t.textTertiary, marginBottom: 24 }}>Auto-detected subscriptions and recurring payments</p>

      {/* Totals */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <StatCard label="Monthly Total" value={fmt(-totalMonthly)} t={t} />
        <StatCard label="Annual Total" value={fmt(-totalAnnual)} t={t} sub={{ icon: "◇", text: `${((totalAnnual / 600000000) * 100).toFixed(2)}% of FIRE goal/yr`, color: t.orange }} />
        <StatCard label="Active Subscriptions" value={SUBSCRIPTIONS.length} t={t} />
      </div>

      {/* Subscription List */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
        {SUBSCRIPTIONS.map((sub, i) => (
          <div key={sub.name} style={{
            display: "flex", alignItems: "center", padding: "14px 20px",
            borderBottom: i < SUBSCRIPTIONS.length - 1 ? `1px solid ${t.borderSubtle}` : "none",
            transition: "background 0.1s ease",
            cursor: "pointer",
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = t.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            {/* Icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: t.bgSubtle,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, marginRight: 14, border: `1px solid ${t.border}`,
            }}>
              {sub.name[0]}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 560, color: t.text }}>{sub.name}</div>
              <div style={{ fontSize: 11, color: t.textTertiary }}>
                {sub.cycle} · since {sub.since.slice(0, 7)}
              </div>
            </div>

            {/* Review reminder */}
            {sub.review && (
              <span style={{
                fontSize: 10, fontWeight: 550, color: t.orange,
                background: t.orangeSubtle, padding: "3px 8px", borderRadius: 4, marginRight: 14,
              }}>Review by {sub.review.slice(5)}</span>
            )}

            {/* Category */}
            <CategoryBadge name={sub.category} t={t} />

            {/* Amount */}
            <div style={{
              fontSize: 13, fontWeight: 600, color: t.text, marginLeft: 20, minWidth: 70, textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>{fmt(-sub.amount)}/mo</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// GOALS / FIRE VIEW
// ============================================================================
const GoalsView = ({ t }) => {
  const target = 6000000;
  const currentSavingsRate = 0.32;
  const monthlyContribution = 3200;

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "100vh" }}>
      <h2 style={{ fontSize: 20, fontWeight: 650, color: t.text, letterSpacing: "-0.02em", marginBottom: 4 }}>Goals</h2>
      <p style={{ fontSize: 13, color: t.textTertiary, marginBottom: 28 }}>Track spending impact on your FIRE journey</p>

      {/* FIRE Target Card */}
      <div style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 620, color: t.text }}>Early Retirement</div>
            <div style={{ fontSize: 12, color: t.textTertiary, marginTop: 2 }}>Target: $6,000,000 by age 45</div>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 700, color: t.accent, letterSpacing: "-0.03em",
            fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          }}>32%</div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 10, borderRadius: 5, background: t.bgActive, marginBottom: 16, overflow: "hidden" }}>
          <div style={{
            width: "32%", height: "100%", borderRadius: 5,
            background: `linear-gradient(90deg, ${t.accent}, #7C3AED)`,
          }} />
        </div>

        <div style={{ display: "flex", gap: 20, fontSize: 11, color: t.textSecondary }}>
          <span>Savings Rate: <strong style={{ color: t.green }}>32%</strong></span>
          <span>Monthly Contrib: <strong style={{ color: t.text }}>${(monthlyContribution).toLocaleString()}</strong></span>
          <span>Est. Completion: <strong style={{ color: t.accent }}>2041</strong></span>
        </div>
      </div>

      {/* Impact Calculator */}
      <div style={{
        background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 24, marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 18 }}>
          Spending Reduction Impact
        </div>

        {[
          { label: "Cut $50/mo in dining", impact: 8673, years: 10 },
          { label: "Cut $100/mo in shopping", impact: 17346, years: 10 },
          { label: "Cancel 3 subscriptions ($45/mo)", impact: 7806, years: 10 },
        ].map(({ label, impact, years }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: `1px solid ${t.borderSubtle}`,
          }}>
            <span style={{ fontSize: 13, color: t.text, fontWeight: 480 }}>{label}</span>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 14, fontWeight: 620, color: t.green }}>{fmt(impact * 100)}</span>
              <span style={{ fontSize: 11, color: t.textTertiary, marginLeft: 6 }}>over {years}yr at 7%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Savings Rate Trend */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 18 }}>
          Savings Rate Trend
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {[28, 31, 26, 24, 30, 32].map((rate, i) => {
            const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
            const isCurrent = i === 5;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 560, color: isCurrent ? t.green : t.textTertiary }}>{rate}%</span>
                <div style={{
                  width: "100%", height: rate * 3.2, borderRadius: 4,
                  background: isCurrent ? t.green : t.bgActive,
                }} />
                <span style={{ fontSize: 10, color: t.textTertiary }}>{months[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS VIEW
// ============================================================================
const SettingsView = ({ t, theme, setTheme }) => (
  <div style={{ padding: 28, overflowY: "auto", height: "100vh", maxWidth: 560 }}>
    <h2 style={{ fontSize: 20, fontWeight: 650, color: t.text, letterSpacing: "-0.02em", marginBottom: 24 }}>Settings</h2>

    {/* Theme */}
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Appearance</div>
      <div style={{ display: "flex", gap: 8 }}>
        {["light", "dark"].map((opt) => (
          <button key={opt} onClick={() => setTheme(opt)} style={{
            flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 530,
            border: `1px solid ${theme === opt ? t.accent : t.border}`,
            background: theme === opt ? t.accentSubtle : "transparent",
            color: theme === opt ? t.accent : t.textSecondary,
            cursor: "pointer", textTransform: "capitalize",
            fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          }}>{opt}</button>
        ))}
      </div>
    </div>

    {/* Cards Management */}
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Cards</div>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
        {[
          { name: "Connor's Sapphire", last4: "4821", issuer: "Chase" },
          { name: "Heather's Freedom", last4: "7392", issuer: "Chase" },
        ].map((card, i) => (
          <div key={card.name} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
            borderBottom: i === 0 ? `1px solid ${t.borderSubtle}` : "none",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 520, color: t.text }}>{card.name}</div>
              <div style={{ fontSize: 11, color: t.textTertiary }}>•••• {card.last4} · {card.issuer}</div>
            </div>
            <button style={{
              fontSize: 11, color: t.textTertiary, background: "none", border: `1px solid ${t.border}`,
              padding: "4px 10px", borderRadius: 4, cursor: "pointer",
            }}>Edit</button>
          </div>
        ))}
      </div>
      <button style={{
        marginTop: 8, fontSize: 12, color: t.accent, background: "none", border: "none",
        cursor: "pointer", fontWeight: 550, padding: "4px 0",
      }}>+ Add Card</button>
    </div>

    {/* Rules */}
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Smart Rules</div>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
        {[
          { pattern: "STARBUCKS", type: "cleanup", result: "Starbucks" },
          { pattern: "WHOLE FOODS", type: "cleanup", result: "Whole Foods" },
          { pattern: "NETFLIX", type: "categorize", result: "Entertainment" },
        ].map((rule, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", padding: "10px 16px",
            borderBottom: i < 2 ? `1px solid ${t.borderSubtle}` : "none",
            fontSize: 12,
          }}>
            <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 11, color: t.accent, flex: 1 }}>{rule.pattern}</span>
            <span style={{ color: t.textTertiary, padding: "0 10px" }}>→</span>
            <span style={{ fontWeight: 520, color: t.text, flex: 1 }}>{rule.result}</span>
            <span style={{
              fontSize: 9, fontWeight: 550, padding: "2px 6px", borderRadius: 3,
              background: rule.type === "cleanup" ? t.purpleSubtle : t.accentSubtle,
              color: rule.type === "cleanup" ? t.purple : t.accent,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>{rule.type}</span>
          </div>
        ))}
      </div>
      <button style={{
        marginTop: 8, fontSize: 12, color: t.accent, background: "none", border: "none",
        cursor: "pointer", fontWeight: 550, padding: "4px 0",
      }}>+ Add Rule</button>
    </div>

    {/* Backup */}
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Data</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{
          padding: "9px 16px", borderRadius: 6, fontSize: 12, fontWeight: 550,
          border: `1px solid ${t.border}`, background: "transparent", color: t.text,
          cursor: "pointer", fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        }}>Back Up Database</button>
        <button style={{
          padding: "9px 16px", borderRadius: 6, fontSize: 12, fontWeight: 550,
          border: `1px solid ${t.border}`, background: "transparent", color: t.textSecondary,
          cursor: "pointer", fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        }}>Restore from Backup</button>
      </div>
    </div>
  </div>
);

// ============================================================================
// REPORTS VIEW (placeholder for Heather's shareable view)
// ============================================================================
const ReportsView = ({ t }) => (
  <div style={{ padding: 28, overflowY: "auto", height: "100vh" }}>
    <h2 style={{ fontSize: 20, fontWeight: 650, color: t.text, letterSpacing: "-0.02em", marginBottom: 4 }}>Reports</h2>
    <p style={{ fontSize: 13, color: t.textTertiary, marginBottom: 28 }}>Shareable summaries for household review</p>
    <div style={{
      padding: 40, borderRadius: 10, border: `2px dashed ${t.border}`,
      textAlign: "center", color: t.textTertiary,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>▤</div>
      <div style={{ fontSize: 13, fontWeight: 520, marginBottom: 4 }}>Phase 4 Feature</div>
      <div style={{ fontSize: 12 }}>Shareable read-only summaries and joint review mode</div>
    </div>
  </div>
);

// ============================================================================
// TOOLBAR
// ============================================================================
const Toolbar = ({ search, setSearch, t }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, padding: "12px 28px",
    borderBottom: `1px solid ${t.border}`,
  }}>
    {/* Search */}
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 320,
      padding: "7px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
      background: t.bgSubtle,
    }}>
      <span style={{ color: t.textTertiary, fontSize: 13 }}>⌕</span>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search transactions..."
        style={{
          border: "none", background: "none", outline: "none",
          fontSize: 12, color: t.text, flex: 1,
          fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        }}
      />
      <KbdHint keys={["/"]} t={t} />
    </div>

    {/* Date Filter */}
    <select style={{
      padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
      border: `1px solid ${t.border}`, background: t.bgSubtle, color: t.text,
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif", cursor: "pointer",
    }}>
      <option>February 2026</option>
      <option>January 2026</option>
      <option>December 2025</option>
      <option>Custom Range...</option>
    </select>

    {/* Category Filter */}
    <select style={{
      padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
      border: `1px solid ${t.border}`, background: t.bgSubtle, color: t.text,
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif", cursor: "pointer",
    }}>
      <option>All Categories</option>
      {Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}
    </select>

    <div style={{ flex: 1 }} />

    {/* Import Button */}
    <button style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 570,
      border: "none", background: t.accent, color: "#fff", cursor: "pointer",
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    }}>
      ↑ Import CSV
      <KbdHint keys={["⌘", "I"]} t={{ ...t, border: "rgba(255,255,255,0.2)", bgSubtle: "rgba(255,255,255,0.1)", textSecondary: "rgba(255,255,255,0.7)" }} />
    </button>
  </div>
);

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("transactions");
  const [selectedTx, setSelectedTx] = useState(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [card, setCard] = useState("all");
  const [search, setSearch] = useState("");
  const t = tokens[theme];

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const map = { "1": "transactions", "2": "insights", "3": "recurring", "4": "goals", "5": "reports" };
      if (map[e.key]) { e.preventDefault(); setView(map[e.key]); }
      if (e.key === "Escape") setSelectedTx(null);
      if (e.key === "/") { e.preventDefault(); document.querySelector("input")?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: t.bg, color: t.text,
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${t.accent}33; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.bgActive}; border-radius: 3px; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Sidebar */}
      <Sidebar view={view} setView={setView} t={t} card={card} setCard={setCard} />

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {view === "transactions" && (
          <>
            <Toolbar search={search} setSearch={setSearch} t={t} />
            <SummaryBar expanded={summaryExpanded} setExpanded={setSummaryExpanded} t={t} />
            <div style={{ flex: 1, overflow: "auto" }}>
              <TransactionTable selectedTx={selectedTx} setSelectedTx={setSelectedTx} t={t} card={card} search={search} />
            </div>
          </>
        )}
        {view === "insights" && <InsightsView t={t} />}
        {view === "recurring" && <RecurringView t={t} />}
        {view === "goals" && <GoalsView t={t} />}
        {view === "reports" && <ReportsView t={t} />}
        {view === "settings" && <SettingsView t={t} theme={theme} setTheme={setTheme} />}
      </div>

      {/* Side Panel */}
      {view === "transactions" && selectedTx && (
        <SidePanel tx={selectedTx} onClose={() => setSelectedTx(null)} t={t} />
      )}
    </div>
  );
}
