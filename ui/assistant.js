const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const $ = (s)=>document.querySelector(s);

let settings=null, invisible=false, seeScreen=false;

/* paint icons */
$("#screenBtn").innerHTML=svg("screen"); $("#eyeBtn").innerHTML=svg("eye");
$("#homeBtn").innerHTML=svg("home"); $("#hideBtn").innerHTML=svg("hide"); $("#moreBtn").innerHTML=svg("more");
$("#micBtn").innerHTML=svg("mic"); $("#sendBtn").innerHTML=svg("send");
$("#listenBtn").innerHTML=svg("mic",14)+' Voice';
$("#mHome").innerHTML=svg("home")+" Open Home";
$("#mScreen").innerHTML=svg("screen")+" Toggle screen";
$("#mQuit").innerHTML=svg("quit")+" Quit Rai";

function currentMode(){ return MODES[settings.mode]||MODES.general; }
function currentSystem(){
  if(settings.mode==="custom" && settings.custom_prompt.trim()) return settings.custom_prompt.trim();
  return currentMode().system||undefined;
}
async function boot(){
  try{ settings=await invoke("get_settings"); }catch{ settings={active:"claude",mode:"general",custom_prompt:"",screen_by_default:false,opacity:92,claude:{},openai:{},foundry:{}}; }
  invisible=await invoke("get_invisible").catch(()=>false);
  seeScreen=!!settings.screen_by_default;
  document.documentElement.style.setProperty("--alpha",((settings.opacity||92)/100).toFixed(2));
  reflect();
  preloadVoice();
}
function reflect(){
  $("#eyeBtn").classList.toggle("on",invisible);
  $("#screenBtn").classList.toggle("on",seeScreen);
}
listen("invisible-changed",e=>{ invisible=!!e.payload; reflect(); });

/* actions */
$("#eyeBtn").onclick=async()=>{ invisible=!invisible; try{await invoke("set_invisible",{on:invisible});}catch{} reflect(); };
$("#screenBtn").onclick=()=>{ seeScreen=!seeScreen; reflect(); };
$("#homeBtn").onclick=()=>invoke("open_home");
$("#hideBtn").onclick=()=>invoke("hide_assistant");
$("#moreBtn").onclick=(e)=>{ e.stopPropagation(); $("#moreMenu").classList.toggle("show"); };
document.addEventListener("click",()=>$("#moreMenu").classList.remove("show"));
$("#mHome").onclick=()=>invoke("open_home");
$("#mScreen").onclick=()=>{ seeScreen=!seeScreen; reflect(); };
$("#mQuit").onclick=()=>invoke("quit_app");

/* ask */
const thread=$("#thread"), body=$("#body");
function bubble(cls,html){ const el=document.createElement("div"); el.className=cls; el.innerHTML=html; thread.appendChild(el); body.scrollTop=body.scrollHeight; return el; }
async function runAsk(prompt, withScreen){
  $("#idle").style.display="none"; thread.style.display="flex"; body.classList.remove("empty");
  const useScreen=withScreen||seeScreen;
  bubble("q",(useScreen?'<span class="tag">+ screen</span>':'')+esc(prompt));
  const a=bubble("a",`<div class="who"><span class="drop"></span> Rai</div><span class="dots"><i></i><i></i><i></i></span>`);
  try{
    const answer=await invoke("ask",{prompt,useScreen,system:currentSystem()});
    a.innerHTML=`<div class="who"><span class="drop"></span> Rai · ${providerMeta[settings.active].name}${useScreen?" · saw screen":""}</div>${esc(answer)}`;
    pushHistory(prompt,answer);
  }catch(err){ a.classList.add("err"); a.innerHTML=`<div class="who"><span class="drop"></span> Rai</div>${esc(String(err))}`; }
  body.scrollTop=body.scrollHeight;
}
const ta=$("#ask");
function askInput(){ const q=ta.value.trim(); if(!q) return; ta.value=""; runAsk(q,seeScreen); }
$("#sendBtn").onclick=askInput;
ta.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); askInput(); } });

async function pushHistory(q,a){
  try{
    let h=await invoke("get_history"); if(!Array.isArray(h)) h=[];
    h.unshift({q,a,provider:providerMeta[settings.active].name,mode:currentMode().name,ts:Date.now()});
    await invoke("save_history",{history:h.slice(0,100)});
  }catch{}
}

/* ---- free offline voice (vosk-browser), preloaded at launch ---- */
const VOSK_MODEL_URL="https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz";
let voskModel=null, recognizer=null, audioCtx=null, procNode=null, micStream=null, listening=false, voiceReady=false;
function micHint(t){ $("#micHint").textContent=t; }
async function preloadVoice(){
  if(typeof Vosk==="undefined"){ $("#voiceState").textContent="voice needs internet once"; return; }
  try{ voskModel=await Vosk.createModel(VOSK_MODEL_URL); voiceReady=true; $("#voiceState").textContent="voice ready"; $("#micBtn").classList.add("ready"); }
  catch(e){ $("#voiceState").textContent="voice unavailable"; }
}
async function startListen(){
  if(!voiceReady){ micHint("loading voice..."); await preloadVoice(); if(!voiceReady) return; }
  micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
  audioCtx=new AudioContext();
  recognizer=new voskModel.KaldiRecognizer(audioCtx.sampleRate);
  recognizer.on("result",m=>{ if(m.result&&m.result.text){ ta.value=(ta.value?ta.value+" ":"")+m.result.text; } });
  recognizer.on("partialresult",m=>{ micHint(m.result&&m.result.partial?'"'+m.result.partial+'"':"listening..."); });
  procNode=audioCtx.createScriptProcessor(4096,1,1);
  procNode.onaudioprocess=e=>{ try{ recognizer.acceptWaveform(e.inputBuffer); }catch(err){} };
  const src=audioCtx.createMediaStreamSource(micStream);
  const mute=audioCtx.createGain(); mute.gain.value=0;
  src.connect(procNode); procNode.connect(mute); mute.connect(audioCtx.destination);
  listening=true; $("#micBtn").classList.add("rec"); $("#listenBtn").classList.add("on"); micHint("listening...");
}
function stopListen(){
  listening=false; $("#micBtn").classList.remove("rec"); $("#listenBtn").classList.remove("on"); micHint("");
  try{procNode&&procNode.disconnect();}catch{} try{audioCtx&&audioCtx.close();}catch{}
  try{micStream&&micStream.getTracks().forEach(t=>t.stop());}catch{} try{recognizer&&recognizer.remove();}catch{}
  recognizer=null; audioCtx=null; procNode=null; micStream=null;
}
function toggleVoice(){ if(listening) stopListen(); else startListen().catch(e=>{micHint("mic blocked");setTimeout(()=>micHint(""),2000);}); }
$("#micBtn").onclick=toggleVoice;
$("#listenBtn").onclick=toggleVoice;

boot();
