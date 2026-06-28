import { useState, useMemo, useEffect, useCallback, useRef } from "react";

const SUPA_URL = "https://ycyqdcpamifghuludkjr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljeXFkY3BhbWlmZ2h1bHVka2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzUxNzIsImV4cCI6MjA5NzIxMTE3Mn0.OKeerUv7G_4YFYeSF57nCyfFsRHTd3rGvdQhPVGItGE";
const SH = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };
const U = { enc:`${SUPA_URL}/rest/v1/encomendas`, ven:`${SUPA_URL}/rest/v1/vendas`, des:`${SUPA_URL}/rest/v1/despesas` };

// ── Paleta B ──────────────────────────────────────────────────────────────────
const C = {
  marrom:"#5B2E1E", caramelo:"#7A4A32", creme:"#E6D6C2",
  verde:"#3D6B4F", vermelho:"#A63228", cinza:"#F5F2EE",
  borda:"#EDE8E3", txt:"#1A1008", sub:"#8A7A6E", bg:"#FFFFFF",
};

const PRODS = [
  { id:"ninho",           label:"Ninho c/ Nutella",  short:"Ninho",    emoji:"🍫", preco:10.00 },
  { id:"doceleit",        label:"Doce de Leite",     short:"D. Leite", emoji:"🍯", preco:10.00 },
  { id:"brigadeiro",      label:"Brigadeiro",        short:"Brig.",    emoji:"🎂", preco:10.00 },
  { id:"miettes",         label:"Miettes",           short:"Miettes",  emoji:"✨", preco:10.00 },
  { id:"minibrownie",     label:"Mini Brownie",      short:"Mini B.",  emoji:"🍬", preco:3.50  },
  { id:"minimiettes",     label:"Mini Miettes",      short:"Mini M.",  emoji:"🌟", preco:4.00  },
  { id:"miettesamendoim", label:"Miettes Amendoim",  short:"M. Amend.",emoji:"🥜", preco:12.00 },
];
const CATS = [
  { id:"ingredientes",   label:"Ingredientes",   emoji:"🧂" },
  { id:"embalagens",     label:"Embalagens",     emoji:"🛍️" },
  { id:"estacionamento", label:"Estacionamento", emoji:"🚗" },
  { id:"papelaria",      label:"Papelaria",      emoji:"🏷️" },
  { id:"transporte",     label:"Transporte",     emoji:"🚌" },
  { id:"outros",         label:"Outros",         emoji:"📦" },
];
const FORNEC = ["Assaí","Vivian Festas","Supermarket","Guanabara","Terê Frutas","Outros"];
const LOCAIS = ["Nova Vida","UNITED","Academia","Studio","Outros"];
const STATUS = ["Pendente","Confirmado","Entregue","Cancelado"];
const ST_COR = {
  "Pendente":   { bg:"#FFF8E1", txt:"#8B6914" },
  "Confirmado": { bg:"#E8F5E9", txt:"#2E7D32" },
  "Entregue":   { bg:"#E3F2FD", txt:"#1565C0" },
  "Cancelado":  { bg:"#FDECEA", txt:"#C62828" },
};

const gId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const hoje  = () => new Date().toISOString().slice(0,10);
const fData = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}`; };
const fDataFull = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const fBRL  = v => `R$ ${Number(v).toFixed(2).replace(".",",")}`;
const fBRLs = v => v===0?"":v>=1000?`R$${(v/1000).toFixed(1)}k`:`R$${Number(v).toFixed(0)}`;
const nAgo  = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };

function semanaAtual() {
  const now=new Date(), dow=now.getDay(), dias=(dow+5)%7;
  const ini=new Date(now); ini.setDate(now.getDate()-dias);
  const fim=new Date(ini); fim.setDate(ini.getDate()+6);
  return { ini:ini.toISOString().slice(0,10), fim:fim.toISOString().slice(0,10) };
}

const qE = (e,pid) => +(e?.qtd?.[pid] ?? 0);
const qV = (v,pid) => +(v?.itens?.[pid]?.qtd ?? 0);
const vV = (v,pid) => +(v?.itens?.[pid]?.valor ?? 0);

function mkQtd(r) { return { ninho:r.qtd_ninho||0, doceleit:r.qtd_doceleit||0, brigadeiro:r.qtd_brigadeiro||0, miettes:r.qtd_miettes||0, minibrownie:r.qtd_minibrownie||0, minimiettes:r.qtd_minimiettes||0, miettesamendoim:r.qtd_miettesamendoim||0 }; }
function mkItens(r) { return { ninho:{qtd:r.qtd_ninho||0,valor:+r.val_ninho||0}, doceleit:{qtd:r.qtd_doceleit||0,valor:+r.val_doceleit||0}, brigadeiro:{qtd:r.qtd_brigadeiro||0,valor:+r.val_brigadeiro||0}, miettes:{qtd:r.qtd_miettes||0,valor:+r.val_miettes||0}, minibrownie:{qtd:r.qtd_minibrownie||0,valor:+r.val_minibrownie||0}, minimiettes:{qtd:r.qtd_minimiettes||0,valor:+r.val_minimiettes||0}, miettesamendoim:{qtd:r.qtd_miettesamendoim||0,valor:+r.val_miettesamendoim||0} }; }

const dbEnc = r => ({ id:r.id, nome:r.nome, telefone:r.telefone||"", dataEntrega:r.data_entrega, status:r.status, observacoes:r.observacoes||"", localVenda:r.local_venda||"", qtd:mkQtd(r) });
const encDb = e => ({ id:e.id, nome:e.nome, telefone:e.telefone||null, data_entrega:e.dataEntrega, status:e.status, observacoes:e.observacoes||null, local_venda:e.localVenda||null, qtd_ninho:qE(e,"ninho"), qtd_doceleit:qE(e,"doceleit"), qtd_brigadeiro:qE(e,"brigadeiro"), qtd_miettes:qE(e,"miettes"), qtd_minibrownie:qE(e,"minibrownie"), qtd_minimiettes:qE(e,"minimiettes"), qtd_miettesamendoim:qE(e,"miettesamendoim") });
const dbVen = r => ({ id:r.id, data:r.data, observacoes:r.observacoes||"", localVenda:r.local_venda||"", itens:mkItens(r) });
const venDb = v => ({ id:v.id, data:v.data, observacoes:v.observacoes||null, local_venda:v.localVenda||null, qtd_ninho:qV(v,"ninho"), val_ninho:vV(v,"ninho"), qtd_doceleit:qV(v,"doceleit"), val_doceleit:vV(v,"doceleit"), qtd_brigadeiro:qV(v,"brigadeiro"), val_brigadeiro:vV(v,"brigadeiro"), qtd_miettes:qV(v,"miettes"), val_miettes:vV(v,"miettes"), qtd_minibrownie:qV(v,"minibrownie"), val_minibrownie:vV(v,"minibrownie"), qtd_minimiettes:qV(v,"minimiettes"), val_minimiettes:vV(v,"minimiettes"), qtd_miettesamendoim:qV(v,"miettesamendoim"), val_miettesamendoim:vV(v,"miettesamendoim") });
const dbDes = r => ({ id:r.id, data:r.data, categoria:r.categoria, fornecedor:r.fornecedor||"", valor:+r.valor||0, observacoes:r.observacoes||"" });
const desDb = d => ({ id:d.id, data:d.data, categoria:d.categoria, fornecedor:d.fornecedor||null, valor:+d.valor||0, observacoes:d.observacoes||null });

const rEnc = () => ({ nome:"", telefone:"", dataEntrega:"", observacoes:"", localVenda:"", status:"Pendente", qtd:{ninho:0,doceleit:0,brigadeiro:0,miettes:0,minibrownie:0,minimiettes:0,miettesamendoim:0} });
const rVen = () => ({ data:hoje(), observacoes:"", localVenda:"", itens:{ninho:{qtd:0,valor:10},doceleit:{qtd:0,valor:10},brigadeiro:{qtd:0,valor:10},miettes:{qtd:0,valor:10},minibrownie:{qtd:0,valor:3.5},minimiettes:{qtd:0,valor:4},miettesamendoim:{qtd:0,valor:12}} });
const rDes = () => ({ data:hoje(), categoria:"ingredientes", fornecedor:"Assaí", valor:"", observacoes:"" });

// ── Gráfico scrollável ────────────────────────────────────────────────────────
function Grafico({ dados, cor }) {
  const ref=useRef(null);
  const BW=28,GAP=4,max=Math.max(...dados.map(d=>d.v),1);
  useEffect(()=>{ if(ref.current) ref.current.scrollLeft=ref.current.scrollWidth; },[]);
  return (
    <div>
      <div ref={ref} style={{overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:GAP,width:dados.length*(BW+GAP),minWidth:"100%",paddingRight:8}}>
          {dados.map((d,i)=>(
            <div key={i} style={{width:BW,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center"}}>
              <span style={{fontSize:8,color:d.v>0?cor:"transparent",fontWeight:700,marginBottom:2,whiteSpace:"nowrap",transform:"rotate(-35deg)",transformOrigin:"bottom center",display:"block",height:16,lineHeight:"16px"}}>{fBRLs(d.v)}</span>
              <div style={{width:"100%",background:d.v>0?cor:"#EDE8E3",borderRadius:"3px 3px 0 0",height:`${Math.max((d.v/max)*56,d.v>0?4:2)}px`}}/>
              <span style={{fontSize:8,color:C.sub,marginTop:3,whiteSpace:"nowrap"}}>{d.l}</span>
            </div>
          ))}
        </div>
      </div>
      {!dados.some(d=>d.v>0)&&<p style={{color:C.borda,fontSize:12,textAlign:"center",margin:"8px 0 0"}}>Nenhuma venda ainda.</p>}
      <p style={{fontSize:10,color:C.borda,textAlign:"center",margin:"6px 0 0"}}>← deslize para ver dias anteriores</p>
    </div>
  );
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)"}}/>
      <div style={{position:"relative",background:C.bg,borderRadius:"20px 20px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 32px rgba(0,0,0,.15)"}}>
        <div style={{padding:"12px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{width:40,height:4,background:C.borda,borderRadius:99,margin:"0 auto 4px"}}/>
        </div>
        <div style={{padding:"0 20px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{fontSize:16,fontWeight:700,color:C.txt,fontFamily:"'Cormorant Garamond',serif"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:C.sub,cursor:"pointer",padding:"4px 8px"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"0 20px 40px",WebkitOverflowScrolling:"touch"}}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Contador de produto ───────────────────────────────────────────────────────
function ProdRow({ p, qtd, onMenos, onMais, onChange, showValor, valor, onValor }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.borda}`}}>
      <span style={{fontSize:14,color:C.txt}}>{p.emoji} {p.label}<span style={{color:C.sub,fontSize:11,marginLeft:6}}>R${p.preco.toFixed(2).replace(".",",")}</span></span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {showValor && qtd>0 && (
          <input type="number" value={valor} onChange={onValor} style={{width:52,textAlign:"center",border:`1px solid ${C.borda}`,borderRadius:6,padding:"3px 4px",fontSize:12,color:C.sub}}/>
        )}
        <button onClick={onMenos} style={{width:28,height:28,borderRadius:50,border:`1px solid ${C.borda}`,background:C.cinza,color:C.sub,fontSize:16,cursor:"pointer"}}>−</button>
        <span style={{fontSize:15,fontWeight:700,color:qtd>0?C.marrom:C.sub,minWidth:18,textAlign:"center"}}>{qtd}</span>
        <button onClick={onMais} style={{width:28,height:28,borderRadius:50,border:"none",background:qtd>0?C.marrom:C.borda,color:qtd>0?"#fff":C.sub,fontSize:16,cursor:"pointer"}}>+</button>
      </div>
    </div>
  );
}

// ── Pill de status ────────────────────────────────────────────────────────────
function Pill({ status, onChange }) {
  const s=ST_COR[status]||ST_COR["Pendente"];
  if (!onChange) return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:s.bg,color:s.txt,whiteSpace:"nowrap"}}>{status}</span>;
  return (
    <select value={status} onChange={e=>onChange(e.target.value)} style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:s.bg,color:s.txt,border:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",appearance:"none",WebkitAppearance:"none"}}>
      {STATUS.map(s=><option key={s}>{s}</option>)}
    </select>
  );
}

// ── Seletor de local ──────────────────────────────────────────────────────────
function LocalSelector({ valor, onChange }) {
  return (
    <div>
      <label style={LS}>Local de venda</label>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
        {["",...LOCAIS].map(l=>(
          <button key={l} onClick={()=>onChange(l)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${valor===l?C.marrom:C.borda}`,background:valor===l?C.marrom:"transparent",color:valor===l?"#fff":C.sub,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>
            {l||"—"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [aba, setAba]   = useState("enc");
  const [encs,setEncs]  = useState([]);
  const [vens,setVens]  = useState([]);
  const [dess,setDess]  = useState([]);
  const [load,setLoad]  = useState(true);
  const [salv,setSalv]  = useState(false);
  const [erro,setErro]  = useState("");

  // sheets
  const [shEnc,setShEnc] = useState(false);
  const [shVen,setShVen] = useState(false);
  const [shDes,setShDes] = useState(false);

  // forms
  const [fEnc,setFEnc] = useState(rEnc());
  const [fVen,setFVen] = useState(rVen());
  const [fDes,setFDes] = useState(rDes());
  const [eEId,setEEId] = useState(null);
  const [eVId,setEVId] = useState(null);
  const [eDId,setEDId] = useState(null);

  // filtros lista
  const [lTipo,setLTipo] = useState("Todos");
  const [lSt,  setLSt]   = useState("Todos");
  const [lDe,  setLDe]   = useState("");
  const [lAte, setLAte]  = useState("");
  const [dCat, setDCat]  = useState("Todas");
  const [dDe,  setDDe]   = useState("");
  const [dAte, setDAte]  = useState("");

  // ── Carregar ────────────────────────────────────────────────────────────────
  const carregar = useCallback(async()=>{
    setErro("");
    try {
      const [rE,rV,rD]=await Promise.all([
        fetch(`${U.enc}?select=*&order=data_entrega.asc`,{headers:SH}),
        fetch(`${U.ven}?select=*&order=data.desc`,{headers:SH}),
        fetch(`${U.des}?select=*&order=data.desc`,{headers:SH}),
      ]);
      if(!rE.ok||!rV.ok||!rD.ok) throw new Error();
      const [dE,dV,dD]=await Promise.all([rE.json(),rV.json(),rD.json()]);
      setEncs(dE.map(dbEnc)); setVens(dV.map(dbVen)); setDess(dD.map(dbDes));
    } catch { setErro("Não foi possível carregar. Verifique sua conexão."); }
    finally { setLoad(false); }
  },[]);
  useEffect(()=>{ carregar(); },[carregar]);

  // ── CRUD Encomendas ──────────────────────────────────────────────────────────
  async function salvarEnc() {
    const tot=PRODS.reduce((a,p)=>a+qE(fEnc,p.id),0);
    if(!fEnc.nome.trim()||!fEnc.dataEntrega||tot===0) return;
    setSalv(true);
    try {
      if(eEId){
        const res=await fetch(`${U.enc}?id=eq.${eEId}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(encDb({...fEnc,id:eEId}))});
        if(!res.ok) throw new Error(); const [a]=await res.json();
        setEncs(p=>p.map(e=>e.id===eEId?dbEnc(a):e)); setEEId(null);
      } else {
        const id=gId(); const res=await fetch(U.enc,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(encDb({...fEnc,id}))});
        if(!res.ok) throw new Error(); const [c]=await res.json(); setEncs(p=>[...p,dbEnc(c)]);
      }
      setFEnc(rEnc()); setShEnc(false);
    } catch { setErro("Não foi possível salvar."); } finally { setSalv(false); }
  }
  async function remEnc(id) {
    if(!window.confirm("Remover esta encomenda?")) return;
    try { await fetch(`${U.enc}?id=eq.${id}`,{method:"DELETE",headers:SH}); setEncs(p=>p.filter(e=>e.id!==id)); setShEnc(false); }
    catch { setErro("Não foi possível remover."); }
  }
  async function chgSt(id,status) {
    setEncs(p=>p.map(e=>e.id===id?{...e,status}:e));
    try { await fetch(`${U.enc}?id=eq.${id}`,{method:"PATCH",headers:SH,body:JSON.stringify({status})}); }
    catch { setErro("Erro ao atualizar status."); carregar(); }
  }

  // ── CRUD Vendas ──────────────────────────────────────────────────────────────
  async function salvarVen() {
    const tot=PRODS.reduce((a,p)=>a+qV(fVen,p.id),0);
    if(!fVen.data||tot===0) return;
    setSalv(true);
    try {
      if(eVId){
        const res=await fetch(`${U.ven}?id=eq.${eVId}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(venDb({...fVen,id:eVId}))});
        if(!res.ok) throw new Error(); const [a]=await res.json();
        setVens(p=>p.map(v=>v.id===eVId?dbVen(a):v)); setEVId(null);
      } else {
        const id=gId(); const res=await fetch(U.ven,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(venDb({...fVen,id}))});
        if(!res.ok) throw new Error(); const [c]=await res.json(); setVens(p=>[dbVen(c),...p]);
      }
      setFVen(rVen()); setShVen(false);
    } catch { setErro("Não foi possível salvar."); } finally { setSalv(false); }
  }
  async function remVen(id) {
    if(!window.confirm("Remover esta venda?")) return;
    try { await fetch(`${U.ven}?id=eq.${id}`,{method:"DELETE",headers:SH}); setVens(p=>p.filter(v=>v.id!==id)); setShVen(false); }
    catch { setErro("Não foi possível remover."); }
  }

  // ── CRUD Despesas ────────────────────────────────────────────────────────────
  async function salvarDes() {
    if(!fDes.data||+fDes.valor<=0) return;
    setSalv(true);
    try {
      if(eDId){
        const res=await fetch(`${U.des}?id=eq.${eDId}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(desDb({...fDes,id:eDId}))});
        if(!res.ok) throw new Error(); const [a]=await res.json();
        setDess(p=>p.map(d=>d.id===eDId?dbDes(a):d)); setEDId(null);
      } else {
        const id=gId(); const res=await fetch(U.des,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(desDb({...fDes,id}))});
        if(!res.ok) throw new Error(); const [c]=await res.json(); setDess(p=>[dbDes(c),...p]);
      }
      setFDes(rDes()); setShDes(false);
    } catch { setErro("Não foi possível salvar."); } finally { setSalv(false); }
  }
  async function remDes(id) {
    if(!window.confirm("Remover esta despesa?")) return;
    try { await fetch(`${U.des}?id=eq.${id}`,{method:"DELETE",headers:SH}); setDess(p=>p.filter(d=>d.id!==id)); setShDes(false); }
    catch { setErro("Não foi possível remover."); }
  }

  // ── Dados calculados ─────────────────────────────────────────────────────────
  const totEnc = useMemo(()=>{
    const r={ninho:0,doceleit:0,brigadeiro:0,miettes:0,minibrownie:0,minimiettes:0,miettesamendoim:0};
    encs.filter(e=>e.status!=="Cancelado"&&e.status!=="Entregue").forEach(e=>PRODS.forEach(p=>{r[p.id]+=qE(e,p.id);}));
    return r;
  },[encs]);

  const resumoDia = useMemo(()=>{
    const hj=hoje(), vh=vens.filter(v=>v.data===hj);
    let total=0, unidades=0;
    vh.forEach(v=>PRODS.forEach(p=>{ const q=qV(v,p.id); unidades+=q; total+=q*vV(v,p.id); }));
    return { total, unidades, nVendas:vh.length };
  },[vens]);

  const listaUni = useMemo(()=>{
    const items=[];
    encs.filter(e=>{
      const ms=lSt==="Todos"||e.status===lSt;
      const mt=lTipo==="Todos"||lTipo==="Encomendas";
      const de=!lDe||e.dataEntrega>=lDe; const ate=!lAte||e.dataEntrega<=lAte;
      return ms&&mt&&de&&ate;
    }).forEach(e=>items.push({tipo:"enc",data:e.dataEntrega,obj:e}));
    if(lTipo==="Todos"||lTipo==="Vendas"){
      vens.filter(v=>{
        const de=!lDe||v.data>=lDe; const ate=!lAte||v.data<=lAte;
        return de&&ate;
      }).forEach(v=>items.push({tipo:"ven",data:v.data,obj:v}));
    }
    return items.sort((a,b)=>b.data.localeCompare(a.data));
  },[encs,vens,lSt,lTipo,lDe,lAte]);

  const desFilt = useMemo(()=>dess.filter(d=>{
    const mc=dCat==="Todas"||d.categoria===dCat;
    const de=!dDe||d.data>=dDe; const ate=!dAte||d.data<=dAte;
    return mc&&de&&ate;
  }),[dess,dCat,dDe,dAte]);

  const dash = useMemo(()=>{
    const sem=semanaAtual(), c30=nAgo(30), c90=nAgo(90);
    const vS=vens.filter(v=>v.data>=sem.ini&&v.data<=sem.fim);
    const eS=encs.filter(e=>e.status==="Entregue"&&e.dataEntrega>=sem.ini&&e.dataEntrega<=sem.fim);
    const dS=dess.filter(d=>d.data>=sem.ini&&d.data<=sem.fim);
    let fatS=0;
    vS.forEach(v=>PRODS.forEach(p=>{fatS+=qV(v,p.id)*vV(v,p.id);}));
    eS.forEach(e=>PRODS.forEach(p=>{fatS+=qE(e,p.id)*p.preco;}));
    const despS=dS.reduce((a,d)=>a+(+d.valor||0),0);
    const vP=vens.filter(v=>v.data>=c30), eP=encs.filter(e=>e.status==="Entregue"&&e.dataEntrega>=c30), dP=dess.filter(d=>d.data>=c30);
    let fat30=0, uni30=0;
    const pp={}; PRODS.forEach(p=>{pp[p.id]={q:0,r:0};});
    vP.forEach(v=>PRODS.forEach(p=>{ const q=qV(v,p.id),vl=vV(v,p.id); pp[p.id].q+=q; pp[p.id].r+=q*vl; fat30+=q*vl; uni30+=q; }));
    eP.forEach(e=>PRODS.forEach(p=>{ const q=qE(e,p.id); pp[p.id].q+=q; pp[p.id].r+=q*p.preco; fat30+=q*p.preco; uni30+=q; }));
    const desp30=dP.reduce((a,d)=>a+(+d.valor||0),0);
    const dm={}; for(let i=89;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); dm[d.toISOString().slice(0,10)]=0; }
    vens.filter(v=>v.data>=c90).forEach(v=>PRODS.forEach(p=>{dm[v.data]=(dm[v.data]||0)+qV(v,p.id)*vV(v,p.id);}));
    encs.filter(e=>e.status==="Entregue"&&e.dataEntrega>=c90).forEach(e=>{ let s=0; PRODS.forEach(p=>{s+=qE(e,p.id)*p.preco;}); dm[e.dataEntrega]=(dm[e.dataEntrega]||0)+s; });
    const serie=Object.entries(dm).map(([d,v])=>({l:`${d.slice(8)}/${d.slice(5,7)}`,v}));
    const ranking=PRODS.map(p=>({...p,qtd:pp[p.id].q,rec:pp[p.id].r})).sort((a,b)=>b.qtd-a.qtd);
    const pL={}; [...LOCAIS,"Não informado"].forEach(l=>{pL[l]={fat:0,qtd:0,prods:{}}; PRODS.forEach(p=>{pL[l].prods[p.id]=0;});});
    const addL=(l,fat,qtd,pid)=>{ if(!pL[l]){pL[l]={fat:0,qtd:0,prods:{}}; PRODS.forEach(p=>{pL[l].prods[p.id]=0;});} pL[l].fat+=fat; pL[l].qtd+=qtd; pL[l].prods[pid]=(pL[l].prods[pid]||0)+qtd; };
    vP.forEach(v=>PRODS.forEach(p=>{ const q=qV(v,p.id); addL(v.localVenda||"Não informado",q*vV(v,p.id),q,p.id); }));
    eP.forEach(e=>PRODS.forEach(p=>{ const q=qE(e,p.id); addL(e.localVenda||"Não informado",q*p.preco,q,p.id); }));
    const rankL=Object.entries(pL).map(([local,d])=>{ const top=PRODS.reduce((b,p)=>(d.prods[p.id]||0)>(d.prods[b.id]||0)?p:b,PRODS[0]); return {local,...d,top:d.qtd>0?top:null}; }).filter(d=>d.qtd>0).sort((a,b)=>b.fat-a.fat);
    return { sem, fatS, despS, liqS:fatS-despS, fat30, desp30, liq30:fat30-desp30, uni30, serie, ranking, rankL };
  },[vens,encs,dess]);

  const totFEnc=PRODS.reduce((a,p)=>a+qE(fEnc,p.id),0);
  const totFVen=PRODS.reduce((a,p)=>a+qV(fVen,p.id),0);
  const totVVen=PRODS.reduce((a,p)=>a+qV(fVen,p.id)*vV(fVen,p.id),0);
  const totDesFil=desFilt.reduce((a,d)=>a+(+d.valor||0),0);

  function abrirEditEnc(enc) { setFEnc({...enc,qtd:{...enc.qtd}}); setEEId(enc.id); setShEnc(true); }
  function abrirEditVen(ven) { setFVen({...ven,itens:{...ven.itens}}); setEVId(ven.id); setShVen(true); }
  function abrirEditDes(des) { setFDes({...des,valor:String(des.valor)}); setEDId(des.id); setShDes(true); }

  const ABAS=[["enc","Encomendas"],["ven","Vendas"],["des","Despesas"],["lst","Lista"],["dsh","Dashboard"]];

  const now = new Date();
  const diasSemana=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const meses=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const dataHoje=`${diasSemana[now.getDay()]}, ${now.getDate()} ${meses[now.getMonth()]}`;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Montserrat',sans-serif",background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:C.marrom,paddingTop:"calc(env(safe-area-inset-top) + 16px)",paddingBottom:12,paddingLeft:18,paddingRight:18,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:C.creme,letterSpacing:3,fontWeight:600}}>BROWNÊ</span>
        <span style={{fontSize:11,color:"#D4BFA0",letterSpacing:1}}>{dataHoje}</span>
      </div>

      {erro&&<div style={{background:"#FDECEA",color:"#C62828",padding:"8px 18px",fontSize:12,fontWeight:600}}>⚠️ {erro}</div>}

      {/* NAV */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.borda}`,background:C.bg,position:"sticky",top:0,zIndex:10}}>
        {ABAS.map(([id,lb])=>(
          <button key={id} onClick={()=>setAba(id)} style={{flex:1,padding:"11px 2px",border:"none",background:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:.8,color:aba===id?C.marrom:C.sub,borderBottom:`2px solid ${aba===id?C.marrom:"transparent"}`,transition:"color .15s"}}>
            {lb}
          </button>
        ))}
      </div>

      {load?(
        <div style={{textAlign:"center",padding:"60px 20px",color:C.sub}}>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20}}>Carregando...</p>
        </div>
      ):(
        <div style={{paddingBottom:80}}>

        {/* ══ ENCOMENDAS ══ */}
        {aba==="enc"&&(
          <div>
            {/* Totais compactos */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:`1px solid ${C.borda}`}}>
              {PRODS.slice(0,4).map(p=>(
                <div key={p.id} style={{padding:"14px 8px",textAlign:"center",borderRight:`1px solid ${C.borda}`}}>
                  <div style={{fontSize:22,fontWeight:700,color:totEnc[p.id]>0?C.marrom:C.borda,fontFamily:"'Cormorant Garamond',serif"}}>{totEnc[p.id]}</div>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:.5,color:C.sub,marginTop:2}}>{p.short}</div>
                </div>
              ))}
            </div>
            {/* Mini totais novos produtos */}
            {PRODS.slice(4).some(p=>totEnc[p.id]>0)&&(
              <div style={{display:"flex",gap:12,padding:"8px 18px",borderBottom:`1px solid ${C.borda}`,background:C.cinza}}>
                {PRODS.slice(4).filter(p=>totEnc[p.id]>0).map(p=>(
                  <span key={p.id} style={{fontSize:11,color:C.sub}}>{p.emoji} {p.short}: <b style={{color:C.marrom}}>{totEnc[p.id]}</b></span>
                ))}
              </div>
            )}
            {/* Lista de encomendas */}
            {encs.filter(e=>e.status!=="Cancelado"&&e.status!=="Entregue").length===0?(
              <div style={{padding:"40px 18px",textAlign:"center",color:C.sub}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,marginBottom:4}}>Nenhuma encomenda em aberto</p>
                <p style={{fontSize:12}}>Toque em + para adicionar</p>
              </div>
            ):encs.filter(e=>e.status!=="Cancelado"&&e.status!=="Entregue").sort((a,b)=>a.dataEntrega.localeCompare(b.dataEntrega)).map(e=>{
              const eu=PRODS.reduce((a,p)=>a+qE(e,p.id),0);
              const ev=PRODS.reduce((a,p)=>a+qE(e,p.id)*p.preco,0);
              const prod=PRODS.filter(p=>qE(e,p.id)>0).map(p=>`${p.emoji}×${qE(e,p.id)}`).join(" ");
              return (
                <div key={e.id} onClick={()=>abrirEditEnc(e)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.borda}`,cursor:"pointer"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.txt,marginBottom:3}}>{e.nome}</div>
                    <div style={{fontSize:11,color:C.sub,display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span>📅 {fData(e.dataEntrega)}</span>
                      {e.localVenda&&<span>📍 {e.localVenda}</span>}
                      <span>{prod}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,marginLeft:12,flexShrink:0}}>
                    <Pill status={e.status} onChange={st=>chgSt(e.id,st)}/>
                    <span style={{fontSize:12,fontWeight:600,color:C.caramelo}}>{fBRL(ev)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ VENDAS ══ */}
        {aba==="ven"&&(
          <div>
            {/* Resumo do dia */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${C.borda}`}}>
              {[{lb:"Hoje",v:fBRL(resumoDia.total)},{lb:"Unidades",v:String(resumoDia.unidades)},{lb:"Vendas",v:String(resumoDia.nVendas)}].map((k,i)=>(
                <div key={i} style={{padding:"14px 8px",textAlign:"center",borderRight:i<2?`1px solid ${C.borda}`:"none"}}>
                  <div style={{fontSize:18,fontWeight:700,color:resumoDia.total>0||k.v!=="R$ 0,00"?C.verde:C.borda,fontFamily:"'Cormorant Garamond',serif"}}>{k.v}</div>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:.5,color:C.sub,marginTop:2}}>{k.lb}</div>
                </div>
              ))}
            </div>
            {/* Lista de vendas */}
            {vens.length===0?(
              <div style={{padding:"40px 18px",textAlign:"center",color:C.sub}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,marginBottom:4}}>Nenhuma venda registrada</p>
                <p style={{fontSize:12}}>Toque em + para adicionar</p>
              </div>
            ):vens.map(v=>{
              const tv=PRODS.reduce((a,p)=>a+qV(v,p.id)*vV(v,p.id),0);
              const tu=PRODS.reduce((a,p)=>a+qV(v,p.id),0);
              const prod=PRODS.filter(p=>qV(v,p.id)>0).map(p=>`${p.emoji}×${qV(v,p.id)}`).join(" ");
              return (
                <div key={v.id} onClick={()=>abrirEditVen(v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.borda}`,cursor:"pointer"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:C.txt,marginBottom:3}}>📅 {fDataFull(v.data)}</div>
                    <div style={{fontSize:11,color:C.sub,display:"flex",gap:8,flexWrap:"wrap"}}>
                      {v.localVenda&&<span>📍 {v.localVenda}</span>}
                      <span>{prod}</span>
                      {v.observacoes&&<span>· {v.observacoes}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,marginLeft:12,flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.verde}}>{fBRL(tv)}</span>
                    <span style={{fontSize:10,color:C.sub}}>{tu} un.</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ DESPESAS ══ */}
        {aba==="des"&&(
          <div>
            {/* Totalizador + filtros */}
            <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.borda}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{id:"Todas",label:"Todas"},...CATS].map(c=>(
                  <button key={c.id} onClick={()=>setDCat(c.id)} style={{padding:"3px 10px",borderRadius:20,border:`1px solid ${dCat===c.id?C.marrom:C.borda}`,background:dCat===c.id?C.marrom:"transparent",color:dCat===c.id?"#fff":C.sub,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>
                    {c.emoji||"📋"} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{padding:"8px 18px",borderBottom:`1px solid ${C.borda}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:C.sub}}>{desFilt.length} {desFilt.length===1?"despesa":"despesas"}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.vermelho}}>{fBRL(totDesFil)}</span>
            </div>
            {desFilt.length===0?(
              <div style={{padding:"40px 18px",textAlign:"center",color:C.sub}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,marginBottom:4}}>Nenhuma despesa</p>
                <p style={{fontSize:12}}>Toque em + para adicionar</p>
              </div>
            ):desFilt.map(d=>{ const cat=CATS.find(c=>c.id===d.categoria)||CATS[5]; return (
              <div key={d.id} onClick={()=>abrirEditDes(d)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.borda}`,cursor:"pointer"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.txt,marginBottom:3}}>{cat.emoji} {cat.label}</div>
                  <div style={{fontSize:11,color:C.sub,display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span>📅 {fDataFull(d.data)}</span>
                    {d.fornecedor&&<span>{d.fornecedor}</span>}
                    {d.observacoes&&<span>· {d.observacoes}</span>}
                  </div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:C.vermelho,marginLeft:12,flexShrink:0}}>{fBRL(d.valor)}</span>
              </div>
            );})}
          </div>
        )}

        {/* ══ LISTA ══ */}
        {aba==="lst"&&(
          <div>
            {/* Filtros */}
            <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.borda}`,display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Todos","Encomendas","Vendas"].map(t=>(
                <button key={t} onClick={()=>setLTipo(t)} style={{padding:"3px 10px",borderRadius:20,border:`1px solid ${lTipo===t?C.marrom:C.borda}`,background:lTipo===t?C.marrom:"transparent",color:lTipo===t?"#fff":C.sub,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>{t}</button>
              ))}
              {lTipo!=="Vendas"&&STATUS.map(s=>(
                <button key={s} onClick={()=>setLSt(lSt===s?"Todos":s)} style={{padding:"3px 10px",borderRadius:20,border:`1px solid ${lSt===s?C.caramelo:C.borda}`,background:lSt===s?C.caramelo:"transparent",color:lSt===s?"#fff":C.sub,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>{s}</button>
              ))}
            </div>
            <div style={{padding:"8px 18px 8px",borderBottom:`1px solid ${C.borda}`,display:"flex",gap:8,alignItems:"center"}}>
              <input type="date" value={lDe} onChange={e=>setLDe(e.target.value)} style={{...IS_sm,flex:1}}/>
              <span style={{fontSize:11,color:C.sub}}>→</span>
              <input type="date" value={lAte} onChange={e=>setLAte(e.target.value)} style={{...IS_sm,flex:1}}/>
              {(lDe||lAte)&&<button onClick={()=>{setLDe("");setLAte("");}} style={{fontSize:11,color:C.caramelo,background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:"0 4px"}}>✕</button>}
            </div>
            <div style={{padding:"6px 18px",borderBottom:`1px solid ${C.borda}`}}>
              <span style={{fontSize:11,color:C.sub}}>{listaUni.length} {listaUni.length===1?"item":"itens"}</span>
            </div>
            {listaUni.length===0?(
              <div style={{padding:"40px 18px",textAlign:"center",color:C.sub}}>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>Nenhum item encontrado</p>
              </div>
            ):listaUni.map(({tipo,obj})=>{
              if(tipo==="enc"){
                const eu=PRODS.reduce((a,p)=>a+qE(obj,p.id),0);
                const ev=PRODS.reduce((a,p)=>a+qE(obj,p.id)*p.preco,0);
                const prod=PRODS.filter(p=>qE(obj,p.id)>0).map(p=>`${p.emoji}×${qE(obj,p.id)}`).join(" ");
                return (
                  <div key={"e"+obj.id} onClick={()=>{abrirEditEnc(obj);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",borderBottom:`1px solid ${C.borda}`,cursor:"pointer",borderLeft:`3px solid ${obj.status==="Entregue"?C.verde:obj.status==="Cancelado"?C.vermelho:C.caramelo}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:C.sub,marginBottom:2,textTransform:"uppercase",letterSpacing:.5}}>Encomenda</div>
                      <div style={{fontSize:14,fontWeight:600,color:C.txt,marginBottom:3}}>{obj.nome}</div>
                      <div style={{fontSize:11,color:C.sub,display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span>📅 {fDataFull(obj.dataEntrega)}</span>
                        {obj.localVenda&&<span>📍 {obj.localVenda}</span>}
                        <span>{prod}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,marginLeft:12,flexShrink:0}}>
                      <Pill status={obj.status} onChange={st=>chgSt(obj.id,st)}/>
                      <span style={{fontSize:12,fontWeight:600,color:C.caramelo}}>{fBRL(ev)}</span>
                    </div>
                  </div>
                );
              }
              const tv=PRODS.reduce((a,p)=>a+qV(obj,p.id)*vV(obj,p.id),0);
              const tu=PRODS.reduce((a,p)=>a+qV(obj,p.id),0);
              const prod=PRODS.filter(p=>qV(obj,p.id)>0).map(p=>`${p.emoji}×${qV(obj,p.id)}`).join(" ");
              return (
                <div key={"v"+obj.id} onClick={()=>abrirEditVen(obj)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",borderBottom:`1px solid ${C.borda}`,cursor:"pointer",borderLeft:`3px solid ${C.verde}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:C.sub,marginBottom:2,textTransform:"uppercase",letterSpacing:.5}}>Venda avulsa</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.txt,marginBottom:3}}>📅 {fDataFull(obj.data)}</div>
                    <div style={{fontSize:11,color:C.sub,display:"flex",gap:8,flexWrap:"wrap"}}>
                      {obj.localVenda&&<span>📍 {obj.localVenda}</span>}
                      <span>{prod}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,marginLeft:12,flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.verde}}>{fBRL(tv)}</span>
                    <span style={{fontSize:10,color:C.sub}}>{tu} un.</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {aba==="dsh"&&(
          <div>
            {/* Semana */}
            <div style={{background:C.marrom,padding:"16px 18px"}}>
              <div style={{fontSize:10,color:"#D4BFA0",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Semana · {fDataFull(dash.sem.ini)} → {fDataFull(dash.sem.fim)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[{lb:"Faturamento",v:fBRL(dash.fatS),cor:"#E6D6C2"},{lb:"Despesas",v:fBRL(dash.despS),cor:"#F4A0A0"},{lb:"Líquido",v:fBRL(dash.liqS),cor:dash.liqS>=0?"#A8D8A8":"#F4A0A0"}].map((k,i)=>(
                  <div key={i}>
                    <div style={{fontSize:9,color:"#D4BFA0",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{k.lb}</div>
                    <div style={{fontSize:15,fontWeight:700,color:k.cor,fontFamily:"'Cormorant Garamond',serif"}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* KPIs 30 dias */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${C.borda}`}}>
              {[{lb:"Faturamento 30d",v:fBRL(dash.fat30),cor:C.verde},{lb:"Despesas 30d",v:fBRL(dash.desp30),cor:C.vermelho},{lb:"Lucro líquido",v:fBRL(dash.liq30),cor:dash.liq30>=0?C.verde:C.vermelho},{lb:"Unidades",v:String(dash.uni30),cor:C.caramelo}].map((k,i)=>(
                <div key={i} style={{padding:"14px 18px",borderRight:i%2===0?`1px solid ${C.borda}`:"none",borderBottom:`1px solid ${C.borda}`}}>
                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:.5,color:C.sub,marginBottom:4}}>{k.lb}</div>
                  <div style={{fontSize:20,fontWeight:700,color:k.cor,fontFamily:"'Cormorant Garamond',serif"}}>{k.v}</div>
                </div>
              ))}
            </div>
            {/* Gráfico */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.borda}`}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:12}}>Faturamento diário — 90 dias</div>
              <Grafico dados={dash.serie} cor={C.caramelo}/>
            </div>
            {/* Ranking sabores */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.borda}`}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:12}}>Ranking de sabores</div>
              {dash.ranking.every(p=>p.qtd===0)?<p style={{color:C.borda,fontSize:12}}>Nenhuma venda registrada ainda.</p>:
              dash.ranking.map((p,i)=>{ const mx=dash.ranking[0].qtd||1; return (
                <div key={p.id} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:C.txt}}>{i===0?"🥇":i===1?"🥈":"·"} {p.emoji} {p.label}</span>
                    <span style={{fontSize:12,fontWeight:600,color:C.sub}}>{p.qtd} un. · {fBRL(p.rec)}</span>
                  </div>
                  <div style={{background:C.borda,borderRadius:99,height:4}}><div style={{width:`${(p.qtd/mx)*100}%`,background:C.caramelo,height:"100%",borderRadius:99}}/></div>
                </div>
              );})}
            </div>
            {/* Ranking locais */}
            <div style={{padding:"16px 18px"}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:12}}>Desempenho por local</div>
              {dash.rankL.length===0?<p style={{color:C.borda,fontSize:12}}>Nenhuma venda com local informado.</p>:(()=>{
                const mxF=dash.rankL[0].fat||1;
                return dash.rankL.map((l,i)=>(
                  <div key={l.local} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:C.txt}}>{i===0?"🥇":i===1?"🥈":"·"} {l.local}</span>
                      <span style={{fontSize:12,fontWeight:600,color:C.sub}}>{fBRL(l.fat)} · {l.qtd} un.</span>
                    </div>
                    <div style={{background:C.borda,borderRadius:99,height:4,marginBottom:3}}><div style={{width:`${(l.fat/mxF)*100}%`,background:C.marrom,height:"100%",borderRadius:99}}/></div>
                    {l.top&&<span style={{fontSize:10,color:C.sub}}>{l.top.emoji} Mais vendido: {l.top.label}</span>}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        </div>
      )}

      {/* ══ FAB ══ */}
      {!load&&["enc","ven","des"].includes(aba)&&(
        <button onClick={()=>{ if(aba==="enc"){setFEnc(rEnc());setEEId(null);setShEnc(true);} else if(aba==="ven"){setFVen(rVen());setEVId(null);setShVen(true);} else {setFDes(rDes());setEDId(null);setShDes(true);} }} style={{position:"fixed",bottom:28,right:24,width:52,height:52,borderRadius:50,background:C.marrom,color:"#fff",border:"none",fontSize:26,cursor:"pointer",boxShadow:"0 4px 16px rgba(91,46,30,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>+</button>
      )}

      {/* ══ SHEET: ENCOMENDA ══ */}
      <Sheet open={shEnc} onClose={()=>setShEnc(false)} title={eEId?"Editar Encomenda":"Nova Encomenda"}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label style={LS}>Nome *</label><input value={fEnc.nome} onChange={e=>setFEnc(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" style={IS}/></div>
          <div><label style={LS}>Telefone</label><input value={fEnc.telefone} onChange={e=>setFEnc(f=>({...f,telefone:e.target.value}))} placeholder="(21) 9..." style={IS}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label style={LS}>Entrega *</label><input type="date" value={fEnc.dataEntrega} min={hoje()} onChange={e=>setFEnc(f=>({...f,dataEntrega:e.target.value}))} style={DS}/></div>
          <div><label style={LS}>Status</label><select value={fEnc.status} onChange={e=>setFEnc(f=>({...f,status:e.target.value}))} style={IS}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
        <label style={{...LS,display:"block",marginBottom:4}}>Produtos *</label>
        {PRODS.map(p=>(
          <ProdRow key={p.id} p={p} qtd={qE(fEnc,p.id)}
            onMenos={()=>setFEnc(f=>({...f,qtd:{...f.qtd,[p.id]:Math.max(0,(f.qtd[p.id]||0)-1)}}))}
            onMais={()=>setFEnc(f=>({...f,qtd:{...f.qtd,[p.id]:(f.qtd[p.id]||0)+1}}))}
            onChange={e=>setFEnc(f=>({...f,qtd:{...f.qtd,[p.id]:Math.max(0,parseInt(e.target.value)||0)}}))}
          />
        ))}
        <div style={{marginTop:14,marginBottom:14}}><label style={LS}>Observações</label><textarea value={fEnc.observacoes} onChange={e=>setFEnc(f=>({...f,observacoes:e.target.value}))} placeholder="Mensagem, restrições, endereço..." rows={2} style={{...IS,resize:"vertical",minHeight:52}}/></div>
        <div style={{marginBottom:20}}><LocalSelector valor={fEnc.localVenda} onChange={v=>setFEnc(f=>({...f,localVenda:v}))}/></div>
        {totFEnc>0&&<div style={{background:C.cinza,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.sub}}>{totFEnc} unidades</span><span style={{fontSize:13,fontWeight:700,color:C.caramelo}}>{fBRL(PRODS.reduce((a,p)=>a+qE(fEnc,p.id)*p.preco,0))}</span></div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={salvarEnc} disabled={!fEnc.nome.trim()||!fEnc.dataEntrega||totFEnc===0||salv} style={{flex:1,padding:"13px",borderRadius:8,border:"none",background:fEnc.nome.trim()&&fEnc.dataEntrega&&totFEnc>0?C.marrom:"#ccc",color:"#fff",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:1}}>
            {salv?"SALVANDO...":eEId?"SALVAR":"ADICIONAR"}
          </button>
          {eEId&&<button onClick={()=>remEnc(eEId)} style={{padding:"13px 16px",borderRadius:8,border:`1px solid ${C.vermelho}`,background:"transparent",color:C.vermelho,fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>Remover</button>}
        </div>
      </Sheet>

      {/* ══ SHEET: VENDA ══ */}
      <Sheet open={shVen} onClose={()=>setShVen(false)} title={eVId?"Editar Venda":"Venda Avulsa"}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label style={LS}>Data *</label><input type="date" value={fVen.data} onChange={e=>setFVen(f=>({...f,data:e.target.value}))} style={DS}/></div>
          <div><label style={LS}>Observação</label><input value={fVen.observacoes} onChange={e=>setFVen(f=>({...f,observacoes:e.target.value}))} placeholder="Ex: bazar" style={IS}/></div>
        </div>
        <label style={{...LS,display:"block",marginBottom:4}}>Produtos e valores *</label>
        {PRODS.map(p=>{
          const it=fVen.itens[p.id]||{qtd:0,valor:p.preco};
          return <ProdRow key={p.id} p={p} qtd={it.qtd} showValor valor={it.valor}
            onMenos={()=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:Math.max(0,(f.itens[p.id]?.qtd||0)-1)}}}))}
            onMais={()=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:(f.itens[p.id]?.qtd||0)+1}}}))}
            onChange={e=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:Math.max(0,parseInt(e.target.value)||0)}}}))}
            onValor={e=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],valor:parseFloat(e.target.value)||0}}}))}
          />;
        })}
        <div style={{marginTop:14,marginBottom:20}}><LocalSelector valor={fVen.localVenda} onChange={v=>setFVen(f=>({...f,localVenda:v}))}/></div>
        {totFVen>0&&<div style={{background:C.cinza,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.sub}}>{totFVen} unidades</span><span style={{fontSize:13,fontWeight:700,color:C.verde}}>{fBRL(totVVen)}</span></div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={salvarVen} disabled={!fVen.data||totFVen===0||salv} style={{flex:1,padding:"13px",borderRadius:8,border:"none",background:fVen.data&&totFVen>0?C.verde:"#ccc",color:"#fff",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:1}}>
            {salv?"SALVANDO...":eVId?"SALVAR":"REGISTRAR"}
          </button>
          {eVId&&<button onClick={()=>remVen(eVId)} style={{padding:"13px 16px",borderRadius:8,border:`1px solid ${C.vermelho}`,background:"transparent",color:C.vermelho,fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>Remover</button>}
        </div>
      </Sheet>

      {/* ══ SHEET: DESPESA ══ */}
      <Sheet open={shDes} onClose={()=>setShDes(false)} title={eDId?"Editar Despesa":"Nova Despesa"}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label style={LS}>Data *</label><input type="date" value={fDes.data} onChange={e=>setFDes(f=>({...f,data:e.target.value}))} style={DS}/></div>
          <div><label style={LS}>Valor (R$) *</label><input type="number" min={0} step="0.01" value={fDes.valor} onChange={e=>setFDes(f=>({...f,valor:e.target.value}))} placeholder="0,00" style={IS}/></div>
        </div>
        <label style={{...LS,display:"block",marginBottom:8}}>Categoria *</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
          {CATS.map(cat=>(
            <button key={cat.id} onClick={()=>setFDes(f=>({...f,categoria:cat.id}))} style={{padding:"8px 4px",borderRadius:8,border:`1px solid ${fDes.categoria===cat.id?C.marrom:C.borda}`,background:fDes.categoria===cat.id?C.marrom:"transparent",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:700,color:fDes.categoria===cat.id?"#fff":C.sub,textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:2}}>{cat.emoji}</div>{cat.label}
            </button>
          ))}
        </div>
        <div style={{marginBottom:14}}><label style={LS}>Fornecedor / Local</label><select value={fDes.fornecedor} onChange={e=>setFDes(f=>({...f,fornecedor:e.target.value}))} style={IS}>{FORNEC.map(f=><option key={f}>{f}</option>)}</select></div>
        <div style={{marginBottom:20}}><label style={LS}>Observações</label><input value={fDes.observacoes} onChange={e=>setFDes(f=>({...f,observacoes:e.target.value}))} placeholder="Ex: chocolate, leite condensado..." style={IS}/></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={salvarDes} disabled={!fDes.data||+fDes.valor<=0||salv} style={{flex:1,padding:"13px",borderRadius:8,border:"none",background:fDes.data&&+fDes.valor>0?C.vermelho:"#ccc",color:"#fff",fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:1}}>
            {salv?"SALVANDO...":eDId?"SALVAR":"REGISTRAR"}
          </button>
          {eDId&&<button onClick={()=>remDes(eDId)} style={{padding:"13px 16px",borderRadius:8,border:`1px solid ${C.vermelho}`,background:"transparent",color:C.vermelho,fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>Remover</button>}
        </div>
      </Sheet>

    </div>
  );
}

const LS = { display:"block",fontSize:10,fontWeight:700,color:"#5B2E1E",textTransform:"uppercase",letterSpacing:1,marginBottom:4 };
const IS = { width:"100%",padding:"8px 11px",borderRadius:7,border:"1px solid #EDE8E3",fontFamily:"'Montserrat',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",color:"#1A1008",background:"#FAFAF8" };
const IS_sm = { padding:"6px 10px",borderRadius:6,border:"1px solid #EDE8E3",fontFamily:"'Montserrat',sans-serif",fontSize:12,outline:"none",boxSizing:"border-box",color:"#1A1008",background:"#FAFAF8",height:34,WebkitAppearance:"none",appearance:"none",colorScheme:"light" };
const DS = { ...IS,height:38,WebkitAppearance:"none",appearance:"none",colorScheme:"light",display:"block" };
