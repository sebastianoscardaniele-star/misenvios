import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import Papa from 'papaparse';
import {CheckCircle, Clock, Package, Truck, Users, ShieldCheck, Upload, Plus, LogOut, Search, Trash2, Edit3} from 'lucide-react';
import './styles.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const appUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
const emptyOrder = {order_number:'', customer_first_name:'', customer_last_name:'', customer_email:'', customer_dni:'', customer_address:'', product_name:'', logistics_operator:''};

function App(){
  const [session,setSession]=useState(null), [profile,setProfile]=useState(null), [loading,setLoading]=useState(true), [hasAdmin,setHasAdmin]=useState(null);
  useEffect(()=>{init(); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s); if(s) loadProfile(s.user.id); else setProfile(null)}); return()=>subscription.unsubscribe()},[]);
  async function init(){
    const {data:{session}}=await supabase.auth.getSession(); setSession(session);
    const {data:adminExists}=await supabase.rpc('has_admin'); setHasAdmin(!!adminExists);
    if(session) await loadProfile(session.user.id); setLoading(false);
  }
  async function loadProfile(uid){ const {data}=await supabase.from('profiles').select('*, sellers(name,color)').eq('id',uid).maybeSingle(); setProfile(data); }
  if(loading) return <Splash text="Preparando aplicación..."/>;
  if(hasAdmin===false) return <Setup onDone={()=>{setHasAdmin(true); init();}}/>;
  if(!session) return <Auth/>;
  if(!profile) return <Pending title="Perfil no encontrado" text="Tu usuario existe, pero todavía no tiene perfil. Registrate nuevamente o pedí al administrador que lo cree."/>;
  if(profile.approval_status==='pending') return <Pending title="Cuenta pendiente de aprobación" text="El administrador debe aprobar tu cuenta y asignarte un seller antes de operar."/>;
  if(profile.approval_status==='rejected' || !profile.active) return <Pending title="Cuenta no habilitada" text="Contactá al administrador para reactivar el acceso."/>;
  return <Dashboard session={session} profile={profile} reloadProfile={()=>loadProfile(session.user.id)}/>;
}
function Splash({text}){return <div className="center"><div className="loader"/><h2>{text}</h2></div>}
function Pending({title,text}){return <div className="center card narrow"><h1>{title}</h1><p>{text}</p><button onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button></div>}
function Auth(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[mode,setMode]=useState('login'),[msg,setMsg]=useState('');
 async function submit(e){e.preventDefault(); setMsg('Procesando...');
  if(mode==='login'){const {error}=await supabase.auth.signInWithPassword({email,password}); setMsg(error?error.message:'Ingresando...'); return;}
  const {data,error}=await supabase.auth.signUp({email,password}); if(error){setMsg(error.message);return;}
  await supabase.from('profiles').insert({id:data.user.id,email,full_name:name || email,role:'seller',approval_status:'pending'}); setMsg('Cuenta creada. Queda pendiente de aprobación del administrador.');
 }
 return <div className="auth"><form className="card narrow" onSubmit={submit}><h1>{mode==='login'?'Ingresar':'Solicitar cuenta'}</h1>{mode==='signup'&&<input placeholder="Nombre y apellido" value={name} onChange={e=>setName(e.target.value)} required/>}<input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><input placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button>{mode==='login'?'Ingresar':'Crear solicitud'}</button><a onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Solicitar nueva cuenta':'Ya tengo cuenta'}</a><p>{msg}</p></form></div>
}
function Setup({onDone}){
 const [company,setCompany]=useState(''),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[msg,setMsg]=useState('');
 async function create(e){e.preventDefault(); setMsg('Creando administrador...');
  const {data:auth,error}=await supabase.auth.signUp({email,password}); if(error){setMsg(error.message); return;}
  const {data:co,error:ce}=await supabase.from('companies').insert({name:company}).select().single(); if(ce){setMsg(ce.message); return;}
  const {data:seller,error:se}=await supabase.from('sellers').insert({company_id:co.id,name:company,email}).select().single(); if(se){setMsg(se.message); return;}
  const {error:pe}=await supabase.from('profiles').insert({id:auth.user.id,company_id:co.id,seller_id:seller.id,full_name:name,email,role:'admin',approval_status:'approved',active:true}); if(pe){setMsg(pe.message); return;}
  setMsg('Administrador creado. Ingresando...'); onDone();
 }
 return <div className="auth"><form className="card setup" onSubmit={create}><span className="pill">Configuración inicial</span><h1>Crear primer administrador</h1><p>Esto aparece una sola vez. Luego las cuentas nuevas quedan pendientes de aprobación.</p><input placeholder="Nombre de la empresa" value={company} onChange={e=>setCompany(e.target.value)} required/><input placeholder="Nombre administrador" value={name} onChange={e=>setName(e.target.value)} required/><input placeholder="Email administrador" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><input placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button>Crear sistema</button><p>{msg}</p></form></div>
}
function Dashboard({profile}){
 const [tab,setTab]=useState('orders');
 const menu=[['orders','Órdenes',Package],['import','Importar',Upload],['sellers','Sellers',Truck],['users','Usuarios',Users],['api','API',ShieldCheck]];
 return <div className="app"><aside><h2>Logística Pro</h2><p className="muted">{profile.role==='admin'?'Administrador':profile.sellers?.name}</p>{menu.filter(m=>profile.role==='admin'||!['sellers','users','api'].includes(m[0])).map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={18}/>{label}</button>)}<button onClick={()=>supabase.auth.signOut()}><LogOut size={18}/>Salir</button></aside><main>{tab==='orders'&&<Orders profile={profile}/>} {tab==='import'&&<ImportOrders profile={profile}/>} {tab==='sellers'&&<Sellers/>} {tab==='users'&&<UsersAdmin/>} {tab==='api'&&<ApiDocs/>}</main></div>
}
function Orders({profile}){const [orders,setOrders]=useState([]),[sellers,setSellers]=useState([]),[q,setQ]=useState(''),[form,setForm]=useState(emptyOrder),[editing,setEditing]=useState(null),[sellerId,setSellerId]=useState(profile.seller_id||'' );
 useEffect(()=>{load(); if(profile.role==='admin') supabase.from('sellers').select('*').eq('active',true).then(({data})=>setSellers(data||[]));},[]);
 async function load(){let query=supabase.from('orders').select('*, sellers(name,color)').is('deleted_at',null).order('created_at',{ascending:false}); const {data}=await query; setOrders(data||[])}
 const filtered=orders.filter(o=>[o.order_number,o.customer_email,o.customer_dni,o.customer_first_name,o.customer_last_name,o.product_name].join(' ').toLowerCase().includes(q.toLowerCase()));
 const stats={pending:orders.filter(o=>o.status==='pending').length,in_transit:orders.filter(o=>o.status==='in_transit').length,delivered:orders.filter(o=>o.status==='delivered').length};
 async function save(e){e.preventDefault(); const payload={...form,seller_id: profile.role==='admin'?sellerId:profile.seller_id, company_id:profile.company_id, source:'manual'}; if(!payload.seller_id){alert('Seleccioná un seller');return;} if(editing) await supabase.from('orders').update(payload).eq('id',editing); else await supabase.from('orders').insert(payload); setForm(emptyOrder); setEditing(null); load();}
 async function dispatch(id){const order=orders.find(o=>o.id===id); await supabase.from('orders').update({status:'in_transit',dispatched_at:new Date().toISOString()}).eq('id',id); await supabase.from('tracking_events').insert({order_id:id,event_type:'dispatch',description:'Sale a entregar'}); await supabase.from('email_logs').insert({order_id:id,to_email:order.customer_email,subject:`Tu compra ${order.order_number} salió a entrega`,status:'pending'}); load();}
 async function del(id){if(confirm('¿Eliminar orden?')){await supabase.from('orders').update({deleted_at:new Date().toISOString()}).eq('id',id); load();}}
 function edit(o){setEditing(o.id); setForm({order_number:o.order_number,customer_first_name:o.customer_first_name,customer_last_name:o.customer_last_name,customer_email:o.customer_email,customer_dni:o.customer_dni||'',customer_address:o.customer_address||'',product_name:o.product_name||'',logistics_operator:o.logistics_operator||''}); setSellerId(o.seller_id)}
 return <><Header title="Órdenes" subtitle="Despacho rápido, tracking y confirmación del cliente"/><div className="kpis"><Kpi icon={Clock} label="Pendientes" value={stats.pending}/><Kpi icon={Truck} label="En camino" value={stats.in_transit}/><Kpi icon={CheckCircle} label="Entregadas" value={stats.delivered}/></div><section className="grid"><form className="card" onSubmit={save}><h3>{editing?'Editar orden':'Nueva orden'}</h3>{profile.role==='admin'&&<select value={sellerId} onChange={e=>setSellerId(e.target.value)} required><option value="">Seleccionar seller</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>} {Object.keys(emptyOrder).map(k=><input key={k} placeholder={labels[k]} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} required={['order_number','customer_first_name','customer_last_name','customer_email'].includes(k)}/>) }<button><Plus size={16}/>{editing?'Guardar cambios':'Crear orden'}</button></form><div className="card tableCard"><div className="search"><Search size={16}/><input placeholder="Buscar orden, DNI, email, cliente..." value={q} onChange={e=>setQ(e.target.value)}/></div><table><thead><tr><th>Orden</th><th>Cliente</th><th>Seller</th><th>Estado</th><th></th></tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td><b>{o.order_number}</b><br/><small>{o.product_name}</small></td><td>{o.customer_first_name} {o.customer_last_name}<br/><small>{o.customer_email}</small></td><td>{o.sellers?.name}</td><td><span className={`status ${o.status}`}>{statusText[o.status]}</span><br/><a href={`/tracking/${o.tracking_token}`} target="_blank">Tracking</a></td><td className="actions"><button onClick={()=>dispatch(o.id)} disabled={o.status==='in_transit'||o.status==='delivered'}>Sale a entregar</button><button onClick={()=>edit(o)}><Edit3 size={15}/></button><button onClick={()=>del(o.id)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div></section></>}
function ImportOrders({profile}){const [rows,setRows]=useState([]),[sellerId,setSellerId]=useState(profile.seller_id||''),[sellers,setSellers]=useState([]),[msg,setMsg]=useState(''); useEffect(()=>{if(profile.role==='admin') supabase.from('sellers').select('*').eq('active',true).then(({data})=>setSellers(data||[]))},[]); function file(e){Papa.parse(e.target.files[0],{header:true,skipEmptyLines:true,complete:r=>setRows(r.data)})} async function imp(){const sid=profile.role==='admin'?sellerId:profile.seller_id; const payload=rows.map(r=>({company_id:profile.company_id,seller_id:sid,order_number:r.order_number||r.orden||r.Orden,customer_first_name:r.customer_first_name||r.nombre||r.Nombre,customer_last_name:r.customer_last_name||r.apellido||r.Apellido,customer_email:r.customer_email||r.email||r.Email,customer_dni:r.customer_dni||r.dni||r.DNI,customer_address:r.customer_address||r.direccion||r.Direccion,product_name:r.product_name||r.producto||r.Producto,logistics_operator:r.logistics_operator||r.operador||'',source:'csv'})).filter(x=>x.order_number&&x.customer_email); const {error}=await supabase.from('orders').upsert(payload,{onConflict:'seller_id,order_number'}); setMsg(error?error.message:`Importadas/actualizadas ${payload.length} órdenes`)} return <><Header title="Importar CSV" subtitle="Columnas aceptadas: order_number, nombre, apellido, email, dni, direccion, producto"/><div className="card narrow">{profile.role==='admin'&&<select value={sellerId} onChange={e=>setSellerId(e.target.value)}><option value="">Seleccionar seller</option>{sellers.map(s=><option value={s.id}>{s.name}</option>)}</select>}<input type="file" accept=".csv" onChange={file}/><p>{rows.length} filas detectadas</p><button onClick={imp} disabled={!rows.length}>Importar</button><p>{msg}</p></div></>}
function Sellers(){const [items,setItems]=useState([]),[name,setName]=useState(''),[email,setEmail]=useState(''); useEffect(()=>{load()},[]); async function load(){const {data}=await supabase.from('sellers').select('*').order('created_at',{ascending:false}); setItems(data||[])} async function add(){await supabase.from('sellers').insert({name,email}); setName('');setEmail('');load()} return <><Header title="Sellers" subtitle="Crear sellers y usar su API Key para integrar órdenes"/><div className="card narrow"><input placeholder="Nombre seller" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><button onClick={add}>Crear seller</button></div><div className="card"><table><tbody>{items.map(s=><tr><td><b>{s.name}</b><br/><small>{s.email}</small></td><td><code>{s.api_key}</code></td></tr>)}</tbody></table></div></>}
function UsersAdmin(){const [users,setUsers]=useState([]),[sellers,setSellers]=useState([]); useEffect(()=>{load(); supabase.from('sellers').select('*').then(({data})=>setSellers(data||[]))},[]); async function load(){const {data}=await supabase.from('profiles').select('*, sellers(name)').order('created_at',{ascending:false}); setUsers(data||[])} async function upd(u,patch){await supabase.from('profiles').update(patch).eq('id',u.id); load()} return <><Header title="Usuarios" subtitle="Aprobar cuentas, asignar roles y seller"/><div className="card"><table><thead><tr><th>Usuario</th><th>Estado</th><th>Rol</th><th>Seller</th></tr></thead><tbody>{users.map(u=><tr><td><b>{u.full_name}</b><br/><small>{u.email}</small></td><td><span className="pill">{u.approval_status}</span><br/>{u.approval_status==='pending'&&<><button onClick={()=>upd(u,{approval_status:'approved',active:true})}>Aprobar</button><button onClick={()=>upd(u,{approval_status:'rejected',active:false})}>Rechazar</button></>}</td><td><select value={u.role} onChange={e=>upd(u,{role:e.target.value})}>{['admin','seller','operator','viewer'].map(r=><option>{r}</option>)}</select></td><td><select value={u.seller_id||''} onChange={e=>upd(u,{seller_id:e.target.value||null})}><option value="">Sin seller</option>{sellers.map(s=><option value={s.id}>{s.name}</option>)}</select></td></tr>)}</tbody></table></div></>}
function ApiDocs(){return <><Header title="API" subtitle="Integración automática de órdenes"/><div className="card"><h3>POST /api/orders</h3><p>En Vercel podés crear una Serverless Function que valide el header <code>x-api-key</code> contra la tabla sellers.</p><pre>{`{
  "order_number":"1001",
  "customer_first_name":"Juan",
  "customer_last_name":"Perez",
  "customer_email":"juan@email.com",
  "customer_dni":"12345678",
  "customer_address":"Av. Siempre Viva 123",
  "product_name":"Producto X"
}`}</pre></div></>}
const labels={order_number:'Número de orden',customer_first_name:'Nombre cliente',customer_last_name:'Apellido cliente',customer_email:'Email cliente',customer_dni:'DNI',customer_address:'Dirección',product_name:'Producto',logistics_operator:'Operador logístico'};
const statusText={pending:'Pendiente',ready:'Preparado',in_transit:'En camino',delivered:'Entregado',not_delivered:'No entregado',rescheduled:'Reprogramado',cancelled:'Cancelado'};
function Header({title,subtitle}){return <header><h1>{title}</h1><p>{subtitle}</p></header>}
function Kpi({icon:Icon,label,value}){return <div className="kpi"><Icon/><span>{label}</span><b>{value}</b></div>}
createRoot(document.getElementById('root')).render(<App/>);
