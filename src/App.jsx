import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ycyqdcpamifghuludkjr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljeXFkY3BhbWlmZ2h1bHVka2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzUxNzIsImV4cCI6MjA5NzIxMTE3Mn0.OKeerUv7G_4YFYeSF57nCyfFsRHTd3rGvdQhPVGItGE";
const H = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };
const URL_ENC = `${SUPABASE_URL}/rest/v1/encomendas`;
const URL_VEN = `${SUPABASE_URL}/rest/v1/vendas`;

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = { marrom:"#5B2E1E", caramelo:"#7A4A32", creme:"#E6D6C2", verde:"#5A6447", salvia:"#8A9171", cremedark:"#D4BFA0", bg:"#FAF6F1", white:"#FFFFFF" };

const PRODUTOS = [
  { id:"ninho",      label:"Ninho c/ Nutella", emoji:"🍫", cor:C.salvia },
  { id:"doceleit",   label:"Doce de Leite",    emoji:"🍯", cor:C.caramelo },
  { id:"brigadeiro", label:"Brigadeiro",       emoji:"🎂", cor:C.marrom },
  { id:"miettes",    label:"Miettes",          emoji:"✨", cor:C.verde },
];
const PRECO_PADRAO = 10;
const STATUS = ["Pendente","Confirmado","Entregue","Cancelado"];
const STATUS_COR = {
  "Pendente":   { bg:"#FFF3CD", txt:"#856404" },
  "Confirmado": { bg:"#D4EDDA", txt:"#155724" },
  "Entregue":   { bg:"#D1ECF1", txt:"#0C5460" },
  "Cancelado":  { bg:"#F8D7DA", txt:"#721C24" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const gId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtData = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const hoje = () => new Date().toISOString().slice(0,10);
const fmtBRL = v => `R$ ${Number(v).toFixed(2).replace(".",",")}`;

function dbEnc(row) {
  return { id:row.id, nome:row.nome, telefone:row.telefone||"", dataEntrega:row.data_entrega,
    status:row.status, observacoes:row.observacoes||"",
    qtd:{ ninho:row.qtd_ninho||0, doceleit:row.qtd_doceleit||0, brigadeiro:row.qtd_brigadeiro||0, miettes:row.qtd_miettes||0 } };
}
function encDb(e) {
  return { id:e.id, nome:e.nome, telefone:e.telefone||null, data_entrega:e.dataEntrega,
    status:e.status, observacoes:e.observacoes||null,
    qtd_ninho:+e.qtd.ninho||0, qtd_doceleit:+e.qtd.doceleit||0, qtd_brigadeiro:+e.qtd.brigadeiro||0, qtd_miettes:+e.qtd.miettes||0 };
}
function dbVen(row) {
  return { id:row.id, data:row.data, observacoes:row.observacoes||"",
    itens:{ ninho:{qtd:row.qtd_ninho||0, valor:+row.val_ninho||0},
            doceleit:{qtd:row.qtd_doceleit||0, valor:+row.val_doceleit||0},
            brigadeiro:{qtd:row.qtd_brigadeiro||0, valor:+row.val_brigadeiro||0},
            miettes:{qtd:row.qtd_miettes||0, valor:+row.val_miettes||0} } };
}
function venDb(v) {
  return { id:v.id, data:v.data, observacoes:v.observacoes||null,
    qtd_ninho:+v.itens.ninho.qtd||0, val_ninho:+v.itens.ninho.valor||0,
    qtd_doceleit:+v.itens.doceleit.qtd||0, val_doceleit:+v.itens.doceleit.valor||0,
    qtd_brigadeiro:+v.itens.brigadeiro.qtd||0, val_brigadeiro:+v.itens.brigadeiro.valor||0,
    qtd_miettes:+v.itens.miettes.qtd||0, val_miettes:+v.itens.miettes.valor||0 };
}
function resetEnc() { return { nome:"", telefone:"", dataEntrega:"", observacoes:"", status:"Pendente", qtd:{ninho:0,doceleit:0,brigadeiro:0,miettes:0} }; }
function resetVen() { return { data:hoje(), observacoes:"",
  itens:{ ninho:{qtd:0,valor:PRECO_PADRAO}, doceleit:{qtd:0,valor:PRECO_PADRAO}, brigadeiro:{qtd:0,valor:PRECO_PADRAO}, miettes:{qtd:0,valor:PRECO_PADRAO} } }; }

// ─── Mini gráfico de barras inline ───────────────────────────────────────────
function Barras({ dados, cor }) {
  const max = Math.max(...dados.map(d=>d.v), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:48 }}>
      {dados.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <div style={{ width:"100%", background: d.v>0 ? cor : "#EEE", borderRadius:"3px 3px 0 0",
            height: `${Math.max((d.v/max)*44,d.v>0?4:0)}px`, transition:"height .3s" }} />
          <span style={{ fontSize:8, color:"#aaa", writingMode:"vertical-lr", transform:"rotate(180deg)", whiteSpace:"nowrap" }}>{d.l}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [aba, setAba]           = useState("encomendas");
  const [encomendas, setEnc]    = useState([]);
  const [vendas, setVen]        = useState([]);
  const [formEnc, setFormEnc]   = useState(resetEnc());
  const [formVen, setFormVen]   = useState(resetVen());
  const [editEncId, setEditEncId] = useState(null);
  const [editVenId, setEditVenId] = useState(null);
  const [busca, setBusca]       = useState("");
  const [filtroSt, setFiltroSt] = useState("Todos");
  const [loading, setLoading]   = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");

  // ── Carregamento ────────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setErro("");
    try {
      const [rE, rV] = await Promise.all([
        fetch(`${URL_ENC}?select=*&order=data_entrega.asc`, {headers:H}),
        fetch(`${URL_VEN}?select=*&order=data.desc`, {headers:H}),
      ]);
      if (!rE.ok || !rV.ok) throw new Error("Erro ao carregar");
      const [dE, dV] = await Promise.all([rE.json(), rV.json()]);
      setEnc(dE.map(dbEnc));
      setVen(dV.map(dbVen));
    } catch { setErro("Não foi possível carregar os dados. Verifique sua conexão."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── CRUD Encomendas ─────────────────────────────────────────────────────────
  async function salvarEnc() {
    const tot = Object.values(formEnc.qtd).reduce((a,b)=>a+Number(b),0);
    if (!formEnc.nome.trim() || !formEnc.dataEntrega || tot===0) return;
    setSalvando(true); setErro("");
    try {
      if (editEncId) {
        const res = await fetch(`${URL_ENC}?id=eq.${editEncId}`, { method:"PATCH", headers:{...H,"Prefer":"return=representation"}, body:JSON.stringify(encDb({...formEnc,id:editEncId})) });
        if (!res.ok) throw new Error();
        const [a] = await res.json();
        setEnc(prev=>prev.map(e=>e.id===editEncId?dbEnc(a):e));
        setEditEncId(null);
      } else {
        const id = gId();
        const res = await fetch(URL_ENC, { method:"POST", headers:{...H,"Prefer":"return=representation"}, body:JSON.stringify(encDb({...formEnc,id})) });
        if (!res.ok) throw new Error();
        const [c] = await res.json();
        setEnc(prev=>[...prev, dbEnc(c)]);
      }
      setFormEnc(resetEnc());
    } catch { setErro("Não foi possível salvar a encomenda."); }
    finally { setSalvando(false); }
  }

  async function removerEnc(id) {
    if (!window.confirm("Remover esta encomenda?")) return;
    try {
      await fetch(`${URL_ENC}?id=eq.${id}`, {method:"DELETE",headers:H});
      setEnc(prev=>prev.filter(e=>e.id!==id));
      if (editEncId===id) { setEditEncId(null); setFormEnc(resetEnc()); }
    } catch { setErro("Não foi possível remover."); }
  }

  async function alterarStatus(id, status) {
    setEnc(prev=>prev.map(e=>e.id===id?{...e,status}:e));
    try { await fetch(`${URL_ENC}?id=eq.${id}`, {method:"PATCH",headers:H,body:JSON.stringify({status})}); }
    catch { setErro("Erro ao atualizar status."); carregar(); }
  }

  // ── CRUD Vendas Avulsas ─────────────────────────────────────────────────────
  async function salvarVen() {
    const tot = PRODUTOS.reduce((a,p)=>a+Number(formVen.itens[p.id].qtd),0);
    if (!formVen.data || tot===0) return;
    setSalvando(true); setErro("");
    try {
      if (editVenId) {
        const res = await fetch(`${URL_VEN}?id=eq.${editVenId}`, { method:"PATCH", headers:{...H,"Prefer":"return=representation"}, body:JSON.stringify(venDb({...formVen,id:editVenId})) });
        if (!res.ok) throw new Error();
        const [a] = await res.json();
        setVen(prev=>prev.map(v=>v.id===editVenId?dbVen(a):v));
        setEditVenId(null);
      } else {
        const id = gId();
        const res = await fetch(URL_VEN, { method:"POST", headers:{...H,"Prefer":"return=representation"}, body:JSON.stringify(venDb({...formVen,id})) });
        if (!res.ok) throw new Error();
        const [c] = await res.json();
        setVen(prev=>[dbVen(c),...prev]);
      }
      setFormVen(resetVen());
    } catch { setErro("Não foi possível salvar a venda."); }
    finally { setSalvando(false); }
  }

  async function removerVen(id) {
    if (!window.confirm("Remover esta venda?")) return;
    try {
      await fetch(`${URL_VEN}?id=eq.${id}`, {method:"DELETE",headers:H});
      setVen(prev=>prev.filter(v=>v.id!==id));
    } catch { setErro("Não foi possível remover."); }
  }

  // ── Consolidado por dia (encomendas) ────────────────────────────────────────
  const consolidado = useMemo(() => {
    const m = {};
    encomendas.filter(e=>e.status!=="Cancelado").forEach(e=>{
      const d=e.dataEntrega;
      if(!m[d]) m[d]={ninho:0,doceleit:0,brigadeiro:0,miettes:0,total:0};
      PRODUTOS.forEach(p=>{ m[d][p.id]+=+e.qtd[p.id]||0; m[d].total+=+e.qtd[p.id]||0; });
    });
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).map(([data,q])=>({data,...q}));
  }, [encomendas]);

  // ── Dashboard — últimos 30 dias ─────────────────────────────────────────────
  const dash = useMemo(() => {
    const corte = new Date(); corte.setDate(corte.getDate()-30);
    const corteStr = corte.toISOString().slice(0,10);

    // Vendas avulsas no período
    const venPer = vendas.filter(v=>v.data>=corteStr);
    // Encomendas entregues no período
    const encPer = encomendas.filter(e=>e.status==="Entregue" && e.dataEntrega>=corteStr);

    let faturamento=0, totalUnid=0;
    const porProduto = {ninho:{qtd:0,rec:0},doceleit:{qtd:0,rec:0},brigadeiro:{qtd:0,rec:0},miettes:{qtd:0,rec:0}};

    // Vendas avulsas
    venPer.forEach(v=>{
      PRODUTOS.forEach(p=>{
        const qtd=+v.itens[p.id].qtd||0, val=+v.itens[p.id].valor||0;
        porProduto[p.id].qtd+=qtd;
        porProduto[p.id].rec+=qtd*val;
        faturamento+=qtd*val;
        totalUnid+=qtd;
      });
    });
    // Encomendas entregues (preço padrão R$10 por unidade)
    encPer.forEach(e=>{
      PRODUTOS.forEach(p=>{
        const qtd=+e.qtd[p.id]||0;
        porProduto[p.id].qtd+=qtd;
        porProduto[p.id].rec+=qtd*PRECO_PADRAO;
        faturamento+=qtd*PRECO_PADRAO;
        totalUnid+=qtd;
      });
    });

    const ticketMedio = venPer.length+encPer.length > 0 ? faturamento/(venPer.length+encPer.length) : 0;

    // Série diária dos últimos 30 dias
    const diasMap = {};
    for(let i=29;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      diasMap[d.toISOString().slice(0,10)] = 0;
    }
    venPer.forEach(v=>{ PRODUTOS.forEach(p=>{ diasMap[v.data]=(diasMap[v.data]||0)+(+v.itens[p.id].qtd||0)*(+v.itens[p.id].valor||0); }); });
    encPer.forEach(e=>{ let s=0; PRODUTOS.forEach(p=>{s+=(+e.qtd[p.id]||0)*PRECO_PADRAO;}); diasMap[e.dataEntrega]=(diasMap[e.dataEntrega]||0)+s; });

    const serie = Object.entries(diasMap).map(([d,v])=>({ l:d.slice(8), v }));

    const ranking = PRODUTOS.map(p=>({...p, qtd:porProduto[p.id].qtd, rec:porProduto[p.id].rec}))
      .sort((a,b)=>b.qtd-a.qtd);

    return { faturamento, totalUnid, ticketMedio, serie, ranking, nVendas:venPer.length, nEnc:encPer.length };
  }, [vendas, encomendas]);

  // ── Lista filtrada de encomendas ────────────────────────────────────────────
  const listaFiltrada = useMemo(()=>encomendas.filter(e=>{
    const mb=e.nome.toLowerCase().includes(busca.toLowerCase());
    const ms=filtroSt==="Todos"||e.status===filtroSt;
    return mb&&ms;
  }).sort((a,b)=>a.dataEntrega.localeCompare(b.dataEntrega)),[encomendas,busca,filtroSt]);

  const totaisGerais = useMemo(()=>{
    const r={ninho:0,doceleit:0,brigadeiro:0,miettes:0};
    encomendas.filter(e=>e.status!=="Cancelado").forEach(e=>PRODUTOS.forEach(p=>{r[p.id]+=+e.qtd[p.id]||0;}));
    return r;
  },[encomendas]);

  const totalFormEnc = Object.values(formEnc.qtd).reduce((a,b)=>a+Number(b),0);
  const totalFormVen = PRODUTOS.reduce((a,p)=>a+Number(formVen.itens[p.id].qtd),0);
  const podeSalvarEnc = formEnc.nome.trim() && formEnc.dataEntrega && totalFormEnc>0 && !salvando;
  const podeSalvarVen = formVen.data && totalFormVen>0 && !salvando;

  const totalVenForm = PRODUTOS.reduce((a,p)=>a+(Number(formVen.itens[p.id].qtd)||0)*(Number(formVen.itens[p.id].valor)||0),0);

  // ─────────────────────────────────────────────────────────────────────────────
  const ABAS = [
    ["encomendas","📋","Encomendas"],
    ["vendas","💰","Venda Avulsa"],
    ["lista",`📦`,`Lista (${listaFiltrada.length})`],
    ["dash","📊","Dashboard"],
  ];

  return (
    <div style={{fontFamily:"'Montserrat',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <header style={{background:C.marrom,padding:"18px 24px 12px",textAlign:"center"}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",color:C.creme,fontSize:26,fontWeight:700,margin:0,letterSpacing:3}}>BROWNÊ</p>
        <p style={{color:C.cremedark,fontSize:9,letterSpacing:2,margin:"3px 0 0",textTransform:"uppercase"}}>Gestão de Vendas & Encomendas</p>
      </header>

      {erro && <div style={{background:"#F8D7DA",color:"#721C24",padding:"8px 16px",fontSize:12,textAlign:"center",fontWeight:600}}>⚠️ {erro}</div>}

      {/* ABAS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:C.caramelo}}>
        {ABAS.map(([id,ic,lb])=>(
          <button key={id} onClick={()=>setAba(id)} style={{
            padding:"10px 4px",border:"none",cursor:"pointer",
            fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:9,
            textTransform:"uppercase",letterSpacing:.5,
            background:aba===id?C.bg:"transparent",
            color:aba===id?C.marrom:C.creme,
            borderBottom:aba===id?`3px solid ${C.marrom}`:"3px solid transparent",
          }}>
            <div style={{fontSize:16}}>{ic}</div>{lb}
          </button>
        ))}
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"18px 14px 50px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:"60px 20px",color:C.caramelo}}>
            <p style={{fontSize:36}}>🍫</p>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>Carregando...</p>
          </div>
        ) : (<>

          {/* ══════════════════ ABA: ENCOMENDAS ══════════════════ */}
          {aba==="encomendas" && (
            <div>
              {/* Totais rápidos */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:18}}>
                {PRODUTOS.map(p=>(
                  <div key={p.id} style={{background:C.white,borderRadius:10,padding:"12px 16px",borderLeft:`4px solid ${p.cor}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                    <p style={{margin:0,fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{p.emoji} {p.label}</p>
                    <p style={{margin:"4px 0 0",fontSize:26,fontWeight:700,color:p.cor,fontFamily:"'Cormorant Garamond',serif"}}>{totaisGerais[p.id]}</p>
                  </div>
                ))}
              </div>

              {/* Formulário encomenda */}
              <div style={{background:C.white,borderRadius:12,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.marrom,margin:"0 0 14px",borderBottom:`2px solid ${C.creme}`,paddingBottom:8}}>
                  {editEncId?"✏️ Editar Encomenda":"Nova Encomenda"}
                </p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <div><label style={lbS}>Nome do cliente *</label>
                    <input value={formEnc.nome} onChange={e=>setFormEnc(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" style={inS}/></div>
                  <div><label style={lbS}>Telefone / WhatsApp</label>
                    <input value={formEnc.telefone} onChange={e=>setFormEnc(f=>({...f,telefone:e.target.value}))} placeholder="(21) 99999-9999" style={inS}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div><label style={lbS}>Data de entrega *</label>
                    <input type="date" value={formEnc.dataEntrega} min={hoje()} onChange={e=>setFormEnc(f=>({...f,dataEntrega:e.target.value}))} style={dtS}/></div>
                  <div><label style={lbS}>Status</label>
                    <select value={formEnc.status} onChange={e=>setFormEnc(f=>({...f,status:e.target.value}))} style={inS}>
                      {STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
                </div>
                <label style={{...lbS,display:"block",marginBottom:8}}>Produtos *</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}}>
                  {PRODUTOS.map(p=>(
                    <div key={p.id} style={{border:`1.5px solid ${formEnc.qtd[p.id]>0?p.cor:"#E0D5CA"}`,borderRadius:8,padding:"10px 12px",background:formEnc.qtd[p.id]>0?p.cor+"15":"#FAFAFA"}}>
                      <p style={{margin:"0 0 6px",fontSize:11,fontWeight:600,color:p.cor}}>{p.emoji} {p.label}</p>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <button onClick={()=>setFormEnc(f=>({...f,qtd:{...f.qtd,[p.id]:Math.max(0,+f.qtd[p.id]-1)}}))} style={bQS(p.cor)}>−</button>
                        <input type="number" min={0} value={formEnc.qtd[p.id]} onChange={e=>setFormEnc(f=>({...f,qtd:{...f.qtd,[p.id]:Math.max(0,parseInt(e.target.value)||0)}}))} style={{width:40,textAlign:"center",border:"1px solid #ccc",borderRadius:6,padding:"3px 0",fontWeight:700,fontSize:15}}/>
                        <button onClick={()=>setFormEnc(f=>({...f,qtd:{...f.qtd,[p.id]:+f.qtd[p.id]+1}}))} style={bQS(p.cor)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <label style={lbS}>Observações</label>
                  <textarea value={formEnc.observacoes} onChange={e=>setFormEnc(f=>({...f,observacoes:e.target.value}))} placeholder="Mensagem na caixinha, restrições, endereço..." rows={2} style={{...inS,resize:"vertical",minHeight:52}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={salvarEnc} disabled={!podeSalvarEnc} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:podeSalvarEnc?C.marrom:"#ccc",color:C.white,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:podeSalvarEnc?"pointer":"not-allowed",letterSpacing:1}}>
                    {salvando?"SALVANDO...":editEncId?"SALVAR ALTERAÇÕES":`ADICIONAR ENCOMENDA${totalFormEnc>0?` (${totalFormEnc} un.)`:""}`}
                  </button>
                  {editEncId && <button onClick={()=>{setEditEncId(null);setFormEnc(resetEnc());}} style={{padding:"11px 14px",borderRadius:8,border:`2px solid ${C.marrom}`,background:"transparent",color:C.marrom,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Cancelar</button>}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ ABA: VENDA AVULSA ══════════════════ */}
          {aba==="vendas" && (
            <div>
              {/* Histórico recente */}
              <div style={{marginBottom:16}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:C.marrom,margin:"0 0 10px"}}>Vendas Avulsas Recentes</p>
                {vendas.length===0 ? (
                  <div style={{textAlign:"center",padding:"24px",color:"#aaa",background:C.white,borderRadius:10}}>
                    <p style={{margin:0}}>Nenhuma venda avulsa registrada ainda.</p>
                  </div>
                ) : vendas.slice(0,5).map(v=>{
                  const totV=PRODUTOS.reduce((a,p)=>a+(+v.itens[p.id].qtd||0)*(+v.itens[p.id].valor||0),0);
                  const totU=PRODUTOS.reduce((a,p)=>a+(+v.itens[p.id].qtd||0),0);
                  return (
                    <div key={v.id} style={{background:C.white,borderRadius:10,marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,.07)",borderLeft:`4px solid ${C.verde}`}}>
                      <div style={{padding:"12px 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontWeight:700,color:C.marrom,fontSize:14}}>📅 {fmtData(v.data)}</span>
                          <span style={{fontWeight:700,color:C.verde,fontSize:14}}>{fmtBRL(totV)} · {totU} un.</span>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                          {PRODUTOS.map(p=>+v.itens[p.id].qtd>0&&(
                            <span key={p.id} style={{background:p.cor+"20",color:p.cor,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>
                              {p.emoji} {p.label}: {v.itens[p.id].qtd} × {fmtBRL(v.itens[p.id].valor)}
                            </span>
                          ))}
                        </div>
                        {v.observacoes && <p style={{margin:"2px 0 6px",fontSize:11,color:"#666",fontStyle:"italic"}}>💬 {v.observacoes}</p>}
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setFormVen({data:v.data,observacoes:v.observacoes,itens:{...v.itens}});setEditVenId(v.id);window.scrollTo({top:9999,behavior:"smooth"});}} style={bAS(C.caramelo)}>✏️ Editar</button>
                          <button onClick={()=>removerVen(v.id)} style={bAS("#dc3545")}>🗑 Remover</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulário venda avulsa */}
              <div style={{background:C.white,borderRadius:12,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.marrom,margin:"0 0 14px",borderBottom:`2px solid ${C.creme}`,paddingBottom:8}}>
                  {editVenId?"✏️ Editar Venda":"💰 Registrar Venda Avulsa"}
                </p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div><label style={lbS}>Data da venda *</label>
                    <input type="date" value={formVen.data} onChange={e=>setFormVen(f=>({...f,data:e.target.value}))} style={dtS}/></div>
                  <div><label style={lbS}>Observações</label>
                    <input value={formVen.observacoes} onChange={e=>setFormVen(f=>({...f,observacoes:e.target.value}))} placeholder="Ex: bazar da igreja" style={inS}/></div>
                </div>
                <label style={{...lbS,display:"block",marginBottom:8}}>Produtos e valores *</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}}>
                  {PRODUTOS.map(p=>{
                    const it=formVen.itens[p.id];
                    return (
                      <div key={p.id} style={{border:`1.5px solid ${+it.qtd>0?p.cor:"#E0D5CA"}`,borderRadius:8,padding:"10px 12px",background:+it.qtd>0?p.cor+"15":"#FAFAFA"}}>
                        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:600,color:p.cor}}>{p.emoji} {p.label}</p>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                          <button onClick={()=>setFormVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:Math.max(0,+f.itens[p.id].qtd-1)}}}))} style={bQS(p.cor)}>−</button>
                          <input type="number" min={0} value={it.qtd} onChange={e=>setFormVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:Math.max(0,parseInt(e.target.value)||0)}}}))} style={{width:36,textAlign:"center",border:"1px solid #ccc",borderRadius:6,padding:"3px 0",fontWeight:700,fontSize:14}}/>
                          <button onClick={()=>setFormVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:+f.itens[p.id].qtd+1}}}))} style={bQS(p.cor)}>+</button>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:11,color:"#888",whiteSpace:"nowrap"}}>R$</span>
                          <input type="number" min={0} step="0.50" value={it.valor} onChange={e=>setFormVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],valor:parseFloat(e.target.value)||0}}}))} style={{width:"100%",border:"1px solid #DDD0C4",borderRadius:6,padding:"4px 6px",fontSize:13,fontFamily:"'Montserrat',sans-serif"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalFormVen>0 && (
                  <div style={{background:C.creme,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontWeight:600,color:C.marrom,fontSize:13}}>{totalFormVen} unidades</span>
                    <span style={{fontWeight:700,color:C.verde,fontSize:15}}>{fmtBRL(totalVenForm)}</span>
                  </div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={salvarVen} disabled={!podeSalvarVen} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:podeSalvarVen?C.verde:"#ccc",color:C.white,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:podeSalvarVen?"pointer":"not-allowed",letterSpacing:1}}>
                    {salvando?"SALVANDO...":editVenId?"SALVAR ALTERAÇÕES":`REGISTRAR VENDA${totalFormVen>0?` · ${fmtBRL(totalVenForm)}`:""}`}
                  </button>
                  {editVenId && <button onClick={()=>{setEditVenId(null);setFormVen(resetVen());}} style={{padding:"11px 14px",borderRadius:8,border:`2px solid ${C.verde}`,background:"transparent",color:C.verde,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Cancelar</button>}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ ABA: LISTA ENCOMENDAS ══════════════════ */}
          {aba==="lista" && (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar por nome..." style={{...inS,flex:1,minWidth:150}}/>
                <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)} style={{...inS,width:"auto"}}>
                  <option value="Todos">Todos</option>
                  {STATUS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              {listaFiltrada.length===0 ? (
                <div style={{textAlign:"center",padding:"40px 20px",color:"#aaa"}}>
                  <p style={{fontSize:36}}>🍫</p>
                  <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>{encomendas.length===0?"Nenhuma encomenda ainda.":"Nenhum resultado."}</p>
                </div>
              ) : listaFiltrada.map(enc=>{
                const sc=STATUS_COR[enc.status]||STATUS_COR["Pendente"];
                return (
                  <div key={enc.id} style={{background:C.white,borderRadius:10,marginBottom:10,boxShadow:"0 1px 5px rgba(0,0,0,.08)",borderLeft:`4px solid ${enc.status==="Entregue"?C.verde:enc.status==="Cancelado"?"#dc3545":C.marrom}`}}>
                    <div style={{padding:"13px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                        <div>
                          <p style={{margin:0,fontWeight:700,color:C.marrom,fontSize:14}}>{enc.nome}</p>
                          {enc.telefone&&<p style={{margin:"2px 0 0",fontSize:11,color:"#888"}}>{enc.telefone}</p>}
                        </div>
                        <select value={enc.status} onChange={e=>alterarStatus(enc.id,e.target.value)} style={{background:sc.bg,color:sc.txt,border:"none",borderRadius:20,padding:"3px 8px",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>
                          {STATUS.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:enc.observacoes?6:0}}>
                        <span style={{background:C.creme,color:C.marrom,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>📅 {fmtData(enc.dataEntrega)}</span>
                        {PRODUTOS.map(p=>enc.qtd[p.id]>0&&(
                          <span key={p.id} style={{background:p.cor+"20",color:p.cor,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{p.emoji} {p.label}: {enc.qtd[p.id]}</span>
                        ))}
                      </div>
                      {enc.observacoes&&<p style={{margin:"4px 0 6px",fontSize:11,color:"#666",fontStyle:"italic"}}>💬 {enc.observacoes}</p>}
                      <div style={{display:"flex",gap:6,marginTop:8}}>
                        <button onClick={()=>{setFormEnc({...enc,qtd:{...enc.qtd}});setEditEncId(enc.id);setAba("encomendas");window.scrollTo({top:0,behavior:"smooth"});}} style={bAS(C.caramelo)}>✏️ Editar</button>
                        <button onClick={()=>removerEnc(enc.id)} style={bAS("#dc3545")}>🗑 Remover</button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Consolidado por dia */}
              {consolidado.length>0 && (
                <div style={{marginTop:20}}>
                  <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:C.marrom,margin:"0 0 10px"}}>Consolidado por Dia</p>
                  {consolidado.map(row=>(
                    <div key={row.data} style={{background:C.white,borderRadius:10,marginBottom:10,boxShadow:"0 1px 5px rgba(0,0,0,.08)",overflow:"hidden"}}>
                      <div style={{background:C.marrom,padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <p style={{margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:C.creme}}>{fmtData(row.data)}</p>
                        <span style={{background:C.caramelo,color:C.white,borderRadius:20,padding:"2px 10px",fontWeight:700,fontSize:13}}>{row.total} un.</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)"}}>
                        {PRODUTOS.map((p,i)=>(
                          <div key={p.id} style={{padding:"10px 14px",borderRight:i%2===0?`1px solid ${C.creme}`:"none",borderBottom:i<2?`1px solid ${C.creme}`:"none"}}>
                            <p style={{margin:0,fontSize:10,color:"#999",fontWeight:600,textTransform:"uppercase"}}>{p.emoji} {p.label}</p>
                            <p style={{margin:"3px 0 0",fontSize:22,fontWeight:700,fontFamily:"'Cormorant Garamond',serif",color:row[p.id]>0?p.cor:"#ddd"}}>{row[p.id]>0?row[p.id]:"—"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ ABA: DASHBOARD ══════════════════ */}
          {aba==="dash" && (
            <div>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.marrom,margin:"0 0 14px"}}>Últimos 30 dias</p>

              {/* KPIs */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {[
                  {lb:"Faturamento",v:fmtBRL(dash.faturamento),cor:C.verde,ic:"💰"},
                  {lb:"Unidades vendidas",v:dash.totalUnid,cor:C.caramelo,ic:"🍫"},
                  {lb:"Ticket médio",v:fmtBRL(dash.ticketMedio),cor:C.salvia,ic:"🎯"},
                  {lb:"Transações",v:`${dash.nVendas+dash.nEnc} (${dash.nVendas} av. + ${dash.nEnc} enc.)`,cor:C.marrom,ic:"📋"},
                ].map((k,i)=>(
                  <div key={i} style={{background:C.white,borderRadius:10,padding:"14px 16px",borderLeft:`4px solid ${k.cor}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                    <p style={{margin:0,fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{k.ic} {k.lb}</p>
                    <p style={{margin:"5px 0 0",fontSize: i===3?13:22,fontWeight:700,color:k.cor,fontFamily:"'Cormorant Garamond',serif",lineHeight:1.2}}>{k.v}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico faturamento diário */}
              <div style={{background:C.white,borderRadius:12,padding:"16px 14px",marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
                <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>📈 Faturamento diário</p>
                {dash.faturamento===0 ? (
                  <p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"16px 0"}}>Nenhuma venda registrada ainda.</p>
                ) : <Barras dados={dash.serie} cor={C.caramelo}/>}
              </div>

              {/* Ranking de sabores */}
              <div style={{background:C.white,borderRadius:12,padding:"16px 14px",marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
                <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>🏆 Ranking de sabores</p>
                {dash.ranking.every(p=>p.qtd===0) ? (
                  <p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"8px 0"}}>Nenhuma venda registrada ainda.</p>
                ) : dash.ranking.map((p,i)=>{
                  const maxQ=dash.ranking[0].qtd||1;
                  return (
                    <div key={p.id} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:700,color:p.cor}}>{i===0?"🥇":i===1?"🥈":"🥉"} {p.emoji} {p.label}</span>
                        <span style={{fontSize:12,fontWeight:700,color:"#555"}}>{p.qtd} un. · {fmtBRL(p.rec)}</span>
                      </div>
                      <div style={{background:"#F0E8DF",borderRadius:99,height:6,overflow:"hidden"}}>
                        <div style={{width:`${(p.qtd/maxQ)*100}%`,background:p.cor,height:"100%",borderRadius:99,transition:"width .4s"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Distribuição % */}
              <div style={{background:C.white,borderRadius:12,padding:"16px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
                <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>🍩 Participação por sabor</p>
                {dash.totalUnid===0 ? (
                  <p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"8px 0"}}>Nenhuma venda registrada ainda.</p>
                ) : (
                  <>
                    <div style={{display:"flex",height:12,borderRadius:99,overflow:"hidden",marginBottom:12}}>
                      {dash.ranking.filter(p=>p.qtd>0).map(p=>(
                        <div key={p.id} style={{width:`${(p.qtd/dash.totalUnid)*100}%`,background:p.cor}}/>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                      {dash.ranking.map(p=>(
                        <div key={p.id} style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:p.cor,flexShrink:0}}/>
                          <span style={{fontSize:11,color:"#555"}}>{p.label}: <b>{dash.totalUnid>0?Math.round((p.qtd/dash.totalUnid)*100):0}%</b></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </>)}
      </div>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const lbS = { display:"block",fontSize:10,fontWeight:700,color:"#5B2E1E",textTransform:"uppercase",letterSpacing:1,marginBottom:3 };
const inS = { width:"100%",padding:"8px 11px",borderRadius:7,border:"1.5px solid #DDD0C4",fontFamily:"'Montserrat',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",color:"#333",background:"#FDFAF7" };
const dtS = { ...inS,height:38,lineHeight:"20px",WebkitAppearance:"none",appearance:"none",colorScheme:"light",display:"block" };
const bQS = cor=>({ width:28,height:28,borderRadius:6,border:`1.5px solid ${cor}`,background:"transparent",color:cor,fontSize:17,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" });
const bAS = cor=>({ padding:"4px 10px",borderRadius:6,border:`1.5px solid ${cor}`,background:"transparent",color:cor,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif" });
