import { useState, useMemo, useEffect, useCallback, useRef } from "react";

const SUPA_URL = "https://ycyqdcpamifghuludkjr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljeXFkY3BhbWlmZ2h1bHVka2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzUxNzIsImV4cCI6MjA5NzIxMTE3Mn0.OKeerUv7G_4YFYeSF57nCyfFsRHTd3rGvdQhPVGItGE";
const SH = { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };
const U = {
  enc: `${SUPA_URL}/rest/v1/encomendas`,
  ven: `${SUPA_URL}/rest/v1/vendas`,
  des: `${SUPA_URL}/rest/v1/despesas`,
};

const C = {
  marrom:"#5B2E1E", caramelo:"#7A4A32", creme:"#E6D6C2",
  verde:"#5A6447", salvia:"#8A9171", cremedark:"#D4BFA0",
  bg:"#FAF6F1", white:"#FFFFFF", vermelho:"#A63228",
};

const PRODS = [
  { id:"ninho",           label:"Ninho c/ Nutella",  emoji:"🍫", cor:C.salvia,   preco:10.00 },
  { id:"doceleit",        label:"Doce de Leite",     emoji:"🍯", cor:C.caramelo, preco:10.00 },
  { id:"brigadeiro",      label:"Brigadeiro",        emoji:"🎂", cor:C.marrom,   preco:10.00 },
  { id:"miettes",         label:"Miettes",           emoji:"✨", cor:C.verde,    preco:10.00 },
  { id:"minibrownie",     label:"Mini Brownie",      emoji:"🍬", cor:"#A0522D",  preco:3.50  },
  { id:"minimiettes",     label:"Mini Miettes",      emoji:"🌟", cor:"#6B8E5A",  preco:4.00  },
  { id:"miettesamendoim", label:"Miettes Amendoim",  emoji:"🥜", cor:"#8B6914",  preco:12.00 },
];

const CATS = [
  { id:"ingredientes",   label:"Ingredientes",   emoji:"🧂", cor:"#7A5C2E" },
  { id:"embalagens",     label:"Embalagens",     emoji:"🛍️", cor:"#5A6447" },
  { id:"estacionamento", label:"Estacionamento", emoji:"🚗", cor:"#4A6A8A" },
  { id:"papelaria",      label:"Papelaria",      emoji:"🏷️", cor:"#8A5A6A" },
  { id:"transporte",     label:"Transporte",     emoji:"🚌", cor:"#6A5A8A" },
  { id:"outros",         label:"Outros",         emoji:"📦", cor:"#7A7A5A" },
];

const FORNEC = ["Assaí","Vivian Festas","Supermarket","Guanabara","Terê Frutas","Outros"];
const LOCAIS = ["Nova Vida","UNITED","Academia","Studio","Outros"];
const STATUS = ["Pendente","Confirmado","Entregue","Cancelado"];
const ST_COR = {
  "Pendente":   { bg:"#FFF3CD", txt:"#856404" },
  "Confirmado": { bg:"#D4EDDA", txt:"#155724" },
  "Entregue":   { bg:"#D1ECF1", txt:"#0C5460" },
  "Cancelado":  { bg:"#F8D7DA", txt:"#721C24" },
};

const gId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const hoje  = () => new Date().toISOString().slice(0,10);
const fData = iso => { if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const fBRL  = v => `R$ ${Number(v).toFixed(2).replace(".",",")}`;
const fBRLs = v => v===0?"":v>=1000?`R$${(v/1000).toFixed(1)}k`:`R$${Number(v).toFixed(0)}`;
const nAgo  = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };

function semanaAtual() {
  const now=new Date(), dow=now.getDay();
  const diasDesdeTerc=(dow+5)%7;
  const ini=new Date(now); ini.setDate(now.getDate()-diasDesdeTerc);
  const fim=new Date(ini); fim.setDate(ini.getDate()+6);
  return { ini:ini.toISOString().slice(0,10), fim:fim.toISOString().slice(0,10) };
}

// helpers para qtd segura (null-safe)
const qtdEnc = (e, pid) => +(e && e.qtd && e.qtd[pid] != null ? e.qtd[pid] : 0);
const qtdVen = (v, pid) => +(v && v.itens && v.itens[pid] ? v.itens[pid].qtd : 0);
const valVen = (v, pid) => +(v && v.itens && v.itens[pid] ? v.itens[pid].valor : 0);

function mkQtd(r) {
  return {
    ninho:           r.qtd_ninho||0,
    doceleit:        r.qtd_doceleit||0,
    brigadeiro:      r.qtd_brigadeiro||0,
    miettes:         r.qtd_miettes||0,
    minibrownie:     r.qtd_minibrownie||0,
    minimiettes:     r.qtd_minimiettes||0,
    miettesamendoim: r.qtd_miettesamendoim||0,
  };
}
function mkItens(r) {
  return {
    ninho:           { qtd:r.qtd_ninho||0,           valor:+r.val_ninho||0 },
    doceleit:        { qtd:r.qtd_doceleit||0,        valor:+r.val_doceleit||0 },
    brigadeiro:      { qtd:r.qtd_brigadeiro||0,      valor:+r.val_brigadeiro||0 },
    miettes:         { qtd:r.qtd_miettes||0,         valor:+r.val_miettes||0 },
    minibrownie:     { qtd:r.qtd_minibrownie||0,     valor:+r.val_minibrownie||0 },
    minimiettes:     { qtd:r.qtd_minimiettes||0,     valor:+r.val_minimiettes||0 },
    miettesamendoim: { qtd:r.qtd_miettesamendoim||0, valor:+r.val_miettesamendoim||0 },
  };
}

const dbEnc = r => ({ id:r.id, nome:r.nome, telefone:r.telefone||"", dataEntrega:r.data_entrega, status:r.status, observacoes:r.observacoes||"", localVenda:r.local_venda||"", qtd:mkQtd(r) });
const encDb = e => ({ id:e.id, nome:e.nome, telefone:e.telefone||null, data_entrega:e.dataEntrega, status:e.status, observacoes:e.observacoes||null, local_venda:e.localVenda||null, qtd_ninho:+e.qtd.ninho||0, qtd_doceleit:+e.qtd.doceleit||0, qtd_brigadeiro:+e.qtd.brigadeiro||0, qtd_miettes:+e.qtd.miettes||0, qtd_minibrownie:+e.qtd.minibrownie||0, qtd_minimiettes:+e.qtd.minimiettes||0, qtd_miettesamendoim:+e.qtd.miettesamendoim||0 });
const dbVen = r => ({ id:r.id, data:r.data, observacoes:r.observacoes||"", localVenda:r.local_venda||"", itens:mkItens(r) });
const venDb = v => ({ id:v.id, data:v.data, observacoes:v.observacoes||null, local_venda:v.localVenda||null, qtd_ninho:qtdVen(v,"ninho"), val_ninho:valVen(v,"ninho"), qtd_doceleit:qtdVen(v,"doceleit"), val_doceleit:valVen(v,"doceleit"), qtd_brigadeiro:qtdVen(v,"brigadeiro"), val_brigadeiro:valVen(v,"brigadeiro"), qtd_miettes:qtdVen(v,"miettes"), val_miettes:valVen(v,"miettes"), qtd_minibrownie:qtdVen(v,"minibrownie"), val_minibrownie:valVen(v,"minibrownie"), qtd_minimiettes:qtdVen(v,"minimiettes"), val_minimiettes:valVen(v,"minimiettes"), qtd_miettesamendoim:qtdVen(v,"miettesamendoim"), val_miettesamendoim:valVen(v,"miettesamendoim") });
const dbDes = r => ({ id:r.id, data:r.data, categoria:r.categoria, fornecedor:r.fornecedor||"", valor:+r.valor||0, observacoes:r.observacoes||"" });
const desDb = d => ({ id:d.id, data:d.data, categoria:d.categoria, fornecedor:d.fornecedor||null, valor:+d.valor||0, observacoes:d.observacoes||null });

const rEnc = () => ({ nome:"", telefone:"", dataEntrega:"", observacoes:"", localVenda:"", status:"Pendente", qtd:{ninho:0,doceleit:0,brigadeiro:0,miettes:0,minibrownie:0,minimiettes:0,miettesamendoim:0} });
const rVen = () => ({ data:hoje(), observacoes:"", localVenda:"", itens:{ninho:{qtd:0,valor:10},doceleit:{qtd:0,valor:10},brigadeiro:{qtd:0,valor:10},miettes:{qtd:0,valor:10},minibrownie:{qtd:0,valor:3.5},minimiettes:{qtd:0,valor:4},miettesamendoim:{qtd:0,valor:12}} });
const rDes = () => ({ data:hoje(), categoria:"ingredientes", fornecedor:"Assaí", valor:"", observacoes:"" });

// ── Gráfico scrollável ────────────────────────────────────────────────────────
function Grafico({ dados, cor }) {
  const ref = useRef(null);
  const BW=28, GAP=4, max=Math.max(...dados.map(d=>d.v),1);
  useEffect(()=>{ if(ref.current) ref.current.scrollLeft=ref.current.scrollWidth; },[]);
  return (
    <div>
      <div ref={ref} style={{overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:GAP,width:dados.length*(BW+GAP),minWidth:"100%",paddingRight:8}}>
          {dados.map((d,i)=>(
            <div key={i} style={{width:BW,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center"}}>
              <span style={{fontSize:8,color:d.v>0?cor:"transparent",fontWeight:700,marginBottom:2,whiteSpace:"nowrap",transform:"rotate(-35deg)",transformOrigin:"bottom center",display:"block",height:16,lineHeight:"16px"}}>{fBRLs(d.v)}</span>
              <div style={{width:"100%",background:d.v>0?cor:"#EEE",borderRadius:"3px 3px 0 0",height:`${Math.max((d.v/max)*56,d.v>0?4:2)}px`,transition:"height .3s"}}/>
              <span style={{fontSize:8,color:"#999",marginTop:3,whiteSpace:"nowrap"}}>{d.l}</span>
            </div>
          ))}
        </div>
      </div>
      {!dados.some(d=>d.v>0)&&<p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"8px 0 0"}}>Nenhuma venda registrada ainda.</p>}
      <p style={{fontSize:10,color:"#bbb",textAlign:"center",margin:"6px 0 0"}}>← deslize para ver dias anteriores</p>
    </div>
  );
}

// ── Seletor de local ──────────────────────────────────────────────────────────
function SeletorLocal({ valor, onChange, corAtivo }) {
  return (
    <div>
      <label style={LS}>Local de venda</label>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {["",...LOCAIS].map(l=>(
          <button key={l} onClick={()=>onChange(l)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${valor===l?corAtivo:C.creme}`,background:valor===l?corAtivo:C.white,color:valor===l?C.white:C.caramelo,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>
            {l||"Não informado"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Contador de produto ───────────────────────────────────────────────────────
function ContProd({ p, qtd, onMenos, onMais, onChange }) {
  return (
    <div style={{border:`1.5px solid ${qtd>0?p.cor:"#E0D5CA"}`,borderRadius:8,padding:"10px 12px",background:qtd>0?p.cor+"15":"#FAFAFA"}}>
      <p style={{margin:"0 0 6px",fontSize:11,fontWeight:600,color:p.cor}}>{p.emoji} {p.label}</p>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button onClick={onMenos} style={BQS(p.cor)}>−</button>
        <input type="number" min={0} value={qtd} onChange={onChange} style={{width:40,textAlign:"center",border:"1px solid #ccc",borderRadius:6,padding:"3px 0",fontWeight:700,fontSize:15}}/>
        <button onClick={onMais} style={BQS(p.cor)}>+</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [aba,  setAba]  = useState("enc");
  const [encs, setEncs] = useState([]);
  const [vens, setVens] = useState([]);
  const [dess, setDess] = useState([]);
  const [fEnc, setFEnc] = useState(rEnc());
  const [fVen, setFVen] = useState(rVen());
  const [fDes, setFDes] = useState(rDes());
  const [eEId, setEEId] = useState(null);
  const [eVId, setEVId] = useState(null);
  const [eDId, setEDId] = useState(null);

  const [lBusca,  setLBusca]  = useState("");
  const [lTipo,   setLTipo]   = useState("Todos");
  const [lSt,     setLSt]     = useState("Todos");
  const [lDe,     setLDe]     = useState("");
  const [lAte,    setLAte]    = useState("");
  const [dBusca,  setDBusca]  = useState("");
  const [dCat,    setDCat]    = useState("Todas");
  const [dDe,     setDDe]     = useState("");
  const [dAte,    setDAte]    = useState("");

  const [load, setLoad] = useState(true);
  const [salv, setSalv] = useState(false);
  const [erro, setErro] = useState("");

  // ── Carregar ────────────────────────────────────────────────────────────────
  const carregar = useCallback(async ()=>{
    setErro("");
    try {
      const [rE,rV,rD] = await Promise.all([
        fetch(`${U.enc}?select=*&order=data_entrega.asc`,{headers:SH}),
        fetch(`${U.ven}?select=*&order=data.desc`,{headers:SH}),
        fetch(`${U.des}?select=*&order=data.desc`,{headers:SH}),
      ]);
      if(!rE.ok||!rV.ok||!rD.ok) throw new Error();
      const [dE,dV,dD] = await Promise.all([rE.json(),rV.json(),rD.json()]);
      setEncs(dE.map(dbEnc));
      setVens(dV.map(dbVen));
      setDess(dD.map(dbDes));
    } catch { setErro("Não foi possível carregar. Verifique sua conexão."); }
    finally { setLoad(false); }
  },[]);
  useEffect(()=>{ carregar(); },[carregar]);

  // ── CRUD Encomendas ──────────────────────────────────────────────────────────
  async function salvarEnc() {
    const tot=PRODS.reduce((a,p)=>a+qtdEnc(fEnc,p.id),0);
    if(!fEnc.nome.trim()||!fEnc.dataEntrega||tot===0) return;
    setSalv(true); setErro("");
    try {
      if(eEId){
        const res=await fetch(`${U.enc}?id=eq.${eEId}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(encDb({...fEnc,id:eEId}))});
        if(!res.ok) throw new Error(); const [a]=await res.json();
        setEncs(p=>p.map(e=>e.id===eEId?dbEnc(a):e)); setEEId(null);
      } else {
        const id=gId(); const res=await fetch(U.enc,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(encDb({...fEnc,id}))});
        if(!res.ok) throw new Error(); const [c]=await res.json(); setEncs(p=>[...p,dbEnc(c)]);
      }
      setFEnc(rEnc());
    } catch { setErro("Não foi possível salvar a encomenda."); } finally { setSalv(false); }
  }
  async function remEnc(id) {
    if(!window.confirm("Remover esta encomenda?")) return;
    try { await fetch(`${U.enc}?id=eq.${id}`,{method:"DELETE",headers:SH}); setEncs(p=>p.filter(e=>e.id!==id)); if(eEId===id){setEEId(null);setFEnc(rEnc());} }
    catch { setErro("Não foi possível remover."); }
  }
  async function chgSt(id,status) {
    setEncs(p=>p.map(e=>e.id===id?{...e,status}:e));
    try { await fetch(`${U.enc}?id=eq.${id}`,{method:"PATCH",headers:SH,body:JSON.stringify({status})}); }
    catch { setErro("Erro ao atualizar status."); carregar(); }
  }

  // ── CRUD Vendas ──────────────────────────────────────────────────────────────
  async function salvarVen() {
    const tot=PRODS.reduce((a,p)=>a+qtdVen(fVen,p.id),0);
    if(!fVen.data||tot===0) return;
    setSalv(true); setErro("");
    try {
      if(eVId){
        const res=await fetch(`${U.ven}?id=eq.${eVId}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(venDb({...fVen,id:eVId}))});
        if(!res.ok) throw new Error(); const [a]=await res.json();
        setVens(p=>p.map(v=>v.id===eVId?dbVen(a):v)); setEVId(null);
      } else {
        const id=gId(); const res=await fetch(U.ven,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(venDb({...fVen,id}))});
        if(!res.ok) throw new Error(); const [c]=await res.json(); setVens(p=>[dbVen(c),...p]);
      }
      setFVen(rVen());
    } catch { setErro("Não foi possível salvar a venda."); } finally { setSalv(false); }
  }
  async function remVen(id) {
    if(!window.confirm("Remover esta venda?")) return;
    try { await fetch(`${U.ven}?id=eq.${id}`,{method:"DELETE",headers:SH}); setVens(p=>p.filter(v=>v.id!==id)); if(eVId===id){setEVId(null);setFVen(rVen());} }
    catch { setErro("Não foi possível remover."); }
  }

  // ── CRUD Despesas ────────────────────────────────────────────────────────────
  async function salvarDes() {
    if(!fDes.data||!fDes.categoria||+fDes.valor<=0) return;
    setSalv(true); setErro("");
    try {
      if(eDId){
        const res=await fetch(`${U.des}?id=eq.${eDId}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(desDb({...fDes,id:eDId}))});
        if(!res.ok) throw new Error(); const [a]=await res.json();
        setDess(p=>p.map(d=>d.id===eDId?dbDes(a):d)); setEDId(null);
      } else {
        const id=gId(); const res=await fetch(U.des,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(desDb({...fDes,id}))});
        if(!res.ok) throw new Error(); const [c]=await res.json(); setDess(p=>[dbDes(c),...p]);
      }
      setFDes(rDes());
    } catch { setErro("Não foi possível salvar a despesa."); } finally { setSalv(false); }
  }
  async function remDes(id) {
    if(!window.confirm("Remover esta despesa?")) return;
    try { await fetch(`${U.des}?id=eq.${id}`,{method:"DELETE",headers:SH}); setDess(p=>p.filter(d=>d.id!==id)); if(eDId===id){setEDId(null);setFDes(rDes());} }
    catch { setErro("Não foi possível remover."); }
  }

  // ── Cálculos ─────────────────────────────────────────────────────────────────
  const totEnc = useMemo(()=>{
    const r={ninho:0,doceleit:0,brigadeiro:0,miettes:0,minibrownie:0,minimiettes:0,miettesamendoim:0};
    encs.filter(e=>e.status!=="Cancelado"&&e.status!=="Entregue").forEach(e=>PRODS.forEach(p=>{ r[p.id]+=qtdEnc(e,p.id); }));
    return r;
  },[encs]);

  const resumoDia = useMemo(()=>{
    const hj=hoje(), vh=vens.filter(v=>v.data===hj);
    const qtds={ninho:0,doceleit:0,brigadeiro:0,miettes:0,minibrownie:0,minimiettes:0,miettesamendoim:0}; let total=0;
    vh.forEach(v=>PRODS.forEach(p=>{ qtds[p.id]+=qtdVen(v,p.id); total+=qtdVen(v,p.id)*valVen(v,p.id); }));
    return { qtds, total, unidades:Object.values(qtds).reduce((a,b)=>a+b,0), nVendas:vh.length };
  },[vens]);

  const listaUni = useMemo(()=>{
    const items=[];
    encs.filter(e=>{
      const mb=e.nome.toLowerCase().includes(lBusca.toLowerCase());
      const ms=lSt==="Todos"||e.status===lSt;
      const mt=lTipo==="Todos"||lTipo==="Encomendas";
      const de=!lDe||e.dataEntrega>=lDe; const ate=!lAte||e.dataEntrega<=lAte;
      return mb&&ms&&mt&&de&&ate;
    }).forEach(e=>items.push({tipo:"enc",data:e.dataEntrega,obj:e}));
    if(lTipo==="Todos"||lTipo==="Vendas Avulsas"){
      vens.filter(v=>{
        const mb=lBusca===""||v.observacoes.toLowerCase().includes(lBusca.toLowerCase());
        const de=!lDe||v.data>=lDe; const ate=!lAte||v.data<=lAte;
        return mb&&(lSt==="Todos"||lSt==="Confirmado")&&de&&ate;
      }).forEach(v=>items.push({tipo:"ven",data:v.data,obj:v}));
    }
    return items.sort((a,b)=>b.data.localeCompare(a.data));
  },[encs,vens,lBusca,lSt,lTipo,lDe,lAte]);

  const desFilt = useMemo(()=>dess.filter(d=>{
    const mb=dBusca===""||d.observacoes.toLowerCase().includes(dBusca.toLowerCase())||d.fornecedor.toLowerCase().includes(dBusca.toLowerCase());
    const mc=dCat==="Todas"||d.categoria===dCat;
    const de=!dDe||d.data>=dDe; const ate=!dAte||d.data<=dAte;
    return mb&&mc&&de&&ate;
  }),[dess,dBusca,dCat,dDe,dAte]);

  const dash = useMemo(()=>{
    const sem=semanaAtual(), c30=nAgo(30), c90=nAgo(90);
    const vS=vens.filter(v=>v.data>=sem.ini&&v.data<=sem.fim);
    const eS=encs.filter(e=>e.status==="Entregue"&&e.dataEntrega>=sem.ini&&e.dataEntrega<=sem.fim);
    const dS=dess.filter(d=>d.data>=sem.ini&&d.data<=sem.fim);
    let fatS=0;
    vS.forEach(v=>PRODS.forEach(p=>{ fatS+=qtdVen(v,p.id)*valVen(v,p.id); }));
    eS.forEach(e=>PRODS.forEach(p=>{ fatS+=qtdEnc(e,p.id)*p.preco; }));
    const despS=dS.reduce((a,d)=>a+(+d.valor||0),0);

    const vP=vens.filter(v=>v.data>=c30);
    const eP=encs.filter(e=>e.status==="Entregue"&&e.dataEntrega>=c30);
    const dP=dess.filter(d=>d.data>=c30);
    let fat30=0, uni30=0;
    const pp={ninho:{q:0,r:0},doceleit:{q:0,r:0},brigadeiro:{q:0,r:0},miettes:{q:0,r:0},minibrownie:{q:0,r:0},minimiettes:{q:0,r:0},miettesamendoim:{q:0,r:0}};
    vP.forEach(v=>PRODS.forEach(p=>{ const q=qtdVen(v,p.id),vl=valVen(v,p.id); pp[p.id].q+=q; pp[p.id].r+=q*vl; fat30+=q*vl; uni30+=q; }));
    eP.forEach(e=>PRODS.forEach(p=>{ const q=qtdEnc(e,p.id); pp[p.id].q+=q; pp[p.id].r+=q*p.preco; fat30+=q*p.preco; uni30+=q; }));
    const desp30=dP.reduce((a,d)=>a+(+d.valor||0),0);

    const dm={};
    for(let i=89;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); dm[d.toISOString().slice(0,10)]=0; }
    vens.filter(v=>v.data>=c90).forEach(v=>PRODS.forEach(p=>{ dm[v.data]=(dm[v.data]||0)+qtdVen(v,p.id)*valVen(v,p.id); }));
    encs.filter(e=>e.status==="Entregue"&&e.dataEntrega>=c90).forEach(e=>{ let s=0; PRODS.forEach(p=>{ s+=qtdEnc(e,p.id)*p.preco; }); dm[e.dataEntrega]=(dm[e.dataEntrega]||0)+s; });
    const serie=Object.entries(dm).map(([d,v])=>({l:`${d.slice(8)}/${d.slice(5,7)}`,v}));

    const ranking=PRODS.map(p=>({...p,qtd:pp[p.id].q,rec:pp[p.id].r})).sort((a,b)=>b.qtd-a.qtd);

    const pL={};
    [...LOCAIS,"Não informado"].forEach(l=>{ pL[l]={fat:0,qtd:0,prods:{}} ; PRODS.forEach(p=>{pL[l].prods[p.id]=0;}); });
    vP.forEach(v=>{ const l=v.localVenda||"Não informado"; if(!pL[l]){pL[l]={fat:0,qtd:0,prods:{}}; PRODS.forEach(p=>{pL[l].prods[p.id]=0;});} PRODS.forEach(p=>{ const q=qtdVen(v,p.id),vl=valVen(v,p.id); pL[l].fat+=q*vl; pL[l].qtd+=q; pL[l].prods[p.id]+=q; }); });
    eP.forEach(e=>{ const l=e.localVenda||"Não informado"; if(!pL[l]){pL[l]={fat:0,qtd:0,prods:{}}; PRODS.forEach(p=>{pL[l].prods[p.id]=0;});} PRODS.forEach(p=>{ const q=qtdEnc(e,p.id); pL[l].fat+=q*p.preco; pL[l].qtd+=q; pL[l].prods[p.id]+=q; }); });
    const rankL=Object.entries(pL).map(([local,d])=>{ const top=PRODS.reduce((b,p)=>(d.prods[p.id]||0)>(d.prods[b.id]||0)?p:b,PRODS[0]); return {local,...d,top:d.qtd>0?top:null}; }).filter(d=>d.qtd>0).sort((a,b)=>b.fat-a.fat);

    return { sem, fatS, despS, liqS:fatS-despS, fat30, desp30, liq30:fat30-desp30, uni30, ticket:(vP.length+eP.length)>0?fat30/(vP.length+eP.length):0, serie, ranking, rankL, nV:vP.length, nE:eP.length };
  },[vens,encs,dess]);

  const totFEnc = PRODS.reduce((a,p)=>a+qtdEnc(fEnc,p.id),0);
  const totFVen = PRODS.reduce((a,p)=>a+qtdVen(fVen,p.id),0);
  const totVVen = PRODS.reduce((a,p)=>a+qtdVen(fVen,p.id)*valVen(fVen,p.id),0);
  const totDesFil= desFilt.reduce((a,d)=>a+(+d.valor||0),0);

  const ABAS=[["enc","📋","Encomendas"],["ven","💰","Vendas"],["des","💸","Despesas"],["lst","📦","Lista"],["dsh","📊","Dashboard"]];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Montserrat',sans-serif",background:C.bg,minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <header style={{background:C.marrom,paddingTop:"calc(env(safe-area-inset-top) + 18px)",paddingBottom:12,paddingLeft:24,paddingRight:24,textAlign:"center"}}>
        <p style={{fontFamily:"'Cormorant Garamond',serif",color:C.creme,fontSize:26,fontWeight:700,margin:0,letterSpacing:3}}>BROWNÊ</p>
        <p style={{color:C.cremedark,fontSize:9,letterSpacing:2,margin:"3px 0 0",textTransform:"uppercase"}}>Gestão de Vendas & Encomendas</p>
      </header>
      {erro&&<div style={{background:"#F8D7DA",color:"#721C24",padding:"8px 16px",fontSize:12,textAlign:"center",fontWeight:600}}>⚠️ {erro}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",background:C.caramelo}}>
        {ABAS.map(([id,ic,lb])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"9px 2px",border:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:8,textTransform:"uppercase",letterSpacing:.3,background:aba===id?C.bg:"transparent",color:aba===id?C.marrom:C.creme,borderBottom:aba===id?`3px solid ${C.marrom}`:"3px solid transparent"}}>
            <div style={{fontSize:14}}>{ic}</div>{lb}
          </button>
        ))}
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"18px 14px 60px"}}>
        {load?(
          <div style={{textAlign:"center",padding:"60px 20px",color:C.caramelo}}>
            <p style={{fontSize:36}}>🍫</p>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>Carregando...</p>
          </div>
        ):(<>

        {/* ══ ENCOMENDAS ══ */}
        {aba==="enc"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:18}}>
              {PRODS.map(p=>(
                <div key={p.id} style={{background:C.white,borderRadius:10,padding:"12px 16px",borderLeft:`4px solid ${p.cor}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <p style={{margin:0,fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{p.emoji} {p.label}</p>
                  <p style={{margin:"4px 0 0",fontSize:26,fontWeight:700,color:p.cor,fontFamily:"'Cormorant Garamond',serif"}}>{totEnc[p.id]||0}</p>
                </div>
              ))}
            </div>
            <div style={{background:C.white,borderRadius:12,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.marrom,margin:"0 0 14px",borderBottom:`2px solid ${C.creme}`,paddingBottom:8}}>{eEId?"✏️ Editar Encomenda":"Nova Encomenda"}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div><label style={LS}>Nome *</label><input value={fEnc.nome} onChange={e=>setFEnc(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" style={IS}/></div>
                <div><label style={LS}>Telefone</label><input value={fEnc.telefone} onChange={e=>setFEnc(f=>({...f,telefone:e.target.value}))} placeholder="(21) 99999-9999" style={IS}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><label style={LS}>Data de entrega *</label><input type="date" value={fEnc.dataEntrega} min={hoje()} onChange={e=>setFEnc(f=>({...f,dataEntrega:e.target.value}))} style={DS}/></div>
                <div><label style={LS}>Status</label><select value={fEnc.status} onChange={e=>setFEnc(f=>({...f,status:e.target.value}))} style={IS}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
              </div>
              <label style={{...LS,display:"block",marginBottom:8}}>Produtos *</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
                {PRODS.map(p=>(
                  <ContProd key={p.id} p={p} qtd={fEnc.qtd[p.id]||0}
                    onMenos={()=>setFEnc(f=>({...f,qtd:{...f.qtd,[p.id]:Math.max(0,(f.qtd[p.id]||0)-1)}}))}
                    onMais={()=>setFEnc(f=>({...f,qtd:{...f.qtd,[p.id]:(f.qtd[p.id]||0)+1}}))}
                    onChange={e=>setFEnc(f=>({...f,qtd:{...f.qtd,[p.id]:Math.max(0,parseInt(e.target.value)||0)}}))}
                  />
                ))}
              </div>
              <div style={{marginBottom:12}}><label style={LS}>Observações</label><textarea value={fEnc.observacoes} onChange={e=>setFEnc(f=>({...f,observacoes:e.target.value}))} placeholder="Mensagem, restrições, endereço..." rows={2} style={{...IS,resize:"vertical",minHeight:52}}/></div>
              <div style={{marginBottom:14}}><SeletorLocal valor={fEnc.localVenda} onChange={v=>setFEnc(f=>({...f,localVenda:v}))} corAtivo={C.caramelo}/></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={salvarEnc} disabled={!fEnc.nome.trim()||!fEnc.dataEntrega||totFEnc===0||salv} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:fEnc.nome.trim()&&fEnc.dataEntrega&&totFEnc>0&&!salv?C.marrom:"#ccc",color:C.white,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  {salv?"SALVANDO...":eEId?"SALVAR ALTERAÇÕES":`ADICIONAR${totFEnc>0?` (${totFEnc} un.)`:""}`}
                </button>
                {eEId&&<button onClick={()=>{setEEId(null);setFEnc(rEnc());}} style={{padding:"11px 14px",borderRadius:8,border:`2px solid ${C.marrom}`,background:"transparent",color:C.marrom,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Cancelar</button>}
              </div>
            </div>
          </div>
        )}

        {/* ══ VENDAS AVULSAS ══ */}
        {aba==="ven"&&(
          <div>
            <div style={{background:C.marrom,borderRadius:12,padding:"16px 18px",marginBottom:18,boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",color:C.creme,fontSize:18,fontWeight:700,margin:"0 0 12px"}}>Resumo de Hoje</p>
              {resumoDia.unidades===0?<p style={{color:C.cremedark,fontSize:12,margin:0}}>Nenhuma venda avulsa registrada hoje.</p>:(<>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div><p style={{margin:0,color:C.cremedark,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Faturamento</p><p style={{margin:"2px 0 0",color:C.white,fontSize:22,fontWeight:700,fontFamily:"'Cormorant Garamond',serif"}}>{fBRL(resumoDia.total)}</p></div>
                  <div style={{textAlign:"right"}}><p style={{margin:0,color:C.cremedark,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Unidades · Vendas</p><p style={{margin:"2px 0 0",color:C.white,fontSize:22,fontWeight:700,fontFamily:"'Cormorant Garamond',serif"}}>{resumoDia.unidades} · {resumoDia.nVendas}</p></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {PRODS.map(p=><div key={p.id} style={{background:"rgba(255,255,255,.12)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}><p style={{margin:0,fontSize:13}}>{p.emoji}</p><p style={{margin:"2px 0 0",color:C.white,fontSize:15,fontWeight:700,fontFamily:"'Cormorant Garamond',serif"}}>{resumoDia.qtds[p.id]||0}</p></div>)}
                </div>
              </>)}
            </div>
            <div style={{background:C.white,borderRadius:12,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.marrom,margin:"0 0 14px",borderBottom:`2px solid ${C.creme}`,paddingBottom:8}}>{eVId?"✏️ Editar Venda":"💰 Registrar Venda Avulsa"}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><label style={LS}>Data *</label><input type="date" value={fVen.data} onChange={e=>setFVen(f=>({...f,data:e.target.value}))} style={DS}/></div>
                <div><label style={LS}>Observações</label><input value={fVen.observacoes} onChange={e=>setFVen(f=>({...f,observacoes:e.target.value}))} placeholder="Ex: bazar da igreja" style={IS}/></div>
              </div>
              <label style={{...LS,display:"block",marginBottom:8}}>Produtos e valores *</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
                {PRODS.map(p=>{
                  const it=fVen.itens[p.id]||{qtd:0,valor:p.preco};
                  return (
                    <div key={p.id} style={{border:`1.5px solid ${it.qtd>0?p.cor:"#E0D5CA"}`,borderRadius:8,padding:"10px 12px",background:it.qtd>0?p.cor+"15":"#FAFAFA"}}>
                      <p style={{margin:"0 0 6px",fontSize:11,fontWeight:600,color:p.cor}}>{p.emoji} {p.label}</p>
                      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                        <button onClick={()=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:Math.max(0,(f.itens[p.id]?.qtd||0)-1)}}}))} style={BQS(p.cor)}>−</button>
                        <input type="number" min={0} value={it.qtd} onChange={e=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:Math.max(0,parseInt(e.target.value)||0)}}}))} style={{width:36,textAlign:"center",border:"1px solid #ccc",borderRadius:6,padding:"3px 0",fontWeight:700,fontSize:14}}/>
                        <button onClick={()=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],qtd:(f.itens[p.id]?.qtd||0)+1}}}))} style={BQS(p.cor)}>+</button>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:11,color:"#888"}}>R$</span>
                        <input type="number" min={0} step="0.50" value={it.valor} onChange={e=>setFVen(f=>({...f,itens:{...f.itens,[p.id]:{...f.itens[p.id],valor:parseFloat(e.target.value)||0}}}))} style={{width:"100%",border:"1px solid #DDD0C4",borderRadius:6,padding:"4px 6px",fontSize:13,fontFamily:"'Montserrat',sans-serif"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totFVen>0&&<div style={{background:C.creme,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,color:C.marrom,fontSize:13}}>{totFVen} unidades</span><span style={{fontWeight:700,color:C.verde,fontSize:15}}>{fBRL(totVVen)}</span></div>}
              <div style={{marginBottom:14}}><SeletorLocal valor={fVen.localVenda} onChange={v=>setFVen(f=>({...f,localVenda:v}))} corAtivo={C.verde}/></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={salvarVen} disabled={!fVen.data||totFVen===0||salv} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:fVen.data&&totFVen>0&&!salv?C.verde:"#ccc",color:C.white,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  {salv?"SALVANDO...":eVId?"SALVAR ALTERAÇÕES":`REGISTRAR${totFVen>0?` · ${fBRL(totVVen)}`:""}`}
                </button>
                {eVId&&<button onClick={()=>{setEVId(null);setFVen(rVen());}} style={{padding:"11px 14px",borderRadius:8,border:`2px solid ${C.verde}`,background:"transparent",color:C.verde,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Cancelar</button>}
              </div>
            </div>
          </div>
        )}

        {/* ══ DESPESAS ══ */}
        {aba==="des"&&(
          <div>
            <div style={{background:C.white,borderRadius:12,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,.08)",marginBottom:18}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:C.vermelho,margin:"0 0 14px",borderBottom:`2px solid ${C.creme}`,paddingBottom:8}}>{eDId?"✏️ Editar Despesa":"💸 Nova Despesa"}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><label style={LS}>Data *</label><input type="date" value={fDes.data} onChange={e=>setFDes(f=>({...f,data:e.target.value}))} style={DS}/></div>
                <div><label style={LS}>Valor (R$) *</label><input type="number" min={0} step="0.01" value={fDes.valor} onChange={e=>setFDes(f=>({...f,valor:e.target.value}))} placeholder="0,00" style={IS}/></div>
              </div>
              <label style={{...LS,display:"block",marginBottom:8}}>Categoria *</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
                {CATS.map(cat=>(
                  <button key={cat.id} onClick={()=>setFDes(f=>({...f,categoria:cat.id}))} style={{padding:"8px 6px",borderRadius:8,border:`1.5px solid ${fDes.categoria===cat.id?cat.cor:"#E0D5CA"}`,background:fDes.categoria===cat.id?cat.cor+"20":"#FAFAFA",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:700,color:fDes.categoria===cat.id?cat.cor:"#888",textAlign:"center"}}>
                    <div style={{fontSize:16,marginBottom:2}}>{cat.emoji}</div>{cat.label}
                  </button>
                ))}
              </div>
              <div style={{marginBottom:12}}><label style={LS}>Fornecedor / Local</label><select value={fDes.fornecedor} onChange={e=>setFDes(f=>({...f,fornecedor:e.target.value}))} style={IS}>{FORNEC.map(f=><option key={f}>{f}</option>)}</select></div>
              <div style={{marginBottom:14}}><label style={LS}>Observações</label><input value={fDes.observacoes} onChange={e=>setFDes(f=>({...f,observacoes:e.target.value}))} placeholder="Ex: chocolate, leite condensado..." style={IS}/></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={salvarDes} disabled={!fDes.data||+fDes.valor<=0||salv} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:fDes.data&&+fDes.valor>0&&!salv?C.vermelho:"#ccc",color:C.white,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  {salv?"SALVANDO...":eDId?"SALVAR ALTERAÇÕES":fDes.valor?`REGISTRAR · ${fBRL(+fDes.valor)}`:"REGISTRAR DESPESA"}
                </button>
                {eDId&&<button onClick={()=>{setEDId(null);setFDes(rDes());}} style={{padding:"11px 14px",borderRadius:8,border:`2px solid ${C.vermelho}`,background:"transparent",color:C.vermelho,fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Cancelar</button>}
              </div>
            </div>
            <div style={{background:C.white,borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>🔍 Filtrar</span>
                {(dDe||dAte||dCat!=="Todas"||dBusca)&&<button onClick={()=>{setDDe("");setDAte("");setDCat("Todas");setDBusca("");}} style={{fontSize:10,color:C.caramelo,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Limpar ✕</button>}
              </div>
              <input value={dBusca} onChange={e=>setDBusca(e.target.value)} placeholder="Buscar por fornecedor ou observação..." style={{...IS,marginBottom:8}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div><label style={LS}>De</label><input type="date" value={dDe} onChange={e=>setDDe(e.target.value)} style={DS}/></div>
                <div><label style={LS}>Até</label><input type="date" value={dAte} onChange={e=>setDAte(e.target.value)} style={DS}/></div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[{id:"Todas",label:"Todas",emoji:"📋"},...CATS].map(cat=>(
                  <button key={cat.id} onClick={()=>setDCat(cat.id)} style={{padding:"3px 10px",borderRadius:20,border:`1.5px solid ${dCat===cat.id?C.marrom:C.creme}`,background:dCat===cat.id?C.marrom:C.white,color:dCat===cat.id?C.white:C.caramelo,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:11,color:"#aaa",fontWeight:600}}>{desFilt.length} despesa{desFilt.length!==1?"s":""}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.vermelho}}>{fBRL(totDesFil)}</span>
            </div>
            {desFilt.length===0?<div style={{textAlign:"center",padding:"32px",color:"#aaa"}}><p style={{fontSize:32,margin:0}}>💸</p><p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>Nenhuma despesa encontrada.</p></div>:
            desFilt.map(d=>{ const cat=CATS.find(c=>c.id===d.categoria)||CATS[5]; return (
              <div key={d.id} style={{background:C.white,borderRadius:10,marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,.07)",borderLeft:`4px solid ${cat.cor}`}}>
                <div style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                    <div><span style={{fontSize:9,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:1}}>{cat.emoji} {cat.label}</span><p style={{margin:"2px 0 0",fontWeight:700,color:C.marrom,fontSize:14}}>{fBRL(d.valor)}</p>{d.fornecedor&&<p style={{margin:"1px 0 0",fontSize:11,color:"#888"}}>{d.fornecedor}</p>}</div>
                    <span style={{background:C.creme,color:C.marrom,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>📅 {fData(d.data)}</span>
                  </div>
                  {d.observacoes&&<p style={{margin:"4px 0 6px",fontSize:11,color:"#666",fontStyle:"italic"}}>💬 {d.observacoes}</p>}
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button onClick={()=>{setFDes({data:d.data,categoria:d.categoria,fornecedor:d.fornecedor,valor:String(d.valor),observacoes:d.observacoes});setEDId(d.id);window.scrollTo({top:0,behavior:"smooth"});}} style={BAS(C.caramelo)}>✏️ Editar</button>
                    <button onClick={()=>remDes(d.id)} style={BAS("#dc3545")}>🗑 Remover</button>
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}

        {/* ══ LISTA UNIFICADA ══ */}
        {aba==="lst"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <input value={lBusca} onChange={e=>setLBusca(e.target.value)} placeholder="🔍 Buscar..." style={{...IS,flex:1,minWidth:120}}/>
              <select value={lTipo} onChange={e=>setLTipo(e.target.value)} style={{...IS,width:"auto"}}>
                {["Todos","Encomendas","Vendas Avulsas"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{background:C.white,borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>📅 Período</span>
                {(lDe||lAte)&&<button onClick={()=>{setLDe("");setLAte("");}} style={{fontSize:10,color:C.caramelo,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Limpar ✕</button>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div><label style={LS}>De</label><input type="date" value={lDe} onChange={e=>setLDe(e.target.value)} style={DS}/></div>
                <div><label style={LS}>Até</label><input type="date" value={lAte} onChange={e=>setLAte(e.target.value)} style={DS}/></div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{lb:"Hoje",de:hoje(),ate:hoje()},{lb:"Esta semana",de:nAgo(6),ate:hoje()},{lb:"Este mês",de:nAgo(29),ate:hoje()},{lb:"Tudo",de:"",ate:""}].map(a=>(
                  <button key={a.lb} onClick={()=>{setLDe(a.de);setLAte(a.ate);}} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${lDe===a.de&&lAte===a.ate?C.marrom:C.creme}`,background:lDe===a.de&&lAte===a.ate?C.marrom:C.white,color:lDe===a.de&&lAte===a.ate?C.white:C.caramelo,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>{a.lb}</button>
                ))}
              </div>
            </div>
            {lTipo!=="Vendas Avulsas"&&<div style={{marginBottom:10}}><select value={lSt} onChange={e=>setLSt(e.target.value)} style={{...IS,width:"auto"}}><option value="Todos">Todos os status</option>{STATUS.map(s=><option key={s}>{s}</option>)}</select></div>}
            <p style={{fontSize:11,color:"#aaa",margin:"0 0 10px",fontWeight:600}}>{listaUni.length} {listaUni.length===1?"item":"itens"}</p>
            {listaUni.length===0?<div style={{textAlign:"center",padding:"40px",color:"#aaa"}}><p style={{fontSize:36}}>🍫</p><p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18}}>Nenhum item encontrado.</p></div>:
            listaUni.map(({tipo,obj})=>{
              if(tipo==="enc"){
                const sc=ST_COR[obj.status]||ST_COR["Pendente"];
                const eu=PRODS.reduce((a,p)=>a+qtdEnc(obj,p.id),0);
                const ev=PRODS.reduce((a,p)=>a+qtdEnc(obj,p.id)*p.preco,0);
                return (
                  <div key={"e"+obj.id} style={{background:C.white,borderRadius:10,marginBottom:10,boxShadow:"0 1px 5px rgba(0,0,0,.08)",borderLeft:`4px solid ${obj.status==="Entregue"?C.verde:obj.status==="Cancelado"?"#dc3545":C.marrom}`}}>
                    <div style={{padding:"13px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                        <div><span style={{fontSize:9,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:1}}>📋 Encomenda</span><p style={{margin:"2px 0 0",fontWeight:700,color:C.marrom,fontSize:14}}>{obj.nome}</p>{obj.telefone&&<p style={{margin:"1px 0 0",fontSize:11,color:"#888"}}>{obj.telefone}</p>}</div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                          <select value={obj.status} onChange={e=>chgSt(obj.id,e.target.value)} style={{background:sc.bg,color:sc.txt,border:"none",borderRadius:20,padding:"3px 8px",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"'Montserrat',sans-serif"}}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
                          <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:11,color:"#888"}}>{eu} un.</p><p style={{margin:"1px 0 0",fontWeight:700,color:C.caramelo,fontSize:15}}>{fBRL(ev)}</p></div>
                        </div>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:obj.observacoes?6:0}}>
                        <span style={{background:C.creme,color:C.marrom,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>📅 {fData(obj.dataEntrega)}</span>
                        {obj.localVenda&&<span style={{background:C.caramelo+"20",color:C.caramelo,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>📍 {obj.localVenda}</span>}
                        {PRODS.map(p=>qtdEnc(obj,p.id)>0&&<span key={p.id} style={{background:p.cor+"20",color:p.cor,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{p.emoji} {p.label}: {qtdEnc(obj,p.id)}</span>)}
                      </div>
                      {obj.observacoes&&<p style={{margin:"4px 0 6px",fontSize:11,color:"#666",fontStyle:"italic"}}>💬 {obj.observacoes}</p>}
                      <div style={{display:"flex",gap:6,marginTop:8}}>
                        <button onClick={()=>{setFEnc({...obj,qtd:{...obj.qtd},localVenda:obj.localVenda||""});setEEId(obj.id);setAba("enc");window.scrollTo({top:0,behavior:"smooth"});}} style={BAS(C.caramelo)}>✏️ Editar</button>
                        <button onClick={()=>remEnc(obj.id)} style={BAS("#dc3545")}>🗑 Remover</button>
                      </div>
                    </div>
                  </div>
                );
              }
              const tv=PRODS.reduce((a,p)=>a+qtdVen(obj,p.id)*valVen(obj,p.id),0);
              const tu=PRODS.reduce((a,p)=>a+qtdVen(obj,p.id),0);
              return (
                <div key={"v"+obj.id} style={{background:C.white,borderRadius:10,marginBottom:10,boxShadow:"0 1px 5px rgba(0,0,0,.08)",borderLeft:`4px solid ${C.verde}`}}>
                  <div style={{padding:"13px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                      <div><span style={{fontSize:9,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:1}}>💰 Venda Avulsa</span><p style={{margin:"2px 0 0",fontWeight:700,color:C.verde,fontSize:14}}>📅 {fData(obj.data)}</p>{obj.observacoes&&<p style={{margin:"1px 0 0",fontSize:11,color:"#888",fontStyle:"italic"}}>{obj.observacoes}</p>}</div>
                      <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:11,color:"#888"}}>{tu} un.</p><p style={{margin:"2px 0 0",fontWeight:700,color:C.verde,fontSize:15}}>{fBRL(tv)}</p></div>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                      {obj.localVenda&&<span style={{background:C.verde+"20",color:C.verde,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>📍 {obj.localVenda}</span>}
                      {PRODS.map(p=>qtdVen(obj,p.id)>0&&<span key={p.id} style={{background:p.cor+"20",color:p.cor,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{p.emoji} {p.label}: {qtdVen(obj,p.id)} × {fBRL(valVen(obj,p.id))}</span>)}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setFVen({data:obj.data,observacoes:obj.observacoes,localVenda:obj.localVenda||"",itens:{...obj.itens}});setEVId(obj.id);setAba("ven");window.scrollTo({top:9999,behavior:"smooth"});}} style={BAS(C.caramelo)}>✏️ Editar</button>
                      <button onClick={()=>remVen(obj.id)} style={BAS("#dc3545")}>🗑 Remover</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {aba==="dsh"&&(
          <div>
            <div style={{background:C.marrom,borderRadius:12,padding:18,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",color:C.creme,fontSize:18,fontWeight:700,margin:"0 0 4px"}}>Semana atual</p>
              <p style={{color:C.cremedark,fontSize:10,margin:"0 0 14px"}}>{fData(dash.sem.ini)} → {fData(dash.sem.fim)}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[{lb:"Faturamento",v:fBRL(dash.fatS),cor:C.cremedark},{lb:"Despesas",v:fBRL(dash.despS),cor:"#F4A0A0"},{lb:"Líquido",v:fBRL(dash.liqS),cor:dash.liqS>=0?"#A8D8A8":"#F4A0A0"}].map((k,i)=>(
                  <div key={i} style={{background:"rgba(255,255,255,.10)",borderRadius:8,padding:"10px 10px"}}>
                    <p style={{margin:0,fontSize:9,color:C.cremedark,textTransform:"uppercase",letterSpacing:1}}>{k.lb}</p>
                    <p style={{margin:"4px 0 0",fontSize:14,fontWeight:700,color:k.cor,fontFamily:"'Cormorant Garamond',serif"}}>{k.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:C.marrom,margin:"0 0 10px"}}>Últimos 30 dias</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[{lb:"Faturamento",v:fBRL(dash.fat30),cor:C.verde,ic:"💰"},{lb:"Despesas",v:fBRL(dash.desp30),cor:C.vermelho,ic:"💸"},{lb:"Lucro líquido",v:fBRL(dash.liq30),cor:dash.liq30>=0?C.verde:C.vermelho,ic:"📈"},{lb:"Unidades vendidas",v:String(dash.uni30),cor:C.caramelo,ic:"🍫"}].map((k,i)=>(
                <div key={i} style={{background:C.white,borderRadius:10,padding:"14px 16px",borderLeft:`4px solid ${k.cor}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <p style={{margin:0,fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{k.ic} {k.lb}</p>
                  <p style={{margin:"5px 0 0",fontSize:22,fontWeight:700,color:k.cor,fontFamily:"'Cormorant Garamond',serif",lineHeight:1.2}}>{k.v}</p>
                </div>
              ))}
            </div>
            <div style={{background:C.white,borderRadius:12,padding:"16px 14px",marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>📈 Faturamento diário <span style={{fontWeight:400,color:"#bbb",fontSize:10,textTransform:"none",letterSpacing:0}}>— 90 dias</span></p>
              <Grafico dados={dash.serie} cor={C.caramelo}/>
            </div>
            <div style={{background:C.white,borderRadius:12,padding:"16px 14px",marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>🏆 Ranking de sabores</p>
              {dash.ranking.every(p=>p.qtd===0)?<p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"8px 0"}}>Nenhuma venda registrada ainda.</p>:
              dash.ranking.map((p,i)=>{ const mx=dash.ranking[0].qtd||1; return (
                <div key={p.id} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:700,color:p.cor}}>{i===0?"🥇":i===1?"🥈":"🥉"} {p.emoji} {p.label}</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#555"}}>{p.qtd} un. · {fBRL(p.rec)}</span>
                  </div>
                  <div style={{background:"#F0E8DF",borderRadius:99,height:6,overflow:"hidden"}}><div style={{width:`${(p.qtd/mx)*100}%`,background:p.cor,height:"100%",borderRadius:99,transition:"width .4s"}}/></div>
                </div>
              );})}
            </div>
            <div style={{background:C.white,borderRadius:12,padding:"16px 14px",marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>🍩 Participação por sabor</p>
              {dash.uni30===0?<p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"8px 0"}}>Nenhuma venda registrada ainda.</p>:(<>
                <div style={{display:"flex",height:12,borderRadius:99,overflow:"hidden",marginBottom:12}}>{dash.ranking.filter(p=>p.qtd>0).map(p=><div key={p.id} style={{width:`${(p.qtd/dash.uni30)*100}%`,background:p.cor}}/>)}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>{dash.ranking.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:p.cor,flexShrink:0}}/><span style={{fontSize:11,color:"#555"}}>{p.label}: <b>{dash.uni30>0?Math.round((p.qtd/dash.uni30)*100):0}%</b></span></div>)}</div>
              </>)}
            </div>
            <div style={{background:C.white,borderRadius:12,padding:"16px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
              <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.marrom,textTransform:"uppercase",letterSpacing:1}}>📍 Desempenho por local — 30 dias</p>
              {dash.rankL.length===0?<p style={{color:"#ccc",fontSize:12,textAlign:"center",margin:"8px 0"}}>Nenhuma venda com local informado ainda.</p>:(()=>{
                const mxF=dash.rankL[0].fat||1, totF=dash.rankL.reduce((a,l)=>a+l.fat,0);
                const cores=["#7A4A32","#5A6447","#8A9171","#5B2E1E","#4A6A8A","#aaa"];
                return (<>
                  {dash.rankL.map((l,i)=>(
                    <div key={l.local} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.caramelo}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"📍"} {l.local}</span>
                        <div style={{textAlign:"right"}}><span style={{fontSize:12,fontWeight:700,color:"#555"}}>{fBRL(l.fat)}</span><span style={{fontSize:10,color:"#aaa",marginLeft:6}}>{l.qtd} un. · {totF>0?Math.round((l.fat/totF)*100):0}%</span></div>
                      </div>
                      <div style={{background:"#F0E8DF",borderRadius:99,height:6,overflow:"hidden",marginBottom:4}}><div style={{width:`${(l.fat/mxF)*100}%`,background:C.caramelo,height:"100%",borderRadius:99,transition:"width .4s"}}/></div>
                      {l.top&&(()=>{ const p=PRODS.find(x=>x.id===l.top.id); return p?<span style={{fontSize:10,color:p.cor,fontWeight:600}}>{p.emoji} Mais vendido: {p.label} ({l.prods[p.id]} un.)</span>:null; })()}
                    </div>
                  ))}
                  <div style={{display:"flex",height:10,borderRadius:99,overflow:"hidden",margin:"14px 0 10px"}}>{dash.rankL.map((l,i)=><div key={l.local} style={{width:`${(l.fat/totF)*100}%`,background:cores[i%cores.length]}}/>)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5}}>{dash.rankL.map((l,i)=><div key={l.local} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:9,height:9,borderRadius:"50%",background:cores[i%cores.length],flexShrink:0}}/><span style={{fontSize:10,color:"#666"}}>{l.local}: <b>{totF>0?Math.round((l.fat/totF)*100):0}%</b></span></div>)}</div>
                </>);
              })()}
            </div>
          </div>
        )}

        </>)}
      </div>
    </div>
  );
}

const LS = { display:"block",fontSize:10,fontWeight:700,color:"#5B2E1E",textTransform:"uppercase",letterSpacing:1,marginBottom:3 };
const IS = { width:"100%",padding:"8px 11px",borderRadius:7,border:"1.5px solid #DDD0C4",fontFamily:"'Montserrat',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",color:"#333",background:"#FDFAF7" };
const DS = { ...IS,height:38,lineHeight:"20px",WebkitAppearance:"none",appearance:"none",colorScheme:"light",display:"block" };
const BQS = cor=>({ width:28,height:28,borderRadius:6,border:`1.5px solid ${cor}`,background:"transparent",color:cor,fontSize:17,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" });
const BAS = cor=>({ padding:"4px 10px",borderRadius:6,border:`1.5px solid ${cor}`,background:"transparent",color:cor,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',sans-serif" });
