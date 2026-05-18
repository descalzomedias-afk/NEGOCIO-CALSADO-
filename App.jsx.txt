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

const TABS = ["⏱ Horas","💵 Ingresos","📤 Gastos","🤝 Abonos","📦 Pedidos","📊 Balance","⚙️ Config"];

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

// ── LOGIN SCREEN ──
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
              <button key={r.id} onClick={()=>setSelected(r.id)} style={{
                background:C.panel,border:`1px solid ${r.color}`,borderRadius:12,
                color:r.color,padding:"24px 10px",fontSize:13,cursor:"pointer",fontFamily:"monospace"
              }}>
                <div style={{fontSize:28,marginBottom:8}}>{r.icon}</div>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:300}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:16,textAlign:"center"}}>
            PIN para <span style={{color:selected==="vendedor"?C.blue:C.green,fontWeight:700}}>{selected}</span>
          </div>
          <input style={{...inp,marginBottom:8,textAlign:"center",fontSize:22,letterSpacing:8}}
            type="password" placeholder="••••" value={pin}
            onChange={e=>setPin(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&tryLogin()} autoFocus/>
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

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // null | "vendedor" | "repartidor"
  const [tab, setTab] = useState(0);

  // Data from Firebase
  const [sessions, setSessions] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pins, setPins] = useState(DEFAULT_PINS);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [timerState, setTimerState] = useState("idle");
  const [timerStart, setTimerStart] = useState(null);
  const [pausedSecs, setPausedSecs] = useState(0);
  const [timerStartedBy, setTimerStartedBy] = useState(null);

  // Local UI
  const [elapsed, setElapsed] = useState(0);
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef(null);

  // Forms
  const [incName, setIncName] = useState(""); const [incAmt, setIncAmt] = useState("");
  const [expDesc, setExpDesc] = useState(""); const [expAmt, setExpAmt] = useState("");
  const [aboAmt, setAboAmt] = useState(""); const [aboNote, setAboNote] = useState("");
  const [pedName, setPedName] = useState(""); const [pedCost, setPedCost] = useState("");
  const [abonadoAmt, setAbonadoAmt] = useState({}); const [abonadoNote, setAbonadoNote] = useState({});
  const [expandedPed, setExpandedPed] = useState(null);
  const [newRate, setNewRate] = useState("");
  const [oldPin, setOldPin] = useState(""); const [newPin, setNewPin] = useState(""); const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState(""); const [pinOk, setPinOk] = useState(false);
  const [rateMsg, setRateMsg] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(DATA_DOC, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setSessions(d.sessions||[]);
        setIncomes(d.incomes||[]);
        setExpenses(d.expenses||[]);
        setAbonos(d.abonos||[]);
        setPedidos(d.pedidos||[]);
        setPins(d.pins||DEFAULT_PINS);
        setRate(d.rate||DEFAULT_RATE);
        setTimerState(d.timerState||"idle");
        setTimerStart(d.timerStart||null);
        setPausedSecs(d.pausedSecs||0);
        setTimerStartedBy(d.timerStartedBy||null);
      }
      setLoaded(true);
    });
    return ()=>unsub();
  }, []);

  useEffect(() => {
    if (timerState==="running"&&timerStart) {
      intervalRef.current = setInterval(()=>{
        setElapsed(pausedSecs+Math.floor((Date.now()-timerStart)/1000));
        setPulse(p=>!p);
      },1000);
    } else {
      clearInterval(intervalRef.current);
      if (timerState==="idle") setElapsed(0);
      if (timerState==="paused") setElapsed(pausedSecs);
    }
    return ()=>clearInterval(intervalRef.current);
  },[timerState,timerStart,pausedSecs]);

  async function save(data) {
    try { await setDoc(DATA_DOC,data,{merge:true}); } catch(e){console.error(e);}
  }

  function handleStart() {
    save({timerState:"running",timerStart:Date.now(),pausedSecs:0,timerStartedBy:currentUser});
  }
  function handlePause() {
    save({timerState:"paused",pausedSecs:elapsed,timerStart:null});
  }
  function handleContinue() {
    save({timerState:"running",timerStart:Date.now()});
  }
  function handleFinalize() {
    const session={
      id:Date.now(),start:timerStart||Date.now()-elapsed*1000,end:Date.now(),
      seconds:elapsed,startedBy:timerStartedBy,finalizedBy:currentUser
    };
    save({timerState:"idle",timerStart:null,pausedSecs:0,timerStartedBy:null,sessions:[session,...sessions]});
  }

  function addIncome() {
    if (!incName.trim()||!incAmt||isNaN(incAmt)) return;
    save({incomes:[{id:Date.now(),name:incName.trim(),amount:parseFloat(incAmt),ts:Date.now(),by:currentUser},...incomes]});
    setIncName(""); setIncAmt("");
  }
  function addExpense() {
    if (!expDesc.trim()||!expAmt||isNaN(expAmt)) return;
    save({expenses:[{id:Date.now(),desc:expDesc.trim(),amount:parseFloat(expAmt),ts:Date.now(),by:currentUser},...expenses]});
    setExpDesc(""); setExpAmt("");
  }
  function addAbono() {
    if (!aboAmt||isNaN(aboAmt)) return;
    save({abonos:[{id:Date.now(),amount:parseFloat(aboAmt),note:aboNote.trim(),ts:Date.now(),by:currentUser},...abonos]});
    setAboAmt(""); setAboNote("");
  }
  function delItem(list,id,key) { save({[key]:list.filter(i=>i.id!==id)}); }

  function addPedido() {
    if (!pedName.trim()||!pedCost||isNaN(pedCost)) return;
    save({pedidos:[{id:Date.now(),name:pedName.trim(),costo:parseFloat(pedCost),abonos:[],ts:Date.now(),by:currentUser},...pedidos]});
    setPedName(""); setPedCost("");
  }
  function addAbonoPedido(pedId) {
    const amt=abonadoAmt[pedId];
    if (!amt||isNaN(amt)) return;
    const updated=pedidos.map(p=>p.id===pedId
      ?{...p,abonos:[...(p.abonos||[]),{id:Date.now(),amount:parseFloat(amt),note:abonadoNote[pedId]||"",ts:Date.now(),by:currentUser}]}
      :p);
    save({pedidos:updated});
    setAbonadoAmt({...abonadoAmt,[pedId]:""});
    setAbonadoNote({...abonadoNote,[pedId]:""});
  }
  function delPedido(id) { save({pedidos:pedidos.filter(p=>p.id!==id)}); }

  function saveRate() {
    const r=parseFloat(newRate);
    if (!newRate||isNaN(r)||r<=0) { setRateMsg("Ingresá un valor válido"); return; }
    save({rate:r}); setRateMsg(`✅ Tarifa actualizada a $${fmt(r)}/hr`); setNewRate("");
  }
  function savePin() {
    if (oldPin!==pins[currentUser]) { setPinMsg("PIN actual incorrecto"); return; }
    if (newPin.length<4) { setPinMsg("El nuevo PIN debe tener al menos 4 caracteres"); return; }
    if (newPin!==confirmPin) { setPinMsg("Los PINs nuevos no coinciden"); return; }
    save({pins:{...pins,[currentUser]:newPin}});
    setPinOk(true); setPinMsg("✅ PIN actualizado");
    setOldPin(""); setNewPin(""); setConfirmPin("");
  }

  const totalSecs=sessions.reduce((a,s)=>a+s.seconds,0)+(timerState!=="idle"?elapsed:0);
  const totalEarned=totalSecs/3600*rate;
  const totalIncome=incomes.reduce((a,i)=>a+i.amount,0);
  const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
  const totalAbo=abonos.reduce((a,b)=>a+b.amount,0);
  const pendiente=totalEarned-totalAbo;
  const balance=totalIncome+totalEarned-totalExp-totalAbo;
  const totalPedCosto=pedidos.reduce((a,p)=>a+p.costo,0);
  const totalAbonadoPed=pedidos.reduce((a,p)=>a+(p.abonos||[]).reduce((x,b)=>x+b.amount,0),0);
  const saldoPed=totalPedCosto-totalAbonadoPed;

  const rolColor=currentUser==="vendedor"?C.blue:C.green;
  const rolIcon=currentUser==="vendedor"?"🛍":"📦";

  const ByTag=({by})=>by?(
    <span style={{fontSize:9,color:by==="vendedor"?C.blue:C.green,marginLeft:6,letterSpacing:1}}>
      {by==="vendedor"?"🛍":"📦"}
    </span>
  ):null;

  const Row=({item,value,color,onDel})=>(
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1}}>
        <div style={{fontSize:10,color:C.muted,marginBottom:2,display:"flex",alignItems:"center"}}>
          {fDate(item.ts)}<ByTag by={item.by}/>
        </div>
        <div style={{fontSize:13,color:C.text}}>{item.name||item.desc||item.note||"Abono"}</div>
      </div>
      <div style={{fontSize:15,color,fontWeight:700,marginRight:8}}>${fmt(value)}</div>
      <button onClick={onDel} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
    </div>
  );

  if (!loaded) return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.gold,fontFamily:"monospace",fontSize:16}}>Cargando...</div>
    </div>
  );

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} pins={pins}/>;

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"monospace",color:C.text,paddingBottom:40}}>

      {/* Header */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"14px 20px 12px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,letterSpacing:4,color:C.muted,textTransform:"uppercase"}}>CALZADO</span>
        <span style={{color:C.gold,fontSize:10,letterSpacing:2}}>// NEGOCIO</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:rolColor}}>{rolIcon} {currentUser}</span>
          <button onClick={()=>setCurrentUser(null)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>salir</button>
        </div>
      </div>

      {/* Quick summary */}
      <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {label:"INGRESOS",value:`$${fmt(totalIncome+totalEarned)}`,color:C.green},
          {label:"GASTOS",value:`$${fmt(totalExp)}`,color:C.red},
          {label:"SALDO",value:`$${fmt(balance)}`,color:balance>=0?C.gold:C.red},
        ].map(item=>(
          <div key={item.label} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 10px 8px"}}>
            <div style={{fontSize:8,color:C.muted,letterSpacing:2,marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:15,color:item.color,fontWeight:700}}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            flex:"0 0 auto",background:"none",border:"none",
            borderBottom:tab===i?`2px solid ${C.gold}`:"2px solid transparent",
            color:tab===i?C.gold:C.muted,
            padding:"10px 10px",fontSize:10,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap"
          }}>{t}</button>
        ))}
      </div>

      <div style={{padding:"20px 20px 0"}}>

        {/* ── HORAS ── */}
        {tab===0&&(
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:"clamp(48px,18vw,72px)",fontWeight:700,letterSpacing:-2,
                color:timerState==="running"?C.gold:timerState==="paused"?C.blue:C.dim,
                transition:"color 0.3s",lineHeight:1}}>
                {formatTime(elapsed)}
              </div>
              <div style={{marginTop:6,fontSize:12,color:C.muted}}>
                {timerState==="running"&&`$${fmt(elapsed/3600*rate)} · iniciado por ${timerStartedBy||"?"}`}
                {timerState==="paused"&&`⏸ En pausa · iniciado por ${timerStartedBy||"?"}`}
                {timerState==="idle"&&"Presioná para comenzar"}
              </div>
              <div style={{marginTop:24,display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
                {timerState==="idle"&&(
                  <button onClick={handleStart} style={{width:110,height:110,borderRadius:"50%",border:`2px solid ${C.gold}`,background:"rgba(200,169,110,0.07)",color:C.gold,fontSize:12,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>START</button>
                )}
                {timerState==="running"&&(<>
                  <button onClick={handlePause} style={{padding:"14px 24px",borderRadius:8,border:`2px solid ${C.blue}`,background:"rgba(126,168,200,0.07)",color:C.blue,fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>⏸ PAUSA</button>
                  <button onClick={handleFinalize} style={{padding:"14px 24px",borderRadius:8,border:`2px solid ${C.red}`,background:"rgba(200,126,126,0.07)",color:C.red,fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>■ FINALIZAR</button>
                </>)}
                {timerState==="paused"&&(<>
                  <button onClick={handleContinue} style={{padding:"14px 24px",borderRadius:8,border:`2px solid ${C.green}`,background:"rgba(126,200,169,0.07)",color:C.green,fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>▶ CONTINUAR</button>
                  <button onClick={handleFinalize} style={{padding:"14px 24px",borderRadius:8,border:`2px solid ${C.red}`,background:"rgba(200,126,126,0.07)",color:C.red,fontSize:13,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>■ FINALIZAR</button>
                </>)}
              </div>
              {timerState==="running"&&(
                <div style={{marginTop:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:pulse?C.gold:"transparent",border:`1px solid ${C.gold}`,transition:"background 0.5s"}}/>
                  <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>EN CURSO</span>
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px"}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>TOTAL HORAS</div>
                <div style={{fontSize:18,color:C.gold,fontWeight:700}}>{formatTime(totalSecs)}</div>
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px"}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>GANADO · ${fmt(rate)}/hr</div>
                <div style={{fontSize:18,color:C.green,fontWeight:700}}>${fmt(totalEarned)}</div>
              </div>
            </div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>SESIONES — {sessions.length}</div>
            {sessions.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin sesiones</div>}
            {sessions.map(s=>(
              <div key={s.id} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{fDate(s.start)} · {fHM(s.start)} → {fHM(s.end)}</div>
                  <div style={{display:"flex",gap:12,marginBottom:3}}>
                    <span style={{fontSize:13,color:C.gold}}>{formatTime(s.seconds)}</span>
                    <span style={{fontSize:13,color:C.green}}>${fmt(s.seconds/3600*rate)}</span>
                  </div>
                  <div style={{fontSize:10,color:C.dim}}>
                    Inicio: <span style={{color:s.startedBy==="vendedor"?C.blue:C.green}}>{s.startedBy||"?"}</span>
                    {" · "}Final: <span style={{color:s.finalizedBy==="vendedor"?C.blue:C.green}}>{s.finalizedBy||"?"}</span>
                  </div>
                </div>
                <button onClick={()=>delItem(sessions,s.id,"sessions")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── INGRESOS ── */}
        {tab===1&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:20}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>NUEVO INGRESO</div>
              <input style={{...inp,marginBottom:8}} placeholder="Nombre del cliente" value={incName} onChange={e=>setIncName(e.target.value)}/>
              <div style={{display:"flex",gap:8}}>
                <input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={incAmt} onChange={e=>setIncAmt(e.target.value)}/>
                <button onClick={addIncome} style={btn(C.green)}>+ ADD</button>
              </div>
            </div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>REGISTROS — {incomes.length} · TOTAL ${fmt(totalIncome)}</div>
            {incomes.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin ingresos</div>}
            {incomes.map(i=><Row key={i.id} item={i} value={i.amount} color={C.green} onDel={()=>delItem(incomes,i.id,"incomes")}/>)}
          </div>
        )}

        {/* ── GASTOS ── */}
        {tab===2&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:20}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>NUEVO GASTO</div>
              <input style={{...inp,marginBottom:8}} placeholder="Descripción" value={expDesc} onChange={e=>setExpDesc(e.target.value)}/>
              <div style={{display:"flex",gap:8}}>
                <input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={expAmt} onChange={e=>setExpAmt(e.target.value)}/>
                <button onClick={addExpense} style={btn(C.red)}>+ ADD</button>
              </div>
            </div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>REGISTROS — {expenses.length} · TOTAL ${fmt(totalExp)}</div>
            {expenses.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin gastos</div>}
            {expenses.map(e=><Row key={e.id} item={e} value={e.amount} color={C.red} onDel={()=>delItem(expenses,e.id,"expenses")}/>)}
          </div>
        )}

        {/* ── ABONOS ── */}
        {tab===3&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>REGISTRAR ABONO DE SUELDO</div>
              <input style={{...inp,marginBottom:8}} placeholder="Nota (ej: abono semana 1)" value={aboNote} onChange={e=>setAboNote(e.target.value)}/>
              <div style={{display:"flex",gap:8}}>
                <input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={aboAmt} onChange={e=>setAboAmt(e.target.value)}/>
                <button onClick={addAbono} style={btn(C.gold)}>+ ADD</button>
              </div>
            </div>
            <div style={{background:C.panel,border:`1px solid ${pendiente>0?C.gold:C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>PENDIENTE DE COBRO</div>
              <div style={{fontSize:22,color:pendiente>0?C.gold:C.green,fontWeight:700}}>${fmt(pendiente)}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Ganado ${fmt(totalEarned)} − Abonado ${fmt(totalAbo)}</div>
            </div>
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>ABONOS — {abonos.length} · TOTAL ${fmt(totalAbo)}</div>
            {abonos.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin abonos</div>}
            {abonos.map(a=><Row key={a.id} item={a} value={a.amount} color={C.gold} onDel={()=>delItem(abonos,a.id,"abonos")}/>)}
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab===4&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:10,color:rolColor,letterSpacing:2}}>{rolIcon} {currentUser.toUpperCase()}</div>
            </div>
            <div style={{background:C.panel,border:`1px solid ${saldoPed>0?C.blue:C.border}`,borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>SALDO PENDIENTE PEDIDOS</div>
              <div style={{fontSize:22,color:saldoPed>0?C.blue:C.green,fontWeight:700}}>${fmt(saldoPed)}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Total ${fmt(totalPedCosto)} − Abonado ${fmt(totalAbonadoPed)}</div>
            </div>
            {currentUser==="vendedor"&&(
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>AGREGAR PEDIDO</div>
                <input style={{...inp,marginBottom:8}} placeholder="Nombre / descripción del zapato" value={pedName} onChange={e=>setPedName(e.target.value)}/>
                <div style={{display:"flex",gap:8}}>
                  <input style={inp} placeholder="Costo USD" type="number" min="0" step="0.01" value={pedCost} onChange={e=>setPedCost(e.target.value)}/>
                  <button onClick={addPedido} style={btn(C.blue)}>+ ADD</button>
                </div>
              </div>
            )}
            <div style={{fontSize:9,color:C.dim,letterSpacing:3,marginBottom:12}}>PEDIDOS — {pedidos.length}</div>
            {pedidos.length===0&&<div style={{color:C.dim,fontSize:12,textAlign:"center",padding:"16px 0"}}>Sin pedidos</div>}
            {pedidos.map(p=>{
              const aboTotal=(p.abonos||[]).reduce((a,b)=>a+b.amount,0);
              const saldo=p.costo-aboTotal;
              const expanded=expandedPed===p.id;
              return (
                <div key={p.id} style={{background:C.panel,border:`1px solid ${saldo<=0?C.green:C.border}`,borderRadius:8,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setExpandedPed(expanded?null:p.id)}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:C.muted,marginBottom:2,display:"flex",alignItems:"center"}}>
                        {fDate(p.ts)}<ByTag by={p.by}/>
                      </div>
                      <div style={{fontSize:14,color:C.text,fontWeight:600}}>{p.name}</div>
                      <div style={{display:"flex",gap:12,marginTop:4}}>
                        <span style={{fontSize:11,color:C.muted}}>Costo: <span style={{color:C.text}}>${fmt(p.costo)}</span></span>
                        <span style={{fontSize:11,color:C.muted}}>Saldo: <span style={{color:saldo<=0?C.green:C.blue}}>${fmt(saldo)}</span></span>
                      </div>
                    </div>
                    {currentUser==="vendedor"&&(
                      <button onClick={e=>{e.stopPropagation();delPedido(p.id);}} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
                    )}
                    <span style={{color:C.muted,fontSize:12}}>{expanded?"▲":"▼"}</span>
                  </div>
                  {expanded&&(
                    <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px"}}>
                      {(p.abonos||[]).length>0&&(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:8}}>ABONOS</div>
                          {(p.abonos||[]).map(a=>(
                            <div key={a.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:4}}>
                              <span>{fDate(a.ts)}{a.note&&` · ${a.note}`}<ByTag by={a.by}/></span>
                              <span style={{color:C.gold}}>${fmt(a.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {currentUser==="repartidor"&&saldo>0&&(
                        <div>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:8}}>AGREGAR ABONO</div>
                          <input style={{...inp,marginBottom:8}} placeholder="Nota (opcional)" value={abonadoNote[p.id]||""} onChange={e=>setAbonadoNote({...abonadoNote,[p.id]:e.target.value})}/>
                          <div style={{display:"flex",gap:8}}>
                            <input style={inp} placeholder="Monto USD" type="number" min="0" step="0.01" value={abonadoAmt[p.id]||""} onChange={e=>setAbonadoAmt({...abonadoAmt,[p.id]:e.target.value})}/>
                            <button onClick={()=>addAbonoPedido(p.id)} style={btn(C.gold)}>+ ADD</button>
                          </div>
                        </div>
                      )}
                      {saldo<=0&&<div style={{color:C.green,fontSize:12,textAlign:"center"}}>✅ Pedido pagado</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── BALANCE ── */}
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
            <div style={{borderTop:`1px solid ${C.border}`,marginTop:16,paddingTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:C.muted,letterSpacing:2}}>SALDO NETO</div>
              <div style={{fontSize:24,color:balance>=0?C.gold:C.red,fontWeight:700}}>{balance>=0?"+":""} ${fmt(balance)}</div>
            </div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginTop:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:10}}>RESUMEN</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.9}}>
                <div>· {sessions.length} sesión(es) · Tarifa ${fmt(rate)}/hr</div>
                <div>· {incomes.length} ingreso(s) registrado(s)</div>
                <div>· {expenses.length} gasto(s) registrado(s)</div>
                <div>· Sueldo pendiente: ${fmt(pendiente)}</div>
                <div>· {pedidos.length} pedido(s) · Saldo ${fmt(saldoPed)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab===6&&(
          <div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>TARIFA ACTUAL</div>
              <div style={{fontSize:22,color:C.gold,fontWeight:700,marginBottom:12}}>${fmt(rate)}/hr</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>CAMBIAR TARIFA</div>
              <div style={{display:"flex",gap:8}}>
                <input style={inp} placeholder="Nuevo valor USD" type="number" min="0" step="0.01" value={newRate} onChange={e=>setNewRate(e.target.value)}/>
                <button onClick={saveRate} style={btn(C.gold)}>GUARDAR</button>
              </div>
              {rateMsg&&<div style={{color:C.green,fontSize:11,marginTop:8}}>{rateMsg}</div>}
            </div>

            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:12}}>CAMBIAR MI PIN · <span style={{color:rolColor}}>{currentUser.toUpperCase()}</span></div>
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
