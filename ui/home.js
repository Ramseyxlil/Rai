const { invoke } = window.__TAURI__.core;
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

let settings=null, history=[];

/* paint icons */
$("#launchMini").innerHTML=svg("launch",15)+" Launch Rai";
$("#minBtn").innerHTML=svg("minimize",14); $("#closeBtn").innerHTML=svg("hide",14);
$("#rModes").innerHTML=svg("modes",19); $("#rHistory").innerHTML=svg("history",19);
$("#rSettings").innerHTML=svg("settings",19); $("#rQuit").innerHTML=svg("quit",19);
$("#launchBig").innerHTML=svg("launch",18)+" Launch Rai";

function defaults(){return{active:"claude",claude:{api_key:"",model:"claude-sonnet-4-6"},openai:{api_key:"",model:"gpt-4o"},foundry:{api_key:"",model:"",endpoint:"",deployment:"",api_version:"2024-10-21"},start_invisible:true,screen_by_default:false,opacity:92,mode:"general",custom_prompt:"",launch_on_startup:false};}

async function boot(){
  try{ settings=await invoke("get_settings"); }catch{ settings=defaults(); }
  try{ history=await invoke("get_history"); }catch{ history=[]; }
  if(!Array.isArray(history)) history=[];
  renderModes(); renderHistory(); hydrate();
}

/* window controls */
$("#launchMini").onclick=()=>invoke("launch_assistant");
$("#launchBig").onclick=()=>invoke("launch_assistant");
$("#minBtn").onclick=()=>{ try{ window.__TAURI__.window.getCurrentWindow().minimize(); }catch{} };
$("#closeBtn").onclick=()=>invoke("close_home");
$("#rQuit").onclick=()=>invoke("quit_app");
$("#quitBtn").onclick=()=>invoke("quit_app");

/* rail nav */
$$(".rail button[data-view]").forEach(b=>b.onclick=()=>{
  $$(".rail button[data-view]").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  $$(".view").forEach(v=>v.classList.toggle("active",v.dataset.panel===b.dataset.view));
});

/* modes */
function renderModes(){
  const g=$("#modegrid"); g.innerHTML="";
  Object.entries(MODES).forEach(([id,m])=>{
    const b=document.createElement("button"); b.className="modebtn"+(id===settings.mode?" active":"");
    b.innerHTML=svg(m.icon,20)+`<span class="lbl">${m.name}</span>`;
    b.onclick=()=>{ settings.mode=id; $$(".modebtn").forEach(x=>x.classList.remove("active")); b.classList.add("active"); invoke("save_settings",{settings}); };
    g.appendChild(b);
  });
}

/* history */
function renderHistory(){
  const l=$("#histList"); l.innerHTML=""; $("#histEmpty").style.display=history.length?"none":"block";
  history.forEach(h=>{
    const el=document.createElement("div"); el.className="hitem";
    el.innerHTML=`<div class="hq">${esc(h.q).slice(0,140)}</div><div class="ha">${esc(h.a).slice(0,180)}</div><div class="hm">${h.mode} · ${h.provider}</div>`;
    l.appendChild(el);
  });
}

/* settings */
$$(".rev").forEach(r=>r.onclick=()=>{ const i=r.previousElementSibling; const sh=i.type==="password"; i.type=sh?"text":"password"; r.textContent=sh?"hide":"show"; });
$$(".choose").forEach(b=>b.onclick=()=>{ settings.active=b.closest(".prov").dataset.prov; reflectProv(); });
function reflectProv(){ $$(".prov").forEach(p=>{ const on=p.dataset.prov===settings.active; p.classList.toggle("active",on); p.querySelector(".choose").textContent=on?"Active":"Set active"; }); }
function tog(id,key){ const el=$(id); el.onclick=()=>{ settings[key]=!settings[key]; el.classList.toggle("on",settings[key]); }; }
tog("#swInvisible","start_invisible"); tog("#swStartup","launch_on_startup"); tog("#swScreen","screen_by_default");
$("#opacity").oninput=e=>document.documentElement.style.setProperty("--alpha",(+e.target.value/100).toFixed(2));
$("#applySize").onclick=()=>{ const w=Math.max(380,+$("#wIn").value||480), h=Math.max(120,+$("#hIn").value||300); invoke("set_window_size",{label:"assistant",width:w,height:h}); };
$("#updBtn").onclick=async()=>{ $("#updMsg").textContent="Checking..."; try{ const r=await invoke("check_update"); $("#updMsg").textContent=r==="updated"?"Updated. Restart to apply.":"You're on the latest version."; }catch(e){ $("#updMsg").textContent=String(e).includes("config")?"Updates not set up yet.":String(e); } };

function hydrate(){
  $$("[data-k]").forEach(el=>{ const [p,k]=el.dataset.k.split("."); el.value=(k===undefined)?(settings[p]||""):((settings[p]&&settings[p][k])||""); });
  reflectProv();
  $("#swInvisible").classList.toggle("on",settings.start_invisible);
  $("#swStartup").classList.toggle("on",settings.launch_on_startup);
  $("#swScreen").classList.toggle("on",settings.screen_by_default);
  $("#opacity").value=settings.opacity||92;
}
$("#saveBtn").onclick=async()=>{
  $$("[data-k]").forEach(el=>{ const [p,k]=el.dataset.k.split("."); if(k===undefined) settings[p]=el.value.trim(); else settings[p][k]=el.value.trim(); });
  settings.opacity=+$("#opacity").value;
  await invoke("save_settings",{settings});
  toast("Settings saved");
};
function toast(msg){ let t=$(".toast"); if(!t){ t=document.createElement("div"); t.className="toast"; document.body.appendChild(t);} t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }

boot();
