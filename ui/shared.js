/* Shared: professional SVG icons, modes, provider metadata. Loaded by both windows. */
const ICONS = {
  general:'<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="3.2"/>',
  interview:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  meeting:'<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1-5.5a8.5 8.5 0 1 1 17-3Z"/>',
  sales:'<path d="M3 3v18h18"/><path d="M7 15l3.5-4 3 2.5L21 7"/>',
  coding:'<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
  study:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
  writing:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  custom:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h6M14 18h6"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="12" cy="18" r="2"/>',
  modes:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  screen:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  hide:'<path d="M18 6 6 18M6 6l12 12"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/>',
  send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>',
  launch:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  quit:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  minimize:'<path d="M5 12h14"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
};
function svg(name, size){ const s=size||16; return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7">${ICONS[name]||''}</svg>`; }

const providerMeta = {
  claude:  { name:"Claude",  color:"#E4A07C" },
  openai:  { name:"OpenAI",  color:"#7FD9B0" },
  foundry: { name:"Foundry", color:"#7FA9E6" },
};

const MODES = {
  general:{name:"General",icon:"general",desc:"A calm, all-purpose assistant.",
    system:"You are Rai, a calm, concise assistant. Answer directly and briefly. When a screenshot is provided, ground your answer in what is on screen."},
  interview:{name:"Interview",icon:"interview",desc:"Crisp answers you can say aloud.",
    system:"You are helping the user in a live interview. Give crisp, correct, confident answers they can say out loud. For coding, give a working solution with a one-line explanation."},
  meeting:{name:"Meeting",icon:"meeting",desc:"Recap, action items, what to say.",
    system:"You are a meeting copilot. Summarize, surface action items, and suggest what to say next. Be brief and practical."},
  sales:{name:"Sales",icon:"sales",desc:"Objections, talk tracks, next steps.",
    system:"You are a sales copilot. Handle objections, suggest talk tracks and next questions, keep it persuasive and short."},
  coding:{name:"Coding",icon:"coding",desc:"Read the screen, fix the bug.",
    system:"You are a senior pair programmer. Read the screen carefully, find the bug or answer the question, and give the fix as a snippet with a one-line why."},
  study:{name:"Study",icon:"study",desc:"A patient tutor.",
    system:"You are a patient tutor. Explain clearly and simply, step by step. Keep it encouraging."},
  writing:{name:"Writing",icon:"writing",desc:"Sharper words, better tone.",
    system:"You are a sharp writing assistant. Improve clarity and tone. Give the rewrite first, then a one-line note. Never use em dashes."},
  custom:{name:"Custom",icon:"custom",desc:"Your own prompt (set in Settings).",system:""},
};

function esc(s){ return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
