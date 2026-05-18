import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1hdTse-0nbeV3s7MKoXXQHZMHhDENJ5E",
  authDomain: "negocio-calsado.firebaseapp.com",
  projectId: "negocio-calsado",
  storageBucket: "negocio-calsado.firebasestorage.app",
  messagingSenderId: "728080664469",
  appId: "1:728080664469:web:99a6963fa19f9dbd18189c",
  measurementId: "G-65N6ZJHXBR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DATA_DOC = doc(db, "negocio", "datos");

const DEFAULT_PINS = { vendedor: "1234", repartidor: "5678" };
const DEFAULT_RATE = 2.00;

function formatTime(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function fmt(n) { return Number(n).toFixed(2); }
function fDate(ts) { return new Date(ts).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"2-digit"}); }
function fHM(ts) { return new Date(ts).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}); }
function fFull(ts) { return new Date(ts).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}); }

const TABS = ["⏱ Horas","💵 Ingresos","📤 Gastos","🤝 Abonos","📦 Pedidos","📊 Balance","🗑 Historial","⚙️ Config"];
const MONTHS = ["Todos","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const C = {
  bg:"#090909",panel:"#0f0f0f",border:"#1e1e1e",
  gold:"#c8a96e",green:"#7ec8a9",red:"#c87e7e",
  blue:"#7ea8c8",muted:"#555",dim:"#333",text:"#e0d8cc"
};
const inp = {
  background:"#111",border:`1px solid ${C.border}`,borderRadius:6,
  color:C.text,fontSize:13,padding:"9px 12px",
  fontFamily:"monospace",outline:"none",width:"100%",boxSizing:"border-box"
};
const btn = (color,small) => ({
  background:"none",border:`1px solid ${color}`,color,
  borderRadius:6,padding:small?"6px 12px":"9px 16px",
  fontFamily:"monospace",fontSize:small?11:12,
  letterSpacing:2,cursor:"pointer",textTransform:"uppercase",whiteSpace:"nowrap"
});

function ConfirmDelete({ item, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:12,padding:24,width:"100%",maxWidth:340}}>
        <div style={{fontSize:10,color:C.red,letterSpacing:3,marginBottom:12}}>CONFIRMAR ELIMINACIÓN</div>
        <div style={{fontSize:13,color:C.text,marginBottom:16}}>¿Eliminar <span style={{color:C.gold}}>{item.name||item.desc||item.note||"este registro"}</span>?</div>
        <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:8}}>MOTIVO (obligatorio)</div>
        <input style={{...inp,marginBottom:16}} placeholder="¿Por qué se elimina?" value={reason} onChange={e=>setReason(e.target.value)} autoFocus/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{...btn(C.muted),flex:1}}>Cancelar</button>
          <button onClick={()=>reason.trim()&&onConfirm(reason)} style={{...btn(reason.trim()?C.red:C.dim),flex:1,opacity:reason.trim()?1:0.5}}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmFinalize({ onConfirm, onCancel, elapsed }) {
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:12,padding:24,width:"100%",maxWidth:320}}>
        <div style={{fontSize:10,color:C.muted,letterSpacing:3,marginBottom:12}}>FINALIZAR SESIÓN</div>
        <div style={{fontSize:13,color:C.text,marginBottom:6}}>¿Cerrar la sesión actual?</div>
        <div style={{fontSize:22,color:C.gold,fontWeight:700,marginBottom:20}}>{formatTime(elapsed)}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{...btn(C.muted),flex:1}}>Cancelar</button>
          <button onClick={onConfirm} style={{...btn(C.red),flex:1}}>Finalizar</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:C.panel,border:`1px solid ${C.gold}`,borderRadius:8,padding:"10px 18px",fontSize:12,color:C.gold,zIndex:999,whiteSpace:"nowrap"}}>{msg}</div>
  );
}

function LoginScreen({ onLogin, pins }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  function tryLogin() {
    if (pin === pins[selected]) { onLogin(selected); }
    else { setError("PIN incorrecto"); setPin(""); }
  }
  return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{marginBottom:8,fontSize:10,letterSpacing:4,color:C.muted}}>CALZADO</div>
      <div style={{fontSize:28,color:C.gold,fontWeight:700,marginBottom:4,letterSpacing:-1}}>NEGOCIO</div>
      <div style={{fontSize:10,color:C.dim,marginBottom:40,letterSpacing:2}}>SISTEMA DE GESTIÓN</div>
      {!selected ? (
        <div style={{width:"100%",maxWidth:320}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:3,marginBottom:16,textAlign:"center"}}>¿QUIÉN ERES?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[{id:"vendedor",label:"Vendedor",icon:"🛍",color:C.blue},{id:"repartidor",label:"Repartidor",icon:"📦",color:C.green}].map(r=>(
              <button key={r.id} onClick={()=>setSelected(r.id)} style={{background:C.panel,border:`1px solid ${r.color}`,borderRadius:12,color:r.color,padding:"24px 10px",fontSize:13,cursor:"pointer",fontFamily:"monospace"}}>
                <div style={{fontSize:28,marginBottom:8}}>{r.icon}</div>{r.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:300}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:16,textAlign:"center"}}>PIN para <span style={{color:selected==="vendedor"?C.blue:C.green,fontWeight:700}}>{selected}</span></div>
          <input style={{...inp,marginBottom:8,textAlign:"center",fontSize:22,letterSpacing:8}} type="password" placeholder="••••" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryLogin()} autoFocus/>
          {error&&<div style={{color:C.red,fontSize:11,textAlign:"center",marginBottom:8}}>{error}</div>}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>{setSelected(null);setPin("");setError("");}} style={btn(C.muted)}>← Volver</button>
            <button onClick={tryLogin} style={{...btn(selected==="vendedor"?C.blue:C.green),flex:1}}>Entrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthFilter({ selected, onChange }) {
  return (
    <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4}}>
      {MONTHS.map((m,i)=>(
        <button key={i} onClick={()=>onChange(i)} style={{flex:"0 0 auto",background:selected===i?C.gold:"none",border:`1px solid ${selected===i?C.gold:C.border}`,color:selected===i?C.bg:C.muted,borderRadius:20,padding:"4px 12px",fontSize:10,cursor:"pointer",fontFamily:"monospace"}}>{m}</button>
      ))}
    </div>
  );
}

function filterByMonth(items, monthIdx) {
  if (monthIdx===0) return items;
  return items.filter(i=>new Date(i.ts).getMonth()+1===monthIdx);
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmFinal, setConfirmFinal] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [abonosPedidos, setAbonosPedidos] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [pins, setPins] = useState(DEFAULT_PINS);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [timerState, setTimerState] = useState("idle");
  const [timerStart, setTimerStart] = useState(null);
  const [pausedSecs, setPausedSecs] = useState(0);
  const [timerStartedBy, setTimerStartedBy] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  const [elapsed, setElapsed] = useState(0);
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef(null);
  const prevLastAction = useRef(null);

  const [filterInc, setFilterInc] = useState(0);
  const [filterExp, setFilterExp] = useState(0);
  const [filterAbo, setFilterAbo] = useState(0);

  const [incName, setIncName] = useState(""); const [incAmt, setIncAmt] = useState("");
  const [expDesc, setExpDesc] = useState(""); const [expAmt, setExpAmt] = useState("");
  const [aboAmt, setAboAmt] = useState(""); const [aboNote, setAboNote] = useState("");
  const [pedName, setPedName] = useState(""); const [pedCost, setPedCost] = useState("");
  const [aboPedAmt, setAboPedAmt] = useState(""); const [aboPedNote, setAboPedNote] = useState("");
  const [expandedPed, setExpandedPed] = useState(null);
  const [newRate, setNewRate] = useState(""); const [rateMsg, setRateMsg] = useState("");
  const [oldPin, setOldPin] = useState(""); const [newPin, setNewPin] = useState(""); const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState(""); const [pinOk, setPinOk] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(DATA_DOC, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setSessions(d.sessions||[]);
        setIncomes(d.incomes||[]);
        setExpenses(d.expenses||[]);
        setAbonos(d.abonos||[]);
        setPedidos(d.pedidos||[]);
        setAbonosPedidos(d.abonosPedidos||[]);
        setDeleted(d.deleted||[]);
        setPins(d.pins||DEFAULT_PINS);
        setRate(d.rate||DEFAULT_RATE);
        setTimerState(d.timerState||"idle");
        setTimerStart(d.timerStart||null);
        setPausedSecs(d.pausedSecs||0);
        setTimerStartedBy(d.timerStartedBy||null);
        if (d.lastAction && d.lastAction.ts !== prevLastAction.current?.ts) {
          prevLastAction.current = d.lastAction;
          setToast(`${d.lastAction.by==="vendedor"?"🛍":"📦"} ${d.lastAction.msg}`);
        }
      }
      setLoaded(true);
    });
    return ()=>unsub();
  }, []);

  useEffect(() => {
    if (timerState==="running"&&timerStart) {
      intervalRef.current = setInterval(()=>{ setElapsed(pausedSecs+Math.floor((Date.now()-timerStart)/1000)); setPulse(p=>!p); },1000);
    } else { clearInterval(intervalRef.current); if(timerState==="idle")setElapsed(0); if(timerState==="paused")setElapsed(pausedSecs); }
    return ()=>clearInterval(intervalRef.current);
  },[timerState,timerStart,pausedSecs]);

  async function save(data, actionMsg) {
    const payload = {...data};
    if (actionMsg) payload.lastAction = {by:currentUser, msg:actionMsg, ts:Date.now()};
    try { await setDoc(DATA_DOC,payload,{merge:true}); } catch(e){console.error(e);}
  }

  function handleStart() { save({timerState:"running",timerStart:Date.now(),pausedSecs:0,timerStartedBy:currentUser},"inició el cronómetro"); }
  function handlePause() { save({timerState:"paused",pausedSecs:elapsed,timerStart:null},"pausó el cronómetro"); }
  function handleContinue() { save({timerState:"running",timerStart:Date.now()},"continuó el cronómetro"); }
  function handleFinalize() {
    setConfirmFinal(false);
    const session={id:Date.now(),start:timerStart||Date.now()-elapsed*1000,end:Date.now(),seconds:elapsed,startedBy:timerStartedBy,finalizedBy:currentUser};
    save({timerState:"idle",timerStart:null,pausedSecs:0,timerStartedBy:null,sessions:[session,...sessions]},`finalizó sesión de ${formatTime(elapsed)}`);
  }

  function addIncome() {
    if (!incName.trim()||!incAmt||isNaN(incAmt)) return;
    save({incomes:[{id:Date.now(),name:incName.trim(),amount:parseFloat(incAmt),ts:Date.now(),by:currentUser},...incomes]},`registró ingreso: ${incName} $${incAmt}`);
    setIncName(""); setIncAmt("");
  }
  function addExpense() {
    if (!expDesc.trim()||!expAmt||isNaN(expAmt)) return;
    save({expenses:[{id:Date.now(),desc:expDesc.trim(),amount:parseFloat(expAmt),ts:Date.now(),by:currentUser},...expenses]},`registró gasto: ${expDesc} $${expAmt}`);
    setExpDesc(""); setExpAmt("");
  }
  function addAbono() {
    if (!aboAmt||isNaN(aboAmt)) return;
    save({abonos:[{id:Date.now(),amount:parseFloat(aboAmt),note:aboNote.trim(),ts:Date.now(),by:currentUser},...abonos]},`registró abono sueldo $${aboAmt}`);
    setAboAmt(""); setAboNote("");
  }

  function addAbonoPedido() {
    if (!aboPedAmt||isNaN(aboPedAmt)) return;
    const totalPed = pedidos.reduce((a,p)=>a+p.costo,0);
    const totalAbPed = abonosPedidos.reduce((a,b)=>a+b.amount,0);
    const saldoDisp = totalPed - totalAbPed;
    const monto = parseFloat(aboPedAmt);
    if (monto > saldoDisp) { setToast(`⚠️ El monto supera el saldo pendiente $${fmt(saldoDisp)}`); return; }
    save({abonosPedidos:[{id:Date.now(),amount:monto,note:aboPedNote.trim(),ts:Date.now(),by:currentUser},...abonosPedidos]},`abonó $${aboPedAmt} a pedidos`);
    setAboPedAmt(""); setAboPedNote("");
  }

  function requestDelete(item, list, key) { setConfirmDel({item,list,key}); }

  function confirmDelete(reason) {
    const {item,list,key} = confirmDel;
    const record = {id:Date.now(),original:item,key,reason,deletedBy:currentUser,deletedAt:Date.now()};
    save({[key]:list.filter(i=>i.id!==item.id),deleted:[record,...deleted]},`eliminó un registro (${reason})`);
    setConfirmDel(null);
  }

  function addPedido() {
    if (!pedName.trim()||!pedCost||isNaN(pedCost)) return;
    save({pedidos:[{id:Date.now(),name:pedName.trim(),costo:parseFloat(pedCost),ts:Date.now(),by:currentUser},...pedidos]},`agregó pedido: ${pedName} $${pedCost}`);
    setPedName(""); setPedCost("");
  }

  function saveRate() {
    const r=parseFloat(newRate);
    if(!newRate||isNaN(r)||r<=0){setRateMsg("Ingresá un valor válido");return;}
    save({rate:r},`cambió tarifa a $${fmt(r)}/hr`);
    setRateMsg(`✅ Tarifa actualizada a $${fmt(r)}/hr`); setNewRate("");
  }
  function savePin() {
    if(oldPin!==pins[currentUser]){setPinMsg("PIN actual incorrecto");return;}
    if(newPin.length<4){setPinMsg("Mínimo 4 caracteres");return;}
    if(newPin!==confirmPin){setPinMsg("Los PINs no coinciden");return;}
    save({pins:{...pins,[currentUser]:newPin}},"cambió su PIN");
    setPinOk(true); setPinMsg("✅ PIN actualizado");
    setOldPin(""); setNewPin(""); setConfirmPin("");
  }

  function exportSummary() {
    const totalSecs2=sessions.reduce((a,s)=>a+s.seconds,0);
    const totalPed=pedidos.reduce((a,p)=>a+p.costo,0);
    const totalAbPed=abonosPedidos.reduce((a,b)=>a+b.amount,0);
    const lines=[
      `📋 RESUMEN NEGOCIO CALZADO — ${new Date().toLocaleDateString("es-AR")}`,``,
      `⏱ HORAS: ${formatTime(totalSecs2)} → $${fmt(totalSecs2/3600*rate)}`,
      `💵 INGRESOS EFECTIVO: $${fmt(incomes.reduce((a,i)=>a+i.amount,0))}`,
      `📤 GASTOS: $${fmt(expenses.reduce((a,e)=>a+e.amount,0))}`,
      `🤝 ABONOS SUELDO: $${fmt(abonos.reduce((a,b)=>a+b.amount,0))}`,
      `📦 PEDIDOS: Total $${fmt(totalPed)} · Abonado $${fmt(totalAbPed)} · Pendiente $${fmt(totalPed-totalAbPed)}`,``,
      `💰 SALDO NETO: $${fmt(incomes.reduce((a,i)=>a+i.amount,0)+totalSecs2/3600*rate-expenses.reduce((a,e)=>a+e.amount,0)-abonos.reduce((a,b)=>a+b.amount,0))}`,
      ``,`Generado desde app Negocio Calzado`
    ];
    navigator.clipboard?.writeText(lines.join("\n")).then(()=>setToast("✅ Resumen copiado")).catch(()=>setToast("No se pudo copiar"));
  }

  const totalSecs=sessions.reduce((a,s)=>a+s.seconds,0)+(timerState!=="idle"?elapsed:0);
  const totalEarned=totalSecs/3600*rate;
  const totalIncome=incomes.reduce((a,i)=>a+i.amount,0);
  const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
  const totalAbo=abonos.reduce((a,b)=>a+b.amount,0);
  const pendiente=totalEarned-totalAbo;
  const totalPedCosto=pedidos.reduce((a,p)=>a+p.costo,0);
  const totalAbPed=abonosPedidos.reduce((a,b)=>a+b.amount,0);
  const saldoPed=totalPedCosto-totalAbPed;
  const balance=totalIncome+totalEarned-totalExp-totalAbo;

  const rolColor=currentUser==="vendedor"?C.blue:C.green;
  const ByTag=({by})=>by?(<span style={{fontSize:9,color:by==="vendedor"?C.blue:C.green,marginLeft:6}}>{by==="vendedor"?"🛍":"📦"}</span>):null;

  const Row=({item,value,color,onDel})=>(
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1}}>
        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>
          {fDate(item.ts)}{item.by&&<span style={{color:item.by==="vendedor"?C.blue:C.green}}> · {item.by}</span>}
        </div>
        <div style={{fontSize:13,color:C.text}}>{item.name||item.desc||item.note||"Abono"}</div>
      </div>
      <div style={{fontSize:15,color,fontWeight:700,marginRight:8}}>${fmt(value)}</div>
      <button onClick={onDel} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
    </div>
  );

  if (!loaded) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.gold,fontFamily:"monospace"}}>Cargando...</div></div>;
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} pins={pins}/>;

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"monospace",color:C.text,paddingBottom:40}}>
      {confirmDel && <ConfirmDelete item={confirmDel.item} onConfirm={confirmDelete} onCancel={()=>setConfirmDel(null)}/>}
      {confirmFinal && <ConfirmFinalize elapsed={elapsed} onConfirm={handleFinalize} onCancel={()=>setConfirmFinal(false)}/>}
      {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}

      <div style={{borderBottom:`1px solid ${C.border}`,padding:"14px 20px 12px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,letterSpacing:4,color:C.muted,textTransform:"uppercase"}}>CALZADO</span>
        <span style={{color:C.gold,fontSize:10,letterSpacing:2}}>// NEGOCIO</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:rolColor}}>{currentUser==="vendedor"?"🛍":"📦"} {currentUser}</span>
          <button onClick={()=>setCurrentUser(null)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>salir</button>
        </div>
      </div>

      <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{label:"INGRESOS",value:`$${fmt(totalIncome+totalEarned)}`,color:C.green},{label:"GASTOS",value:`$${fmt(totalExp)}`,color:C.red},{label:"SALDO",value:`$${fmt(balance)}`,color:balance>=0?C.gold:C.red}].map(item=>(
          <div key={item.label} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 10px 8px"}}>
            <div style={{fontSize:8,color:C.muted,letterSpacing:2,marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:15,color:item.color,fontWeight:700}}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{flex:"0 0 auto",background:"none",border:"none",borderBottom:tab===i?`2px solid ${C.gold}`:"2px solid transparent",color:tab===i?C.gold:C.muted,padding:"10px 10px",fontSize:10,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap"}}>{t}</button>
        ))}
      </div>

      <div style={{padding:"20px 20px 0"}}>

        {/* HORAS */}
        {tab===0&&(
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:"clamp(48px,18vw,72px)",fontWeight:700,letterSpacing:-2,color:timerState==="running"?C.gold:timerState==="paused"?C.blue:C.dim,transition:"color 0.3s",lineHeight:1}}>{formatTime(elapsed)}</div>
              <div style={{marginTop:6,fontSize:12,color:C.muted}}>
                {timerState==="running"&&`$${fmt(elapsed/3600*rate)} · iniciado por ${timerStartedBy||"?"}`}
                {timerState==="paused"&&`⏸ En pausa · iniciado por ${timerStartedBy||"?"}`}
                {timerState==="idle"&&"Presioná para comenzar"}
              </div>

              {/* Botones principales */}
              <div style={{marginTop:24,display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
                {timerState==="idle"&&(
                  <button onClick={handleStart} style={{width:110,height:110,borderRadius:"50%",border:`2px solid ${C.gold}`,background:"rgba(200,169,110,0.07)",color:C.gold,fontSize:12,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>START</button>
                )}
                {timerState==="running"&&(
                  <button onClick={handlePause} style={{padding:"16px 40px",borderRadius:8,border:`2px solid ${C.blue}`,background:"rgba(126,168,200,0.07)",color:C.blue,fontSize:14,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>⏸ PAUSA</button>
                )}
                {timerState==="paused"&&(
                  <button onClick={handleContinue} style={{padding:"16px 40px",borderRadius:8,border:`2px solid ${C.green}`,background:"rgba(126,200,169,0.07)",color:C.green,fontSize:14,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>▶ CONTINUAR</button>
                )}
              </div>

              {/* Botón FINALIZAR pequeño y discreto */}
              {(timerState==="running"||timerState==="paused")&&(
                <div style={{marginTop:16,textAlign:"center"}}>
                  <button onClick={()=>setConfirmFinal(true)} style={{background:"none",border:"none",color:C.dim,fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,textDecoration:"underline"}}>
                    finalizar sesión
                  </button>
                </div>
              )}

              {timerState==="running"&&(
                <div style={{marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:pulse?C.gold:"transparent",border:`1px solid ${C.gold}`,transition:"background 0.5s"}}/>
                  <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>EN CURSO</span>
                </div>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px"}}><div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>TOTAL HORAS</div><div style={{fontSize:18,color:C.gold,fontWeight:700}}>{formatTime(totalSecs)}</div></div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px"}}><div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>GANADO · ${fmt(rate)}/hr</div><div style={{fontSize:18,color:C.green,fontWeight:700}}>${fmt(totalEarned)}</div></div>
            </div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>SESIONES — {sessions.length}</div>
            {sessions.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin sesiones</div>}
            {sessions.map(s=>(
              <div key={s.id} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{fDate(s.start)} · {fHM(s.start)} → {fHM(s.end)}</div>
                  <div style={{display:"flex",gap:12,marginBottom:3}}><span style={{fontSize:13,color:C.gold}}>{formatTime(s.seconds)}</span><span style={{fontSize:13,color:C.green}}>${fmt(s.seconds/3600*rate)}</span></div>
                  <div style={{fontSize:10,color:C.dim}}>Inicio: <span style={{color:s.startedBy==="vendedor"?C.blue:C.green}}>{s.startedBy||"?"}</span> · Final: <span style={{color:s.finalizedBy==="vendedor"?C.blue:C.green}}>{s.finalizedBy||"?"}</span></div>
                </div>
                <button onClick={()=>requestDelete(s,sessions,"sessions")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* INGRESOS */}
        {tab===1&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>NUEVO INGRESO</div>
              <input style={{...inp,marginBottom:8}} placeholder="Nombre del cliente" value={incName} onChange={e=>setIncName(e.target.value)}/>
              <div style={{display:"flex",gap:8}}><input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={incAmt} onChange={e=>setIncAmt(e.target.value)}/><button onClick={addIncome} style={btn(C.green)}>+ ADD</button></div>
            </div>
            <MonthFilter selected={filterInc} onChange={setFilterInc}/>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>TOTAL ${fmt(filterByMonth(incomes,filterInc).reduce((a,i)=>a+i.amount,0))}</div>
            {filterByMonth(incomes,filterInc).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin ingresos</div>}
            {filterByMonth(incomes,filterInc).map(i=><Row key={i.id} item={i} value={i.amount} color={C.green} onDel={()=>requestDelete(i,incomes,"incomes")}/>)}
          </div>
        )}

        {/* GASTOS */}
        {tab===2&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>NUEVO GASTO</div>
              <input style={{...inp,marginBottom:8}} placeholder="Descripción" value={expDesc} onChange={e=>setExpDesc(e.target.value)}/>
              <div style={{display:"flex",gap:8}}><input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={expAmt} onChange={e=>setExpAmt(e.target.value)}/><button onClick={addExpense} style={btn(C.red)}>+ ADD</button></div>
            </div>
            <MonthFilter selected={filterExp} onChange={setFilterExp}/>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>TOTAL ${fmt(filterByMonth(expenses,filterExp).reduce((a,e)=>a+e.amount,0))}</div>
            {filterByMonth(expenses,filterExp).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin gastos</div>}
            {filterByMonth(expenses,filterExp).map(e=><Row key={e.id} item={e} value={e.amount} color={C.red} onDel={()=>requestDelete(e,expenses,"expenses")}/>)}
          </div>
        )}

        {/* ABONOS SUELDO */}
        {tab===3&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>REGISTRAR ABONO DE SUELDO</div>
              <input style={{...inp,marginBottom:8}} placeholder="Nota (ej: abono semana 1)" value={aboNote} onChange={e=>setAboNote(e.target.value)}/>
              <div style={{display:"flex",gap:8}}><input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={aboAmt} onChange={e=>setAboAmt(e.target.value)}/><button onClick={addAbono} style={btn(C.gold)}>+ ADD</button></div>
            </div>
            <div style={{background:C.panel,border:`1px solid ${pendiente>0?C.gold:C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>PENDIENTE DE COBRO</div>
              <div style={{fontSize:22,color:pendiente>0?C.gold:C.green,fontWeight:700}}>${fmt(pendiente)}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Ganado ${fmt(totalEarned)} − Abonado ${fmt(totalAbo)}</div>
            </div>
            <MonthFilter selected={filterAbo} onChange={setFilterAbo}/>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>TOTAL ${fmt(filterByMonth(abonos,filterAbo).reduce((a,b)=>a+b.amount,0))}</div>
            {filterByMonth(abonos,filterAbo).length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin abonos</div>}
            {filterByMonth(abonos,filterAbo).map(a=><Row key={a.id} item={a} value={a.amount} color={C.gold} onDel={()=>requestDelete(a,abonos,"abonos")}/>)}
          </div>
        )}

        {/* PEDIDOS */}
        {tab===4&&(
          <div>
            {/* Resumen global */}
            <div style={{background:C.panel,border:`1px solid ${saldoPed>0?C.blue:C.border}`,borderRadius:8,padding:"14px 16px",marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:10}}>RESUMEN PEDIDOS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div><div style={{fontSize:8,color:C.muted,marginBottom:3}}>TOTAL</div><div style={{fontSize:16,color:C.text,fontWeight:700}}>${fmt(totalPedCosto)}</div></div>
                <div><div style={{fontSize:8,color:C.muted,marginBottom:3}}>PAGADO</div><div style={{fontSize:16,color:C.green,fontWeight:700}}>${fmt(totalAbPed)}</div></div>
                <div><div style={{fontSize:8,color:C.muted,marginBottom:3}}>PENDIENTE</div><div style={{fontSize:16,color:saldoPed>0?C.blue:C.green,fontWeight:700}}>${fmt(saldoPed)}</div></div>
              </div>
            </div>

            {/* Abonar al total */}
            {currentUser==="repartidor"&&saldoPed>0&&(
              <div style={{background:C.panel,border:`1px solid ${C.gold}`,borderRadius:8,padding:16,marginBottom:16}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>ABONAR A PEDIDOS</div>
                <input style={{...inp,marginBottom:8}} placeholder="Nota (opcional)" value={aboPedNote} onChange={e=>setAboPedNote(e.target.value)}/>
                <div style={{display:"flex",gap:8}}>
                  <input style={inp} placeholder={`Monto USD (máx $${fmt(saldoPed)})`} type="number" min="0" step="0.01" value={aboPedAmt} onChange={e=>setAboPedAmt(e.target.value)}/>
                  <button onClick={addAbonoPedido} style={btn(C.gold)}>+ ADD</button>
                </div>
              </div>
            )}

            {/* Agregar pedido - solo vendedor */}
            {currentUser==="vendedor"&&(
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>AGREGAR PEDIDO</div>
                <input style={{...inp,marginBottom:8}} placeholder="Nombre / descripción del zapato" value={pedName} onChange={e=>setPedName(e.target.value)}/>
                <div style={{display:"flex",gap:8}}><input style={inp} placeholder="Costo USD" type="number" min="0" step="0.01" value={pedCost} onChange={e=>setPedCost(e.target.value)}/><button onClick={addPedido} style={btn(C.blue)}>+ ADD</button></div>
              </div>
            )}

            {/* Historial abonos pedidos */}
            {abonosPedidos.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:10}}>ABONOS REALIZADOS — {abonosPedidos.length}</div>
                {abonosPedidos.map(a=>(
                  <div key={a.id} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:10,color:C.muted}}>
                        {fDate(a.ts)}{a.by&&<span style={{color:a.by==="vendedor"?C.blue:C.green}}> · {a.by}</span>}
                      </div>
                      {a.note&&<div style={{fontSize:12,color:C.text}}>{a.note}</div>}
                    </div>
                    <div style={{fontSize:15,color:C.gold,fontWeight:700}}>${fmt(a.amount)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista pedidos */}
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>PEDIDOS — {pedidos.length}</div>
            {pedidos.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin pedidos</div>}
            {pedidos.map(p=>(
              <div key={p.id} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:C.muted}}>
                    {fDate(p.ts)}{p.by&&<span style={{color:p.by==="vendedor"?C.blue:C.green}}> · {p.by}</span>}
                  </div>
                  <div style={{fontSize:14,color:C.text,fontWeight:600,marginTop:2}}>{p.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>Costo: <span style={{color:C.text}}>${fmt(p.costo)}</span></div>
                </div>
                {currentUser==="vendedor"&&(
                  <button onClick={()=>requestDelete(p,pedidos,"pedidos")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* BALANCE */}
        {tab===5&&(
          <div>
            {[
              {label:"Ingresos en efectivo",value:totalIncome,color:C.green,sign:"+"},
              {label:`Horas trabajadas (${formatTime(totalSecs)})`,value:totalEarned,color:C.green,sign:"+"},
              {label:"Gastos",value:totalExp,color:C.red,sign:"−"},
              {label:"Abonos de sueldo",value:totalAbo,color:C.gold,sign:"−"},
            ].map(item=>(
              <div key={item.label} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:C.muted}}>{item.label}</div>
                <div style={{fontSize:15,color:item.color,fontWeight:700}}>{item.sign} ${fmt(item.value)}</div>
              </div>
            ))}

            <div style={{borderTop:`1px solid ${C.border}`,marginTop:16,paddingTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:12,color:C.muted,letterSpacing:2}}>SALDO NETO</div>
              <div style={{fontSize:24,color:balance>=0?C.gold:C.red,fontWeight:700}}>{balance>=0?"+":""} ${fmt(balance)}</div>
            </div>

            {/* Sección pedidos en balance */}
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginBottom:12}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>📦 PEDIDOS</div>
              {[
                {label:"Total pedidos",value:totalPedCosto,color:C.text},
                {label:"Total abonado",value:totalAbPed,color:C.green},
                {label:"Pendiente por pagar",value:saldoPed,color:saldoPed>0?C.blue:C.green},
              ].map(item=>(
                <div key={item.label} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,color:C.muted}}>{item.label}</div>
                  <div style={{fontSize:14,color:item.color,fontWeight:700}}>${fmt(item.value)}</div>
                </div>
              ))}
            </div>

            <button onClick={exportSummary} style={{...btn(C.blue),width:"100%",textAlign:"center",marginBottom:12}}>📋 COPIAR RESUMEN</button>

            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:10}}>RESUMEN</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.9}}>
                <div>· {sessions.length} sesión(es) · Tarifa ${fmt(rate)}/hr</div>
                <div>· {incomes.length} ingreso(s) · {expenses.length} gasto(s)</div>
                <div>· Sueldo pendiente: ${fmt(pendiente)}</div>
                <div>· {pedidos.length} pedido(s) · Saldo ${fmt(saldoPed)}</div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab===6&&(
          <div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:16}}>REGISTROS ELIMINADOS — {deleted.length}</div>
            {deleted.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin eliminaciones</div>}
            {deleted.map(d=>(
              <div key={d.id} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",marginBottom:8}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                  <span>{fFull(d.deletedAt)}{d.deletedBy&&<span style={{color:d.deletedBy==="vendedor"?C.blue:C.green}}> · {d.deletedBy}</span>}</span>
                  <span style={{color:C.red,fontSize:9}}>{d.key}</span>
                </div>
                <div style={{fontSize:13,color:C.text,marginBottom:4}}>{d.original?.name||d.original?.desc||d.original?.note||"Registro"} {d.original?.amount&&`· $${fmt(d.original.amount)}`}</div>
                <div style={{fontSize:11,color:C.muted}}>Motivo: <span style={{color:C.gold}}>{d.reason}</span></div>
              </div>
            ))}
          </div>
        )}

        {/* CONFIG */}
        {tab===7&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>TARIFA ACTUAL</div>
              <div style={{fontSize:22,color:C.gold,fontWeight:700,marginBottom:12}}>${fmt(rate)}/hr</div>
              <div style={{display:"flex",gap:8}}><input style={inp} placeholder="Nuevo valor USD" type="number" min="0" step="0.01" value={newRate} onChange={e=>setNewRate(e.target.value)}/><button onClick={saveRate} style={btn(C.gold)}>GUARDAR</button></div>
              {rateMsg&&<div style={{color:C.green,fontSize:11,marginTop:8}}>{rateMsg}</div>}
            </div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>CAMBIAR MI PIN · <span style={{color:rolColor}}>{currentUser?.toUpperCase()}</span></div>
              <input style={{...inp,marginBottom:8}} type="password" placeholder="PIN actual" value={oldPin} onChange={e=>setOldPin(e.target.value)}/>
              <input style={{...inp,marginBottom:8}} type="password" placeholder="PIN nuevo" value={newPin} onChange={e=>setNewPin(e.target.value)}/>
              <input style={{...inp,marginBottom:12}} type="password" placeholder="Confirmar PIN nuevo" value={confirmPin} onChange={e=>setConfirmPin(e.target.value)}/>
              {pinMsg&&<div style={{color:pinOk?C.green:C.red,fontSize:11,marginBottom:10}}>{pinMsg}</div>}
              {!pinOk&&<button onClick={savePin} style={{...btn(rolColor),width:"100%"}}>GUARDAR PIN</button>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
