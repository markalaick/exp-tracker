import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, Download,
  Moon, Sun, Pencil, X, Check, ChevronLeft, ChevronRight, Repeat,
} from "lucide-react";

if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      if (v === null) throw new Error("not found");
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
  };
}

const CATEGORIES = {
  expense: ["飲食", "交通", "娛樂", "購物", "居住", "醫療", "其他"],
  income: ["薪資", "獎金", "投資", "其他"],
};

const COLORS = ["#7F77DD", "#1D9E75", "#D85A30", "#D4537E", "#378ADD", "#BA7517", "#888780"];

const QUICK_ADDS = [
  { label: "手搖飲", amount: 60, category: "飲食" },
  { label: "便當", amount: 100, category: "飲食" },
  { label: "捷運", amount: 30, category: "交通" },
  { label: "咖啡", amount: 90, category: "飲食" },
];

function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.toISOString().slice(0, 7);
}

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

export default function ExpenseTracker() {
  const [records, setRecords] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(false);

  const [filter, setFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [showRecurringPanel, setShowRecurringPanel] = useState(false);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);

  useEffect(() => {
    (async () => {
      let loadedRecords = [];
      let loadedRecurring = [];
      let loadedBudgets = {};
      let loadedDark = false;
      try {
        const r = await window.storage.get("expense-records");
        if (r && r.value) loadedRecords = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get("recurring-templates");
        if (r && r.value) loadedRecurring = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get("category-budgets");
        if (r && r.value) loadedBudgets = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get("dark-mode");
        if (r && r.value) loadedDark = JSON.parse(r.value);
      } catch (e) {}

      const thisMonth = new Date().toISOString().slice(0, 7);
      const additions = [];
      loadedRecurring.forEach((t) => {
        const exists = loadedRecords.some(
          (r) => r.recurringId === t.id && r.date.slice(0, 7) === thisMonth
        );
        if (!exists) {
          additions.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            type: t.type,
            amount: t.amount,
            category: t.category,
            note: t.note,
            date: new Date().toISOString().slice(0, 10),
            recurringId: t.id,
          });
        }
      });

      setRecords([...additions, ...loadedRecords]);
      setRecurring(loadedRecurring);
      setBudgets(loadedBudgets);
      setDarkMode(loadedDark);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("expense-records", JSON.stringify(records)).catch(() => {});
  }, [records, loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("recurring-templates", JSON.stringify(recurring)).catch(() => {});
  }, [recurring, loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("category-budgets", JSON.stringify(budgets)).catch(() => {});
  }, [budgets, loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.storage.set("dark-mode", JSON.stringify(darkMode)).catch(() => {});
  }, [darkMode, loaded]);

  const addRecord = (overrides) => {
    const num = parseFloat(overrides?.amount ?? amount);
    if (!num || num <= 0) return;
    const rType = overrides?.type ?? type;
    const rCategory = overrides?.category ?? category;
    const rNote = overrides?.note ?? note.trim();
    const rDate = overrides?.date ?? date;

    if (!overrides && isRecurring) {
      const templateId = Date.now().toString();
      const template = { id: templateId, type: rType, amount: num, category: rCategory, note: rNote };
      setRecurring((prev) => [...prev, template]);
      setRecords((prev) => [
        { id: templateId + "-r", type: rType, amount: num, category: rCategory, note: rNote, date: rDate, recurringId: templateId },
        ...prev,
      ]);
    } else {
      setRecords((prev) => [
        { id: Date.now().toString() + Math.random().toString(36).slice(2, 5), type: rType, amount: num, category: rCategory, note: rNote, date: rDate },
        ...prev,
      ]);
    }
    if (!overrides) {
      setAmount("");
      setNote("");
      setIsRecurring(false);
    }
  };

  const deleteRecord = (id) => setRecords((prev) => prev.filter((r) => r.id !== id));
  const removeRecurring = (id) => setRecurring((prev) => prev.filter((t) => t.id !== id));

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditDraft({ ...r });
  };
  const saveEdit = () => {
    setRecords((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...editDraft, amount: parseFloat(editDraft.amount) || r.amount } : r)));
    setEditingId(null);
    setEditDraft(null);
  };

  const recordsThisMonth = useMemo(
    () => records.filter((r) => r.date.slice(0, 7) === selectedMonth),
    [records, selectedMonth]
  );

  const totalIncome = recordsThisMonth.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = recordsThisMonth.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredRecords = recordsThisMonth
    .filter((r) => (filter === "all" ? true : r.type === filter))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const expenseByCategory = CATEGORIES.expense
    .map((cat) => ({
      name: cat,
      value: recordsThisMonth.filter((r) => r.type === "expense" && r.category === cat).reduce((s, r) => s + r.amount, 0),
    }))
    .filter((c) => c.value > 0);

  const trendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(shiftMonth(new Date().toISOString().slice(0, 7), -i));
    return months.map((ym) => ({
      month: monthLabel(ym).replace("年", "/").replace("月", ""),
      支出: records.filter((r) => r.type === "expense" && r.date.slice(0, 7) === ym).reduce((s, r) => s + r.amount, 0),
      收入: records.filter((r) => r.type === "income" && r.date.slice(0, 7) === ym).reduce((s, r) => s + r.amount, 0),
    }));
  }, [records]);

  const fmt = (n) => new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(n || 0);

  const exportCSV = () => {
    const header = ["日期", "類型", "分類", "金額", "備註"];
    const rows = recordsThisMonth
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((r) => [r.date, r.type === "income" ? "收入" : "支出", r.category, r.amount, (r.note || "").replace(/,/g, " ")]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `記帳紀錄_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = darkMode
    ? { bg: "#0f1115", card: "#1a1d24", border: "#2a2e37", text: "#f3f4f6", muted: "#9199a8", input: "#12151b" }
    : { bg: "#f9fafb", card: "#ffffff", border: "#f0f0ef", text: "#1f2937", muted: "#6b7280", input: "#ffffff" };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, padding: "16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet color="#7F77DD" size={26} />
            <h1 style={{ fontSize: 22, fontWeight: 600, color: t.text, margin: 0 }}>我的記帳本</h1>
          </div>
          <button
            onClick={() => setDarkMode((d) => !d)}
            style={{ border: `1px solid ${t.border}`, background: t.card, borderRadius: 10, padding: 8, cursor: "pointer", color: t.text }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* 月份切換 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <button onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))} style={{ border: "none", background: "transparent", cursor: "pointer", color: t.muted }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 500, color: t.text, minWidth: 90, textAlign: "center" }}>{monthLabel(selectedMonth)}</span>
          <button onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))} style={{ border: "none", background: "transparent", cursor: "pointer", color: t.muted }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 總覽卡片 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "收入", value: totalIncome, icon: <TrendingUp size={14} color="#1D9E75" />, color: "#1D9E75" },
            { label: "支出", value: totalExpense, icon: <TrendingDown size={14} color="#D85A30" />, color: "#D85A30" },
            { label: "結餘", value: balance, icon: null, color: balance >= 0 ? t.text : "#D85A30" },
          ].map((c) => (
            <div key={c.label} style={{ background: t.card, borderRadius: 12, padding: 14, border: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: t.muted, fontSize: 12, marginBottom: 4 }}>
                {c.icon}{c.label}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: c.color }}>{fmt(c.value)}</div>
            </div>
          ))}
        </div>

        {/* 預算提醒 */}
        {Object.keys(budgets).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(budgets).filter(([, v]) => v > 0).map(([cat, limit]) => {
              const spent = recordsThisMonth.filter((r) => r.type === "expense" && r.category === cat).reduce((s, r) => s + r.amount, 0);
              const pct = Math.min(100, (spent / limit) * 100);
              const over = spent > limit;
              return (
                <div key={cat} style={{ background: t.card, borderRadius: 10, padding: "10px 14px", border: `1px solid ${over ? "#D85A30" : t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.text, marginBottom: 6 }}>
                    <span>{cat}</span>
                    <span style={{ color: over ? "#D85A30" : t.muted }}>{fmt(spent)} / {fmt(limit)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: t.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: over ? "#D85A30" : "#7F77DD" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 快速輸入 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QUICK_ADDS.map((q) => (
            <button
              key={q.label}
              onClick={() => addRecord({ type: "expense", amount: q.amount, category: q.category, note: q.label, date: new Date().toISOString().slice(0, 10) })}
              style={{ border: `1px solid ${t.border}`, background: t.card, borderRadius: 999, padding: "6px 14px", fontSize: 13, color: t.text, cursor: "pointer" }}
            >
              {q.label} {fmt(q.amount)}
            </button>
          ))}
        </div>

        {/* 新增紀錄表單 */}
        <div style={{ background: t.card, borderRadius: 12, padding: 16, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setType("expense"); setCategory(CATEGORIES.expense[0]); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", background: type === "expense" ? "#D85A30" : t.border, color: type === "expense" ? "#fff" : t.muted }}
            >支出</button>
            <button
              onClick={() => { setType("income"); setCategory(CATEGORIES.income[0]); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", background: type === "income" ? "#1D9E75" : t.border, color: type === "income" ? "#fff" : t.muted }}
            >收入</button>
          </div>

          <input type="number" inputMode="decimal" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, boxSizing: "border-box" }} />

          <div style={{ display: "flex", gap: 8 }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14 }}>
              {CATEGORIES[type].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14 }} />
          </div>

          <input type="text" placeholder="備註（選填）" value={note} onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, boxSizing: "border-box" }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.muted }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            每月固定（之後每個月打開會自動補上這筆）
          </label>

          <button onClick={() => addRecord()}
            style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: "#7F77DD", color: "#fff", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
            <Plus size={16} />新增紀錄
          </button>
        </div>

        {/* 固定支出與預算設定 入口 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowRecurringPanel((v) => !v)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
            <Repeat size={14} />固定支出管理
          </button>
          <button onClick={() => setShowBudgetPanel((v) => !v)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 13, cursor: "pointer" }}>
            預算設定
          </button>
          <button onClick={exportCSV}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
            <Download size={14} />匯出 CSV
          </button>
        </div>

        {showRecurringPanel && (
          <div style={{ background: t.card, borderRadius: 12, padding: 14, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 8 }}>每月固定項目</div>
            {recurring.length === 0 && <div style={{ fontSize: 13, color: t.muted }}>目前沒有設定固定支出/收入</div>}
            {recurring.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${t.border}` }}>
                <span style={{ fontSize: 13, color: t.text }}>{r.category}{r.note ? ` · ${r.note}` : ""}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: r.type === "income" ? "#1D9E75" : "#D85A30" }}>{fmt(r.amount)}</span>
                  <button onClick={() => removeRecurring(r.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: t.muted }}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showBudgetPanel && (
          <div style={{ background: t.card, borderRadius: 12, padding: 14, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 8 }}>各分類每月預算</div>
            {CATEGORIES.expense.map((cat) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 13, color: t.text }}>{cat}</span>
                <input
                  type="number"
                  placeholder="不限制"
                  value={budgets[cat] || ""}
                  onChange={(e) => setBudgets((prev) => ({ ...prev, [cat]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: 100, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, textAlign: "right" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 支出分類圓餅圖 */}
        {expenseByCategory.length > 0 && (
          <div style={{ background: t.card, borderRadius: 12, padding: 16, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 8 }}>{monthLabel(selectedMonth)} 支出分類佔比</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 }}>
              {expenseByCategory.map((c, i) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: t.muted }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], display: "inline-block" }} />
                  {c.name} {fmt(c.value)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 近六個月趨勢 */}
        <div style={{ background: t.card, borderRadius: 12, padding: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 8 }}>近 6 個月收支趨勢</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={{ stroke: t.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="收入" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="支出" fill="#D85A30" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 紀錄列表 */}
        <div style={{ background: t.card, borderRadius: 12, border: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", gap: 8, padding: 12, borderBottom: `1px solid ${t.border}` }}>
            {[["all", "全部"], ["expense", "支出"], ["income", "收入"]].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: filter === key ? t.text : t.border, color: filter === key ? t.bg : t.muted }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {filteredRecords.length === 0 && <div style={{ padding: 24, textAlign: "center", color: t.muted, fontSize: 13 }}>這個月還沒有紀錄</div>}
            {filteredRecords.map((r) =>
              editingId === r.id ? (
                <div key={r.id} style={{ padding: 12, borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                      style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12 }}>
                      {CATEGORIES[editDraft.type].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}
                      style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12 }} />
                  </div>
                  <input type="text" value={editDraft.note || ""} onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })} placeholder="備註"
                    style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12 }} />
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => { setEditingId(null); setEditDraft(null); }} style={{ border: `1px solid ${t.border}`, background: "transparent", color: t.muted, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>取消</button>
                    <button onClick={saveEdit} style={{ border: "none", background: "#7F77DD", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>儲存</button>
                  </div>
                </div>
              ) : (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderTop: `1px solid ${t.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{r.category}</span>
                      <span style={{ fontSize: 11, color: t.muted }}>{r.date}</span>
                      {r.recurringId && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#EEEDFE", color: "#534AB7" }}>固定</span>}
                    </div>
                    {r.note && <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{r.note}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: r.type === "income" ? "#1D9E75" : "#D85A30" }}>
                      {r.type === "income" ? "+" : "-"}{fmt(r.amount)}
                    </span>
                    <button onClick={() => startEdit(r)} style={{ border: "none", background: "transparent", cursor: "pointer", color: t.muted }}><Pencil size={14} /></button>
                    <button onClick={() => deleteRecord(r.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: t.muted }}><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
