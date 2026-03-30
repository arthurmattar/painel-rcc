import { useEffect, useRef, useState } from "react";

// ── DATE / WEEK HELPERS ──────────────────────────────────────────────────────
function parseDate(s) {
  if (!s) return null;
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wn = Math.ceil((((d - y1) / 864e5) + 1) / 7);
  return d.getUTCFullYear() + "-W" + String(wn).padStart(2, "0");
}

function weekLabel(wk) {
  const [y, w] = wk.split("-W").map(Number);
  const j4 = new Date(Date.UTC(y, 0, 4));
  const mon = new Date(j4);
  mon.setUTCDate(j4.getUTCDate() - (j4.getUTCDay() || 7) + 1 + (w - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const f = (d) => String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0");
  return f(mon) + "-" + f(sun);
}

function aggregate(rows) {
  const trMap = {}, colMap = {}, weekSet = new Set();
  rows.forEach(([g, ds, t, r, c]) => {
    const date = parseDate(ds);
    if (!date) return;
    const T = Math.max(0, t || 0);
    const Rv = Math.max(0, r || 0);
    const C = Math.max(0, c || 0);
    const wk = isoWeek(date);
    weekSet.add(wk);
    if (!trMap[g]) trMap[g] = {};
    trMap[g][wk] = (trMap[g][wk] || 0) + T + Rv;
    if (!colMap[g]) colMap[g] = {};
    colMap[g][wk] = (colMap[g][wk] || 0) + C;
  });
  const allWeeks = [...weekSet].sort();
  // remove última semana (incompleta)
  const WEEKS = allWeeks.slice(0, allWeeks.length - 1);
  const LAST6 = WEEKS.slice(-6);
  return { trMap, colMap, WEEKS, LAST6 };
}

function cellBg(v, isTR) {
  if (!v) return "";
  const palTR = ["rgb(15,61,40)", "rgb(26,92,58)", "rgb(30,122,77)", "rgb(45,168,102)", "rgb(61,204,130)"];
  const palCO = ["rgb(15,40,70)", "rgb(20,65,120)", "rgb(30,100,180)", "rgb(60,140,220)", "rgb(96,165,250)"];
  const pal = isTR ? palTR : palCO;
  const i = v >= 15 ? 0 : v >= 10 ? 1 : v >= 6 ? 2 : v >= 3 ? 3 : 4;
  return pal[i];
}

function DataTable({ map, weeks, isTR }) {
  const accent = isTR ? "#3dcc82" : "#60a5fa";
  const [sort, setSort] = useState({ col: "total", asc: false });

  function handleSort(col) {
    setSort((prev) => ({ col, asc: prev.col === col ? !prev.asc : col === "g" }));
  }

  const rows = Object.entries(map)
    .map(([g, cells]) => {
      const total = weeks.reduce((s, wk) => s + (cells[wk] || 0), 0);
      return { g, cells, total };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => {
      let va, vb;
      if (sort.col === "g") { va = a.g.toLowerCase(); vb = b.g.toLowerCase(); }
      else if (sort.col === "total") { va = a.total; vb = b.total; }
      else { va = a.cells[sort.col] || 0; vb = b.cells[sort.col] || 0; }
      return sort.asc ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });

  const wTotals = {};
  weeks.forEach((wk) => { wTotals[wk] = rows.reduce((s, r) => s + (r.cells[wk] || 0), 0); });
  const grand = rows.reduce((s, r) => s + r.total, 0);
  const arrow = (col) => sort.col === col ? (sort.asc ? " ▲" : " ▼") : "";

  const thStyle = (col) => ({
    padding: "5px 8px",
    cursor: "pointer",
    userSelect: "none",
    background: "#1a1a1a",
    whiteSpace: "nowrap",
    fontSize: "11px",
    borderBottom: `2px solid ${accent}`,
    color: sort.col === col ? accent : "#999",
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle("g"), textAlign: "left", minWidth: "200px" }} onClick={() => handleSort("g")}>
              Gerador{arrow("g")}
            </th>
            {weeks.map((wk) => (
              <th key={wk} style={thStyle(wk)} onClick={() => handleSort(wk)}>
                {weekLabel(wk)}{arrow(wk)}
              </th>
            ))}
            <th style={{ ...thStyle("total"), color: accent }} onClick={() => handleSort("total")}>
              TOTAL{arrow("total")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.g} style={{ background: i % 2 === 0 ? "#141414" : "#111" }}>
              <td style={{ padding: "3px 8px", textAlign: "left", color: "#ccc", borderRight: "1px solid #2a2a2a", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", fontSize: "11px" }} title={row.g}>
                {row.g}
              </td>
              {weeks.map((wk) => {
                const v = row.cells[wk] || 0;
                const bg = cellBg(v, isTR);
                return (
                  <td key={wk} style={{ padding: "3px 8px", textAlign: "center", fontSize: "11px", borderRight: "1px solid #1e1e1e", background: bg || "transparent", color: bg ? "#fff" : "#333" }}>
                    {v || "."}
                  </td>
                );
              })}
              <td style={{ padding: "3px 8px", textAlign: "center", fontWeight: "bold", borderLeft: "1px solid #2a2a2a", color: accent, fontSize: "11px" }}>
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#1a1a1a", fontWeight: "bold" }}>
            <td style={{ padding: "5px 8px", color: "#888", textAlign: "left", fontSize: "11px" }}>TOTAL SEMANA</td>
            {weeks.map((wk) => (
              <td key={wk} style={{ padding: "5px 8px", textAlign: "center", color: accent, fontSize: "11px" }}>
                {wTotals[wk] || 0}
              </td>
            ))}
            <td style={{ padding: "5px 8px", textAlign: "center", color: accent, fontSize: "11px" }}>{grand}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BarChart({ trMap, colMap, last6 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || last6.length === 0) return;
    if (typeof window === "undefined") return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = () => {
      if (chartRef.current) chartRef.current.destroy();
      const labels = last6.map(weekLabel);
      const trTotals = last6.map((wk) => Object.values(trMap).reduce((s, c) => s + (c[wk] || 0), 0));
      const colTotals = last6.map((wk) => Object.values(colMap).reduce((s, c) => s + (c[wk] || 0), 0));

      chartRef.current = new window.Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Trocas + Retiradas", data: trTotals, backgroundColor: "#3dcc82", borderRadius: 3 },
            { label: "Colocas", data: colTotals, backgroundColor: "#60a5fa", borderRadius: 3 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#aaa", font: { size: 11 } } },
            tooltip: { backgroundColor: "#1a1a1a", titleColor: "#ccc", bodyColor: "#eee" },
          },
          scales: {
            x: { ticks: { color: "#888", font: { size: 10 } }, grid: { color: "#222" }, autoSkip: false, maxRotation: 30 },
            y: { ticks: { color: "#888", font: { size: 10 } }, grid: { color: "#222" }, beginAtZero: true },
          },
        },
        plugins: [{
          id: "datalabels",
          afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((ds, di) => {
              const meta = chart.getDatasetMeta(di);
              meta.data.forEach((bar, i) => {
                const v = ds.data[i];
                if (!v) return;
                ctx.save();
                ctx.fillStyle = ds.backgroundColor;
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(v, bar.x, bar.y - 3);
                ctx.restore();
              });
            });
          },
        }],
      });
    };
    document.head.appendChild(script);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [trMap, colMap, last6]);

  return (
    <div style={{ position: "relative", width: "100%", height: "360px", marginTop: "8px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json.rows);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { trMap, colMap, WEEKS, LAST6 } = data
    ? aggregate(data)
    : { trMap: {}, colMap: {}, WEEKS: [], LAST6: [] };

  const tabStyles = [
    { base: { padding: "7px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold", background: "#222", color: "#aaa", transition: "all .2s" } },
  ];
  const activeColors = ["#3dcc82", "#60a5fa", "#f59e0b"];
  const activeTextColors = ["#000", "#000", "#000"];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #eee; font-family: sans-serif; font-size: 12px; }
      `}</style>
      <div style={{ padding: "14px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          {["Trocas + Retiradas", "Colocas", "Últimas 6 Semanas"].map((label, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                padding: "7px 16px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                background: tab === i ? activeColors[i] : "#222",
                color: tab === i ? activeTextColors[i] : "#aaa",
                transition: "all .2s",
              }}
            >
              {label}
            </button>
          ))}
          {/* Botão de refresh */}
          <button
            onClick={() => { setLoading(true); setError(null); fetch("/api/data").then(r=>r.json()).then(j=>{ if(j.error) throw new Error(j.error); setData(j.rows); }).catch(e=>setError(e.message)).finally(()=>setLoading(false)); }}
            style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #333", cursor: "pointer", fontSize: "11px", background: "#1a1a1a", color: "#666", marginLeft: "auto" }}
          >
            ↻ Atualizar
          </button>
        </div>

        {loading && (
          <div style={{ color: "#555", fontSize: "12px", padding: "20px 0" }}>Carregando dados da planilha...</div>
        )}
        {error && (
          <div style={{ color: "#f87171", fontSize: "12px", padding: "12px", background: "#1a0000", borderRadius: "6px" }}>
            Erro: {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {tab === 0 && (
              <div>
                <p style={{ color: "#555", fontSize: "10px", marginBottom: "8px" }}>
                  {WEEKS.length} semanas | clique nos cabeçalhos para ordenar
                </p>
                <DataTable map={trMap} weeks={WEEKS} isTR={true} />
              </div>
            )}
            {tab === 1 && (
              <div>
                <p style={{ color: "#555", fontSize: "10px", marginBottom: "8px" }}>
                  {WEEKS.length} semanas | clique nos cabeçalhos para ordenar
                </p>
                <DataTable map={colMap} weeks={WEEKS} isTR={false} />
              </div>
            )}
            {tab === 2 && (
              <div>
                <h2 style={{ color: "#f59e0b", fontSize: "13px", marginBottom: "12px" }}>
                  Total por Semana — Últimas 6 Semanas
                </h2>
                <BarChart trMap={trMap} colMap={colMap} last6={LAST6} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
