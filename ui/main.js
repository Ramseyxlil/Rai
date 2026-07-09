const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const providerMeta = {
  claude: { name: "Claude", color: "#E4A07C" },
  openai: { name: "OpenAI", color: "#7FD9B0" },
  foundry: { name: "Foundry", color: "#7FA9E6" },
};

const MODES = {
  general: { name: "General", icon: "\u25C7", desc: "A calm, all-purpose assistant.",
    system: "You are Rai, a calm, concise assistant. Answer directly and briefly. When a screenshot is provided, ground your answer in what is on screen.",
    actions: [
      { l: "Explain my screen", p: "Explain what's on my screen and what I should do next.", s: true },
      { l: "Summarize screen", p: "Summarize what's on my screen concisely.", s: true },
      { l: "Draft a reply", p: "Draft a short, friendly reply to what's on my screen.", s: true },
      { l: "Ask anything", p: "", s: false } ] },
  interview: { name: "Interview", icon: "\u{1F3AF}", desc: "Crisp answers you can say aloud.",
    system: "You are helping the user in a live interview. Give crisp, correct, confident answers they can say out loud. For coding questions, give a working solution with a one-line explanation. Be concise.",
    actions: [
      { l: "Answer this question", p: "Answer the interview question on my screen, concise and confident.", s: true },
      { l: "Solve this problem", p: "Solve the coding problem on my screen with working code and a one-line explanation.", s: true },
      { l: "STAR answer", p: "Give a STAR-format answer to the behavioural question on screen.", s: true },
      { l: "Explain my screen", p: "Explain what's on my screen.", s: true } ] },
  meeting: { name: "Meeting", icon: "\u{1F5E3}", desc: "Recap, action items, what to say.",
    system: "You are a meeting copilot. Summarize, surface action items, and suggest what to say next. Be brief and practical.",
    actions: [
      { l: "Recap so far", p: "Recap the meeting so far based on what's on screen.", s: true },
      { l: "Action items", p: "List the action items from what's on my screen.", s: true },
      { l: "What to say next", p: "Based on what's on screen, what should I say next? One or two lines.", s: true },
      { l: "Draft follow-up", p: "Draft a short follow-up email from this meeting.", s: true } ] },
  sales: { name: "Sales", icon: "\u{1F4C8}", desc: "Objections, talk tracks, next steps.",
    system: "You are a sales copilot. Handle objections, suggest talk tracks and next questions, keep it persuasive and short.",
    actions: [
      { l: "Handle objection", p: "The prospect raised an objection on screen. Give me the best response.", s: true },
      { l: "Next question", p: "What's the best question to ask next in this sales conversation?", s: true },
      { l: "Follow-up email", p: "Draft a high-converting follow-up email from this conversation.", s: true },
      { l: "Explain my screen", p: "Explain what's on my screen.", s: true } ] },
  coding: { name: "Coding", icon: "\u{1F9E9}", desc: "Read the screen, fix the bug.",
    system: "You are a senior pair programmer. Read the screen carefully. Find the bug or answer the question, and give the fix as a snippet with a one-line why. Be precise.",
    actions: [
      { l: "Fix this bug", p: "Find the bug in the code on my screen and give the fix.", s: true },
      { l: "Explain this code", p: "Explain the code on my screen simply.", s: true },
      { l: "Optimize this", p: "Suggest how to optimize the code on my screen.", s: true },
      { l: "Write a test", p: "Write a test for the code on my screen.", s: true } ] },
  study: { name: "Study", icon: "\u{1F4DA}", desc: "A patient tutor.",
    system: "You are a patient tutor. Explain clearly and simply, step by step. Keep it encouraging.",
    actions: [
      { l: "Explain simply", p: "Explain what's on my screen simply, step by step.", s: true },
      { l: "Quiz me", p: "Ask me 3 quick questions to test the material on my screen.", s: true },
      { l: "Summarize notes", p: "Summarize the notes on my screen into key points.", s: true },
      { l: "Give an example", p: "Give a concrete example of the concept on my screen.", s: true } ] },
  writing: { name: "Writing", icon: "\u270D", desc: "Sharper words, better tone.",
    system: "You are a sharp writing assistant. Improve clarity and tone. Give the rewrite first, then a one-line note. Never use em dashes.",
    actions: [
      { l: "Improve this", p: "Improve the writing on my screen. Give the rewrite first.", s: true },
      { l: "Shorten this", p: "Make the text on my screen shorter and punchier.", s: true },
      { l: "Fix grammar", p: "Fix any grammar in the text on my screen.", s: true },
      { l: "Change the tone", p: "Rewrite the text on my screen in a warmer tone.", s: true } ] },
  custom: { name: "Custom", icon: "\u2699", desc: "Your own prompt (set in Settings).",
    system: "", actions: [ { l: "Ask anything", p: "", s: false }, { l: "Explain my screen", p: "Explain what's on my screen.", s: true } ] },
};

let settings = null, invisible = false, seeScreen = false, history = [];

function defaults() {
  return { active:"claude",
    claude:{api_key:"",model:"claude-sonnet-4-6",endpoint:"",deployment:"",api_version:""},
    openai:{api_key:"",model:"gpt-4o",endpoint:"",deployment:"",api_version:""},
    foundry:{api_key:"",model:"",endpoint:"",deployment:"",api_version:"2024-10-21"},
    start_invisible:true, screen_by_default:false, opacity:92, mode:"general", custom_prompt:"", width:460, height:600 };
}

async function boot() {
  try { settings = await invoke("get_settings"); } catch { settings = defaults(); }
  try { history = await invoke("get_history"); } catch { history = []; }
  if (!Array.isArray(history)) history = [];
  invisible = await invoke("get_invisible").catch(() => false);
  seeScreen = !!settings.screen_by_default;
  applyOpacity(settings.opacity || 92);
  hydrateForm();
  reflectProvider(); reflectInvisible(); reflectSee(); reflectMode();
  renderHome(); renderHistory();
  autoUpdate();
}

/* auto-update: check GitHub on every launch, install silently, ask to restart */
function toast(msg){
  let t=document.getElementById("toast");
  if(!t){ t=document.createElement("div"); t.id="toast"; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),6000);
}
async function autoUpdate(){
  try{
    const r=await invoke("check_update");
    if(r==="updated") toast("Update installed. Restart Rai to apply.");
  }catch(e){ /* updater not set up yet, or offline — ignore silently */ }
}
function applyOpacity(v){ document.documentElement.style.setProperty("--alpha",(v/100).toFixed(2)); }
function currentMode(){ return MODES[settings.mode] || MODES.general; }
function currentSystem(){
  if (settings.mode === "custom" && settings.custom_prompt.trim()) return settings.custom_prompt.trim();
  return currentMode().system || undefined;
}

/* views */
function switchView(v){
  $$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===v));
  $$(".view").forEach(x=>x.classList.remove("active"));
  $("#view-"+v).classList.add("active");
  $("#rfoot").style.display = (v==="history") ? "none" : "block";
}
$$(".tab").forEach(t=>t.addEventListener("click",()=>switchView(t.dataset.view)));

/* provider */
function reflectProvider(){
  const m = providerMeta[settings.active] || providerMeta.claude;
  $("#pillText").textContent = m.name; $("#pillSw").style.background = m.color;
  $$(".prov").forEach(p=>{ const on=p.dataset.prov===settings.active; p.classList.toggle("active",on); p.querySelector(".choose").textContent=on?"Active":"Set active"; });
}
$("#providerPill").addEventListener("click",()=>{ const o=["claude","openai","foundry"]; settings.active=o[(o.indexOf(settings.active)+1)%o.length]; reflectProvider(); renderHome(); invoke("save_settings",{settings}); });

/* invisibility */
function reflectInvisible(){ $("#eyeBtn").classList.toggle("on",invisible); const h=$("#modeHint"); h.textContent=invisible?"Hidden":"Visible"; h.classList.toggle("hidden",invisible); renderHome(); }
$("#eyeBtn").addEventListener("click",async()=>{ invisible=!invisible; try{await invoke("set_invisible",{on:invisible});}catch{} reflectInvisible(); });
listen("invisible-changed",e=>{ invisible=!!e.payload; reflectInvisible(); });

/* see screen */
function reflectSee(){ $("#seeBtn").classList.toggle("on",seeScreen); const h=$("#screenHint"); h.textContent=seeScreen?"screen on":"screen off"; h.classList.toggle("on",seeScreen); }
$("#seeBtn").addEventListener("click",()=>{ seeScreen=!seeScreen; reflectSee(); });

/* close / hide */
$("#closeBtn").addEventListener("click",()=>invoke("hide_window"));

/* mode */
function reflectMode(){
  const m=currentMode();
  $("#modeText").textContent=m.name; $("#mcName").textContent=m.name; $("#mcDesc").textContent=m.desc;
  $("#setModeName").textContent=m.name;
}
function renderHome(){
  const m=currentMode();
  const qa=$("#quickActions"); qa.innerHTML="";
  m.actions.forEach(a=>{
    const b=document.createElement("button");
    b.innerHTML=a.l+(a.s?'<small>reads your screen</small>':'');
    b.addEventListener("click",()=>{ if(!a.p){ switchView("chat"); $("#ask").focus(); return; } runAsk(a.p, a.s); });
    qa.appendChild(b);
  });
  const sr=$("#statusRow"); sr.innerHTML="";
  const chip=(on,txt)=>`<span class="chip ${on?'':'off'}"><span class="d"></span>${txt}</span>`;
  sr.innerHTML = chip(true, providerMeta[settings.active].name) + chip(invisible,"Invisible") + chip(seeScreen,"Screen");
}
$("#modePill").addEventListener("click",openModes);
$("#mcChange").addEventListener("click",openModes);
$("#setModeBtn").addEventListener("click",openModes);
function openModes(){
  const list=$("#modeList"); list.innerHTML="";
  Object.entries(MODES).forEach(([id,m])=>{
    const el=document.createElement("div");
    el.className="modeitem"+(id===settings.mode?" active":"");
    el.innerHTML=`<div class="mi-ic">${m.icon}</div><div><div class="mi-n">${m.name}</div><div class="mi-d">${m.desc}</div></div>`;
    el.addEventListener("click",()=>{ settings.mode=id; reflectMode(); renderHome(); invoke("save_settings",{settings}); $("#modeScrim").classList.remove("show"); });
    list.appendChild(el);
  });
  $("#modeScrim").classList.add("show");
}
$("#closeMode").addEventListener("click",()=>$("#modeScrim").classList.remove("show"));
$("#modeScrim").addEventListener("click",e=>{ if(e.target===$("#modeScrim")) $("#modeScrim").classList.remove("show"); });

/* ask */
const thread=$("#thread");
function esc(s){ return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function bubble(cls,html){ const el=document.createElement("div"); el.className=cls; el.innerHTML=html; thread.appendChild(el); el.scrollIntoView({block:"end"}); return el; }
async function runAsk(prompt, withScreen){
  switchView("chat"); $("#idle").style.display="none";
  const useScreen = withScreen || seeScreen;
  const tag = useScreen?'<span class="tag">+ screen</span>':'';
  bubble("q", tag+esc(prompt));
  const a=bubble("a",`<div class="who"><span class="drop"></span> Rai</div><span class="dots"><i></i><i></i><i></i></span>`);
  try{
    const answer = await invoke("ask",{ prompt, useScreen, system: currentSystem() });
    a.innerHTML=`<div class="who"><span class="drop"></span> Rai · ${providerMeta[settings.active].name}${useScreen?" · saw your screen":""}</div>${esc(answer)}`;
    pushHistory(prompt, answer);
  }catch(err){ a.classList.add("err"); a.innerHTML=`<div class="who"><span class="drop"></span> Rai</div>${esc(String(err))}`; }
  a.scrollIntoView({block:"end"});
}
async function askFromInput(){
  const ta=$("#ask"); const q=ta.value.trim(); if(!q) return; ta.value=""; autosize();
  await runAsk(q, seeScreen);
}
$("#sendBtn").addEventListener("click",askFromInput);
const ta=$("#ask");
function autosize(){ ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,110)+"px"; }
ta.addEventListener("input",autosize);
ta.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); askFromInput(); } });

/* history */
function pushHistory(q,a){
  history.unshift({ q, a, provider: providerMeta[settings.active].name, mode: currentMode().name, ts: Date.now() });
  history = history.slice(0,100);
  invoke("save_history",{history});
  renderHistory();
}
function renderHistory(){
  const list=$("#histList"); list.innerHTML="";
  $("#histEmpty").style.display = history.length? "none":"block";
  history.forEach(h=>{
    const el=document.createElement("div"); el.className="hitem";
    el.innerHTML=`<div class="hq">${esc(h.q).slice(0,120)}</div><div class="ha">${esc(h.a).slice(0,160)}</div><div class="hm">${h.mode} · ${h.provider}</div>`;
    el.addEventListener("click",()=>{ switchView("chat"); $("#idle").style.display="none"; thread.innerHTML=""; bubble("q",esc(h.q)); bubble("a",`<div class="who"><span class="drop"></span> Rai · ${h.provider}</div>${esc(h.a)}`); });
    list.appendChild(el);
  });
}
$("#clearHist").addEventListener("click",()=>{ history=[]; invoke("save_history",{history}); renderHistory(); });

/* voice — free & offline via vosk-browser (WebAssembly, no key, no cost) */
const VOSK_MODEL_URL = "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz";
let voskModel=null, recognizer=null, audioCtx=null, procNode=null, micStream=null, listening=false;
function micHint(t){ $("#micHint").textContent=t; }
async function ensureModel(){
  if(voskModel) return;
  if(typeof Vosk==="undefined") throw new Error("Voice engine needs internet the first time.");
  micHint("loading voice model...");
  voskModel = await Vosk.createModel(VOSK_MODEL_URL);
}
async function startListen(){
  await ensureModel();
  micStream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true, channelCount:1 } });
  audioCtx = new AudioContext();
  recognizer = new voskModel.KaldiRecognizer(audioCtx.sampleRate);
  recognizer.on("result", m => { if(m.result && m.result.text){ ta.value = (ta.value?ta.value+" ":"")+m.result.text; autosize(); } });
  recognizer.on("partialresult", m => { micHint(m.result && m.result.partial ? '"'+m.result.partial+'"' : "listening..."); });
  procNode = audioCtx.createScriptProcessor(4096,1,1);
  procNode.onaudioprocess = e => { try{ recognizer.acceptWaveform(e.inputBuffer); }catch(err){} };
  const src = audioCtx.createMediaStreamSource(micStream);
  const mute = audioCtx.createGain(); mute.gain.value = 0;
  src.connect(procNode); procNode.connect(mute); mute.connect(audioCtx.destination);
  listening=true; $("#micBtn").classList.add("rec"); micHint("listening..."); switchView("chat"); ta.focus();
}
function stopListen(){
  listening=false; $("#micBtn").classList.remove("rec"); micHint("");
  try{ if(procNode) procNode.disconnect(); }catch{}
  try{ if(audioCtx) audioCtx.close(); }catch{}
  try{ if(micStream) micStream.getTracks().forEach(t=>t.stop()); }catch{}
  try{ if(recognizer) recognizer.remove(); }catch{}
  recognizer=null; audioCtx=null; procNode=null; micStream=null;
}
async function toggleRec(){
  if(listening){ stopListen(); return; }
  try{ await startListen(); }
  catch(e){ micHint(String(e.message||e)); setTimeout(()=>micHint(""),2600); }
}
$("#micBtn").addEventListener("click",toggleRec);

/* settings */
$("#gearBtn").addEventListener("click",()=>$("#scrim").classList.add("show"));
$("#closeSheet").addEventListener("click",()=>$("#scrim").classList.remove("show"));
$("#scrim").addEventListener("click",e=>{ if(e.target===$("#scrim")) $("#scrim").classList.remove("show"); });
$$(".rev").forEach(r=>r.addEventListener("click",()=>{ const i=r.previousElementSibling; const sh=i.type==="password"; i.type=sh?"text":"password"; r.textContent=sh?"hide":"show"; }));
$$(".choose").forEach(b=>b.addEventListener("click",()=>{ settings.active=b.closest(".prov").dataset.prov; reflectProvider(); }));
$("#opacity").addEventListener("input",e=>{ const v=+e.target.value; $("#opacityVal").textContent=v+"%"; applyOpacity(v); });
$("#centerBtn").addEventListener("click",()=>invoke("center_window"));
$("#applySize").addEventListener("click",applySize);
$$(".sizepresets button").forEach(b=>b.addEventListener("click",()=>{ $("#wIn").value=b.dataset.w; $("#hIn").value=b.dataset.h; applySize(); }));
function applySize(){ const w=Math.max(360,+$("#wIn").value||460), h=Math.max(420,+$("#hIn").value||600); settings.width=w; settings.height=h; invoke("set_size",{width:w,height:h}); invoke("save_settings",{settings}); }
$("#quitBtn").addEventListener("click",()=>invoke("quit_app"));
$("#updBtn").addEventListener("click",async()=>{
  $("#updMsg").textContent="Checking...";
  try{ const r=await invoke("check_update"); $("#updMsg").textContent = r==="updated"?"Updated. Restart to apply.":"You're on the latest version."; }
  catch(e){ $("#updMsg").textContent=String(e).includes("not configured")||String(e).includes("config")?"Updates not set up yet.":String(e); }
});
["mail1","mail2","mail3","mail4"].forEach(id=>{ const el=document.getElementById(id); if(el) el.href="mailto:"+el.textContent.trim(); });

function hydrateForm(){
  $$("[data-k]").forEach(el=>{ const [p,k]=el.dataset.k.split("."); if(k===undefined){ el.value=settings[p]||""; } else { el.value=(settings[p]&&settings[p][k])||""; } });
  $("#startInvisible").checked=!!settings.start_invisible;
  $("#screenDefault").checked=!!settings.screen_by_default;
  $("#opacity").value=settings.opacity||92; $("#opacityVal").textContent=(settings.opacity||92)+"%";
  $("#wIn").value=settings.width||460; $("#hIn").value=settings.height||600;
}
$("#saveBtn").addEventListener("click",async()=>{
  $$("[data-k]").forEach(el=>{ const [p,k]=el.dataset.k.split("."); if(k===undefined){ settings[p]=el.value.trim(); } else { settings[p][k]=el.value.trim(); } });
  settings.start_invisible=$("#startInvisible").checked;
  settings.screen_by_default=$("#screenDefault").checked;
  settings.opacity=+$("#opacity").value;
  seeScreen=settings.screen_by_default;
  await invoke("save_settings",{settings});
  reflectProvider(); reflectSee(); reflectMode(); renderHome();
  $("#scrim").classList.remove("show");
});

boot();
