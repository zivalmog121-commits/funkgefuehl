import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { loadState, saveState, syncAndSave } from "../lib/storage";

const CATEGORY_LABELS = {
  wendung: { label: "Wendung", icon: "🗣️" },
  register: { label: "Register", icon: "🎯" },
  satzbau: { label: "Satzbau", icon: "✏️" },
  begriff: { label: "Begriff", icon: "🧩" },
};

export default function Sammlung() {
  const [state, setState] = useState(null);
  const [filter, setFilter] = useState("alle");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  if (!state) {
    return (
      <Layout>
        <div className="loading-state">
          <span className="loading-pulse" /> LADE...
        </div>
      </Layout>
    );
  }

  const filtered = state.collection
    .filter((c) => (filter === "alle" ? true : c.category === filter))
    .filter((c) => c.term.toLowerCase().includes(search.toLowerCase()) || c.translation_he.includes(search))
    .slice()
    .reverse();

  const counts = {};
  state.collection.forEach((c) => {
    counts[c.category] = (counts[c.category] || 0) + 1;
  });

  function handleDelete(index) {
    const updated = state.collection.filter((_, i) => i !== index);
    const newState = { ...state, collection: updated };
    saveState(newState);
    // Sync to Firebase in background
    syncAndSave(newState).catch(() => {});
    setState(newState);
  }

  return (
    <Layout title="Sammlung">
      <div className="section-title">📚 Sammlung</div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="🔍 Suche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "2px solid var(--accent)",
            fontFamily: "var(--font-body)",
            fontSize: "0.95rem",
            background: "var(--accent-glow)",
            color: "var(--text)",
          }}
        />
      </div>

      <div className="filter-row">
        <div className={`chip ${filter === "alle" ? "active" : ""}`} onClick={() => setFilter("alle")}>
          Alle ({state.collection.length})
        </div>
        {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
          <div key={key} className={`chip ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
            {val.icon} {val.label} ({counts[key] || 0})
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📡</span>
          {state.collection.length === 0
            ? "Noch nichts gesammelt. Während du spielst, kannst du Ausdrücke mit „+ Zur Sammlung\" speichern."
            : "Keine Einträge gefunden."}
        </div>
      ) : (
        filtered.map((item, idx) => {
          const realIndex = state.collection.indexOf(item);
          return (
            <div key={idx} className="collection-item">
              <div style={{ flex: 1 }}>
                <div className="collection-term">{item.term}</div>
                <div className="collection-translation rtl" dir="rtl">{item.translation_he}</div>
                <div className="collection-meta">
                  {CATEGORY_LABELS[item.category]?.icon} {CATEGORY_LABELS[item.category]?.label || item.category} · {item.addedDate}
                </div>
              </div>
              <button
                className="btn-icon-small"
                onClick={() => handleDelete(realIndex)}
                title="Löschen"
              >
                ✕
              </button>
            </div>
          );
        })
      )}
    </Layout>
  );
}
