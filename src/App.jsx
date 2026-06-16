import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Configuração Supabase ─────────────────────────────────────────────────
const SUPABASE_URL = "https://ycyqdcpamifghuludkjr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljeXFkY3BhbWlmZ2h1bHVka2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzUxNzIsImV4cCI6MjA5NzIxMTE3Mn0.OKeerUv7G_4YFYeSF57nCyfFsRHTd3rGvdQhPVGItGE";
const REST_URL = `${SUPABASE_URL}/rest/v1/encomendas`;
const HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// ─── Paleta & constantes ──────────────────────────────────────────────────────
const C = {
  marrom:    "#5B2E1E",
  caramelo:  "#7A4A32",
  creme:     "#E6D6C2",
  verde:     "#5A6447",
  salvia:    "#8A9171",
  cremedark: "#D4BFA0",
  bg:        "#FAF6F1",
  white:     "#FFFFFF",
};

const PRODUTOS = [
  { id: "ninho",      label: "Ninho c/ Nutella", emoji: "🍫", cor: C.salvia },
  { id: "doceleit",   label: "Doce de Leite",    emoji: "🍯", cor: C.caramelo },
  { id: "brigadeiro", label: "Brigadeiro",       emoji: "🎂", cor: C.marrom },
  { id: "miettes",    label: "Miettes",          emoji: "✨", cor: C.verde },
];

const STATUS = ["Pendente", "Confirmado", "Entregue", "Cancelado"];
const STATUS_COR = {
  "Pendente":   { bg: "#FFF3CD", txt: "#856404" },
  "Confirmado": { bg: "#D4EDDA", txt: "#155724" },
  "Entregue":   { bg: "#D1ECF1", txt: "#0C5460" },
  "Cancelado":  { bg: "#F8D7DA", txt: "#721C24" },
};

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatarData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// Converte registro do Supabase (snake_case) para o formato usado na UI
function dbParaUi(row) {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone || "",
    dataEntrega: row.data_entrega,
    status: row.status,
    observacoes: row.observacoes || "",
    qtd: {
      ninho: row.qtd_ninho || 0,
      doceleit: row.qtd_doceleit || 0,
      brigadeiro: row.qtd_brigadeiro || 0,
      miettes: row.qtd_miettes || 0,
    },
  };
}

// Converte do formato UI para o formato esperado pelo Supabase
function uiParaDb(enc) {
  return {
    id: enc.id,
    nome: enc.nome,
    telefone: enc.telefone || null,
    data_entrega: enc.dataEntrega,
    status: enc.status,
    observacoes: enc.observacoes || null,
    qtd_ninho: Number(enc.qtd.ninho) || 0,
    qtd_doceleit: Number(enc.qtd.doceleit) || 0,
    qtd_brigadeiro: Number(enc.qtd.brigadeiro) || 0,
    qtd_miettes: Number(enc.qtd.miettes) || 0,
  };
}

function resetForm() {
  return {
    nome: "",
    telefone: "",
    dataEntrega: "",
    observacoes: "",
    status: "Pendente",
    qtd: { ninho: 0, doceleit: 0, brigadeiro: 0, miettes: 0 },
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function BrowneEncomendas() {
  const [aba, setAba] = useState("encomendas");
  const [encomendas, setEncomendas] = useState([]);
  const [form, setForm] = useState(resetForm());
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // ── Buscar encomendas do Supabase ──────────────────────────────────────────
  const buscarEncomendas = useCallback(async () => {
    try {
      setErro("");
      const res = await fetch(`${REST_URL}?select=*&order=data_entrega.asc`, { headers: HEADERS });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      setEncomendas(data.map(dbParaUi));
    } catch (e) {
      setErro("Não foi possível carregar as encomendas. Verifique sua conexão.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarEncomendas();
  }, [buscarEncomendas]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function salvar() {
    const totalQtd = Object.values(form.qtd).reduce((a, b) => a + Number(b), 0);
    if (!form.nome.trim() || !form.dataEntrega || totalQtd === 0) return;

    setSalvando(true);
    setErro("");
    try {
      if (editandoId) {
        const payload = uiParaDb({ ...form, id: editandoId });
        const res = await fetch(`${REST_URL}?id=eq.${editandoId}`, {
          method: "PATCH",
          headers: { ...HEADERS, "Prefer": "return=representation" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const [atualizado] = await res.json();
        setEncomendas(prev => prev.map(e => (e.id === editandoId ? dbParaUi(atualizado) : e)));
        setEditandoId(null);
      } else {
        const novoId = gerarId();
        const payload = uiParaDb({ ...form, id: novoId });
        const res = await fetch(REST_URL, {
          method: "POST",
          headers: { ...HEADERS, "Prefer": "return=representation" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const [criado] = await res.json();
        setEncomendas(prev => [...prev, dbParaUi(criado)]);
      }
      setForm(resetForm());
    } catch (e) {
      setErro("Não foi possível salvar. Tenta novamente em alguns segundos.");
    } finally {
      setSalvando(false);
    }
  }

  function editar(enc) {
    setForm({ ...enc, qtd: { ...enc.qtd } });
    setEditandoId(enc.id);
    setAba("encomendas");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remover(id) {
    if (!window.confirm("Remover esta encomenda?")) return;
    setErro("");
    try {
      const res = await fetch(`${REST_URL}?id=eq.${id}`, { method: "DELETE", headers: HEADERS });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setEncomendas(prev => prev.filter(e => e.id !== id));
      if (editandoId === id) { setEditandoId(null); setForm(resetForm()); }
    } catch (e) {
      setErro("Não foi possível remover. Tenta novamente.");
    }
  }

  async function alterarStatus(id, status) {
    setEncomendas(prev => prev.map(e => (e.id === id ? { ...e, status } : e))); // otimista
    try {
      const res = await fetch(`${REST_URL}?id=eq.${id}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
    } catch (e) {
      setErro("Não foi possível atualizar o status. Recarregando lista...");
      buscarEncomendas();
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(resetForm());
  }

  // ── Consolidado ────────────────────────────────────────────────────────────
  const consolidado = useMemo(() => {
    const mapa = {};
    encomendas
      .filter(e => e.status !== "Cancelado")
      .forEach(e => {
        const d = e.dataEntrega;
        if (!mapa[d]) mapa[d] = { ninho: 0, doceleit: 0, brigadeiro: 0, miettes: 0, total: 0 };
        PRODUTOS.forEach(p => {
          mapa[d][p.id] += Number(e.qtd[p.id]) || 0;
          mapa[d].total += Number(e.qtd[p.id]) || 0;
        });
      });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, qtds]) => ({ data, ...qtds }));
  }, [encomendas]);

  // ── Lista filtrada ─────────────────────────────────────────────────────────
  const listaFiltrada = useMemo(() => {
    return encomendas
      .filter(e => {
        const matchBusca = e.nome.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === "Todos" || e.status === filtroStatus;
        return matchBusca && matchStatus;
      })
      .sort((a, b) => a.dataEntrega.localeCompare(b.dataEntrega));
  }, [encomendas, busca, filtroStatus]);

  // ── Totais rápidos ─────────────────────────────────────────────────────────
  const totaisGerais = useMemo(() => {
    const r = { ninho: 0, doceleit: 0, brigadeiro: 0, miettes: 0 };
    encomendas
      .filter(e => e.status !== "Cancelado")
      .forEach(e => PRODUTOS.forEach(p => { r[p.id] += Number(e.qtd[p.id]) || 0; }));
    return r;
  }, [encomendas]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const totalForm = Object.values(form.qtd).reduce((a, b) => a + Number(b), 0);
  const podeSalvar = form.nome.trim() && form.dataEntrega && totalForm > 0 && !salvando;

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: C.bg, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{
        background: C.marrom,
        padding: "20px 24px 14px",
        textAlign: "center",
      }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: C.creme, fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: 3 }}>
          BROWNÊ
        </p>
        <p style={{ color: C.cremedark, fontSize: 10, letterSpacing: 2, margin: "4px 0 0", textTransform: "uppercase" }}>
          Gestão de Encomendas
        </p>
      </header>

      {/* ── Aviso de erro de conexão ──────────────────────────────────────── */}
      {erro && (
        <div style={{ background: "#F8D7DA", color: "#721C24", padding: "8px 16px", fontSize: 12, textAlign: "center", fontWeight: 600 }}>
          ⚠️ {erro}
        </div>
      )}

      {/* ── ABAS ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", background: C.caramelo }}>
        {[["encomendas", "📋 Encomendas"], ["lista", `📦 Lista (${listaFiltrada.length})`], ["consolidado", "📊 Por Dia"]].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} style={{
            flex: 1, padding: "12px 6px", border: "none", cursor: "pointer",
            fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 12,
            textTransform: "uppercase", letterSpacing: 1,
            background: aba === id ? C.bg : "transparent",
            color: aba === id ? C.marrom : C.creme,
            borderBottom: aba === id ? `3px solid ${C.marrom}` : "3px solid transparent",
            transition: "all .2s",
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 40px" }}>

        {carregando ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.caramelo }}>
            <p style={{ fontSize: 36 }}>🍫</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>Carregando encomendas...</p>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════════════
                ABA: FORMULÁRIO DE ENCOMENDA
            ════════════════════════════════════════════════════════════════ */}
            {aba === "encomendas" && (
              <div>
                {/* Cards totais rápidos */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
                  {PRODUTOS.map(p => (
                    <div key={p.id} style={{
                      background: C.white, borderRadius: 10, padding: "12px 16px",
                      borderLeft: `4px solid ${p.cor}`, boxShadow: "0 1px 4px rgba(0,0,0,.07)",
                    }}>
                      <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                        {p.emoji} {p.label}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700, color: p.cor, fontFamily: "'Cormorant Garamond', serif" }}>
                        {totaisGerais[p.id]}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Formulário */}
                <div style={{ background: C.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700,
                    color: C.marrom, margin: "0 0 16px", borderBottom: `2px solid ${C.creme}`, paddingBottom: 10,
                  }}>
                    {editandoId ? "✏️ Editar Encomenda" : "Nova Encomenda"}
                  </p>

                  {/* Nome + Telefone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Nome do cliente *</label>
                      <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome completo" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Telefone / WhatsApp</label>
                      <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                        placeholder="(21) 99999-9999" style={inputStyle} />
                    </div>
                  </div>

                  {/* Data + Status */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Data de entrega *</label>
                      <input type="date" value={form.dataEntrega} min={hoje()}
                        onChange={e => setForm(f => ({ ...f, dataEntrega: e.target.value }))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                        {STATUS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Produtos */}
                  <label style={{ ...labelStyle, display: "block", marginBottom: 8 }}>Produtos *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
                    {PRODUTOS.map(p => (
                      <div key={p.id} style={{
                        border: `1.5px solid ${form.qtd[p.id] > 0 ? p.cor : "#E0D5CA"}`,
                        borderRadius: 8, padding: "10px 14px", background: form.qtd[p.id] > 0 ? p.cor + "15" : "#FAFAFA",
                        transition: "all .2s",
                      }}>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: p.cor }}>
                          {p.emoji} {p.label}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button onClick={() => setForm(f => ({ ...f, qtd: { ...f.qtd, [p.id]: Math.max(0, Number(f.qtd[p.id]) - 1) } }))}
                            style={btnQtdStyle(p.cor)}>−</button>
                          <input type="number" min={0} value={form.qtd[p.id]}
                            onChange={e => setForm(f => ({ ...f, qtd: { ...f.qtd, [p.id]: Math.max(0, parseInt(e.target.value) || 0) } }))}
                            style={{ width: 44, textAlign: "center", border: "1px solid #ccc", borderRadius: 6, padding: "4px 0", fontWeight: 700, fontSize: 16 }} />
                          <button onClick={() => setForm(f => ({ ...f, qtd: { ...f.qtd, [p.id]: Number(f.qtd[p.id]) + 1 } }))}
                            style={btnQtdStyle(p.cor)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Observações */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Observações</label>
                    <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                      placeholder="Mensagem na caixinha, restrições alimentares, endereço..." rows={2}
                      style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} />
                  </div>

                  {/* Botões */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={salvar} disabled={!podeSalvar} style={{
                      flex: 1, padding: "12px", borderRadius: 8, border: "none",
                      background: podeSalvar ? C.marrom : "#ccc", color: C.white,
                      fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 13,
                      cursor: podeSalvar ? "pointer" : "not-allowed", letterSpacing: 1,
                    }}>
                      {salvando ? "SALVANDO..." : editandoId ? "SALVAR ALTERAÇÕES" : `ADICIONAR ENCOMENDA ${totalForm > 0 ? `(${totalForm} un.)` : ""}`}
                    </button>
                    {editandoId && (
                      <button onClick={cancelarEdicao} style={{
                        padding: "12px 16px", borderRadius: 8, border: `2px solid ${C.marrom}`,
                        background: "transparent", color: C.marrom,
                        fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ABA: LISTA DE ENCOMENDAS
            ════════════════════════════════════════════════════════════════ */}
            {aba === "lista" && (
              <div>
                {/* Filtros */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <input value={busca} onChange={e => setBusca(e.target.value)}
                    placeholder="🔍 Buscar por nome..." style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                    <option value="Todos">Todos os status</option>
                    {STATUS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {listaFiltrada.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
                    <p style={{ fontSize: 36 }}>🍫</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
                      {encomendas.length === 0 ? "Nenhuma encomenda ainda." : "Nenhuma encomenda encontrada."}
                    </p>
                  </div>
                ) : (
                  listaFiltrada.map(enc => {
                    const sc = STATUS_COR[enc.status] || STATUS_COR["Pendente"];
                    return (
                      <div key={enc.id} style={{
                        background: C.white, borderRadius: 10, marginBottom: 12,
                        boxShadow: "0 1px 5px rgba(0,0,0,.08)",
                        borderLeft: `4px solid ${enc.status === "Entregue" ? C.verde : enc.status === "Cancelado" ? "#dc3545" : C.marrom}`,
                      }}>
                        <div style={{ padding: "14px 16px" }}>
                          {/* Linha 1: nome + status */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: C.marrom, fontSize: 15 }}>{enc.nome}</p>
                              {enc.telefone && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{enc.telefone}</p>}
                            </div>
                            <select value={enc.status} onChange={e => alterarStatus(enc.id, e.target.value)}
                              style={{
                                background: sc.bg, color: sc.txt, border: "none", borderRadius: 20,
                                padding: "3px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer",
                                fontFamily: "'Montserrat', sans-serif",
                              }}>
                              {STATUS.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>

                          {/* Linha 2: data + produtos */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: enc.observacoes ? 8 : 0 }}>
                            <span style={{ background: C.creme, color: C.marrom, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                              📅 {formatarData(enc.dataEntrega)}
                            </span>
                            {PRODUTOS.map(p => enc.qtd[p.id] > 0 && (
                              <span key={p.id} style={{
                                background: p.cor + "20", color: p.cor, borderRadius: 6,
                                padding: "3px 10px", fontSize: 12, fontWeight: 600,
                              }}>
                                {p.emoji} {p.label}: {enc.qtd[p.id]}
                              </span>
                            ))}
                          </div>

                          {enc.observacoes && (
                            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#666", fontStyle: "italic" }}>
                              💬 {enc.observacoes}
                            </p>
                          )}

                          {/* Ações */}
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => editar(enc)} style={btnAcaoStyle(C.caramelo)}>✏️ Editar</button>
                            <button onClick={() => remover(enc.id)} style={btnAcaoStyle("#dc3545")}>🗑 Remover</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ABA: CONSOLIDADO POR DIA
            ════════════════════════════════════════════════════════════════ */}
            {aba === "consolidado" && (
              <div>
                {consolidado.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
                    <p style={{ fontSize: 36 }}>📊</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
                      Adicione encomendas para ver o consolidado.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tabela */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: C.marrom }}>
                            <th style={thStyle}>Data</th>
                            {PRODUTOS.map(p => <th key={p.id} style={thStyle}>{p.emoji} {p.label}</th>)}
                            <th style={{ ...thStyle, background: C.caramelo }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidado.map((row, i) => (
                            <tr key={row.data} style={{ background: i % 2 === 0 ? C.white : C.bg }}>
                              <td style={{ ...tdStyle, fontWeight: 700, color: C.marrom }}>{formatarData(row.data)}</td>
                              {PRODUTOS.map(p => (
                                <td key={p.id} style={{ ...tdStyle, color: row[p.id] > 0 ? p.cor : "#ccc", fontWeight: row[p.id] > 0 ? 700 : 400 }}>
                                  {row[p.id] > 0 ? row[p.id] : "—"}
                                </td>
                              ))}
                              <td style={{ ...tdStyle, fontWeight: 700, color: C.white, background: C.caramelo, borderRadius: 0 }}>
                                {row.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: C.marrom }}>
                            <td style={{ ...tdStyle, color: C.creme, fontWeight: 700 }}>TOTAL GERAL</td>
                            {PRODUTOS.map(p => (
                              <td key={p.id} style={{ ...tdStyle, color: C.creme, fontWeight: 700 }}>
                                {consolidado.reduce((s, r) => s + r[p.id], 0)}
                              </td>
                            ))}
                            <td style={{ ...tdStyle, color: C.creme, fontWeight: 700, background: C.caramelo }}>
                              {consolidado.reduce((s, r) => s + r.total, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Cards por dia */}
                    <div style={{ marginTop: 20 }}>
                      {consolidado.map(row => (
                        <div key={row.data} style={{
                          background: C.white, borderRadius: 10, marginBottom: 12,
                          boxShadow: "0 1px 5px rgba(0,0,0,.08)", overflow: "hidden",
                        }}>
                          <div style={{ background: C.marrom, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: C.creme }}>
                              {formatarData(row.data)}
                            </p>
                            <span style={{ background: C.caramelo, color: C.white, borderRadius: 20, padding: "2px 12px", fontWeight: 700, fontSize: 14 }}>
                              {row.total} un.
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0 }}>
                            {PRODUTOS.map((p, i) => (
                              <div key={p.id} style={{
                                padding: "12px 16px",
                                borderRight: i % 2 === 0 ? `1px solid ${C.creme}` : "none",
                                borderBottom: i < 2 ? `1px solid ${C.creme}` : "none",
                              }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase" }}>
                                  {p.emoji} {p.label}
                                </p>
                                <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: row[p.id] > 0 ? p.cor : "#ddd" }}>
                                  {row[p.id] > 0 ? row[p.id] : "—"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ── Estilos reutilizáveis ─────────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#5B2E1E",
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
};
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 7,
  border: "1.5px solid #DDD0C4", fontFamily: "'Montserrat', sans-serif",
  fontSize: 13, outline: "none", boxSizing: "border-box", color: "#333",
  background: "#FDFAF7",
};
const btnQtdStyle = (cor) => ({
  width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${cor}`,
  background: "transparent", color: cor, fontSize: 18, fontWeight: 700,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
});
const btnAcaoStyle = (cor) => ({
  padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${cor}`,
  background: "transparent", color: cor, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
});
const thStyle = {
  padding: "10px 12px", color: "#E6D6C2", fontWeight: 700, fontSize: 11,
  textTransform: "uppercase", letterSpacing: 1, textAlign: "center", whiteSpace: "nowrap",
};
const tdStyle = {
  padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #F0E8DF",
};
