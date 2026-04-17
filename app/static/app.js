/* ═══════════════════════════════════════════════
   伴学搭子 · 前端
   ═══════════════════════════════════════════════ */

const LS_KEY = "bxtz_prefs_v1";

const AVATAR = {
  "2d": {
    brother: "https://api.dicebear.com/9.x/adventurer/svg?seed=study-bro&hair=short05&eyes=variant01&eyebrows=variant10&mouth=variant01&skinColor=f2d3b1",
    bestie:  "https://api.dicebear.com/9.x/adventurer/svg?seed=study-bestie&hair=long13&eyes=variant05&eyebrows=variant01&mouth=variant05&skinColor=f2d3b1&earrings=variant01&earringsProbability=100",
    partner: "https://api.dicebear.com/9.x/adventurer/svg?seed=study-partner&hair=long01&eyes=variant17&eyebrows=variant03&mouth=variant20&skinColor=f2d3b1",
    senior:  "https://api.dicebear.com/9.x/adventurer/svg?seed=study-senior&hair=short01&eyes=variant02&eyebrows=variant06&mouth=variant15&skinColor=f2d3b1&glasses=variant01&glassesProbability=100",
  },
  "3d": {
    brother: "https://api.dicebear.com/9.x/lorelei/svg?seed=bro-3d&hair=variant05&eyes=variant01&mouth=happy01",
    bestie:  "https://api.dicebear.com/9.x/lorelei/svg?seed=bestie-3d&hair=variant20&eyes=variant10&mouth=happy05",
    partner: "https://api.dicebear.com/9.x/lorelei/svg?seed=partner-3d&hair=variant30&eyes=variant15&mouth=happy10",
    senior:  "https://api.dicebear.com/9.x/lorelei/svg?seed=senior-3d&hair=variant10&eyes=variant03&mouth=happy15&glasses=variant01&glassesProbability=100",
  },
};

const LABEL = {
  task_type: { homework: "作业", review: "复习", hobby: "兴趣", other: "其他" },
  urgency:   { high: "紧急高", medium: "紧急中", low: "紧急低" },
  difficulty:{ easy: "易", medium: "中", hard: "难" },
  status:    { pending: "待开始", in_progress: "进行中", done: "已完成" },
};

const EGG = {
  brother: ["彩蛋：今天你已经超硬气了，奖励自己摸会儿鱼。", "彩蛋：三连番茄，兄弟我敬你是条汉子。"],
  bestie:  ["彩蛋：三连专注～你真的好温柔又坚定，我超爱你这点。", "彩蛋：小小里程碑达成，抱抱自己。"],
  partner: ["彩蛋：乖乖三连啦～等下奖励你多歇两分钟，好不好？", "彩蛋：你认真的样子，我偷偷看了三眼。"],
  senior:  ["彩蛋：三连番茄，复盘一下节奏：稳。", "彩蛋：专注力在涨，下一环可以稍微提难度。"],
};

const ANXIETY_WORDS = ["烦", "不想", "累", "拖", "焦虑", "慌", "害怕", "崩溃", "难受", "压力"];

/* ── helpers ── */
function $(sel, root = document) { return root.querySelector(sel); }
function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function toast(msg) {
  const el = $("#toast"); if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 4200);
}

async function api(path, opts = {}) {
  return fetch(path, { headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts });
}

/* ── settings ── */
function defaults() {
  return { relationship: "bestie", scene: "study", avatar_style: "2d", night_mode: false, pomodoro_work_minutes: 25, pomodoro_break_minutes: 5, music_mood: "focus" };
}
function readLocal()  { try { const j = JSON.parse(localStorage.getItem(LS_KEY)); return j && typeof j === "object" ? j : null; } catch { return null; } }
function writeLocal(s){ try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }
function merge(p)     { return { ...defaults(), ...(readLocal() || {}), ...p }; }

function updateAvatar(style, rel) {
  const img = $("#avatarImg"); if (!img) return;
  const url = AVATAR[style || "2d"]?.[rel || "bestie"] || AVATAR["2d"]["bestie"];
  if (img.src !== url) img.src = url;
}

function applyChrome(s) {
  document.body.dataset.night = s.night_mode ? "1" : "0";
  document.body.dataset.scene = s.scene || "study";
  document.body.dataset.avatar = s.avatar_style || "2d";
  $("#relationship").value = s.relationship || "bestie";
  updateAvatar(s.avatar_style, s.relationship);
  document.querySelectorAll("[data-avatar]").forEach(b => {
    const on = b.dataset.avatar === (s.avatar_style || "2d");
    b.setAttribute("aria-pressed", on); b.classList.toggle("active", on);
  });
  document.querySelectorAll("[data-scene]").forEach(b => {
    const on = b.dataset.scene === s.scene;
    b.setAttribute("aria-pressed", on); b.classList.toggle("active", on);
  });
  document.querySelectorAll("[data-music]").forEach(b => {
    const on = b.dataset.music === s.music_mood;
    b.setAttribute("aria-pressed", on); b.classList.toggle("active", on);
  });
}

let saveTimer;
function saveSettings(partial) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const res = await api("/api/settings", { method: "PATCH", body: JSON.stringify(partial) });
    if (res.ok) writeLocal(await res.json());
    else toast("偏好已保存在本机");
  }, 280);
}

async function initSettings() {
  let s = defaults();
  const local = readLocal();
  const res = await api("/api/settings");
  if (res.ok) { s = { ...s, ...(await res.json()) }; writeLocal(s); }
  else if (local) { s = { ...s, ...local }; toast("使用上次保存的偏好"); }
  applyChrome(s);
  return s;
}

/* ── chat (unified: normal + anxiety) ── */
function bubble(text, cls) {
  const log = $("#chatLog"); if (!log) return;
  const d = document.createElement("div");
  d.className = `bubble ${cls}`;
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

function isAnxious(msg) { return ANXIETY_WORDS.some(w => msg.includes(w)); }

$("#chatForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#chatInput");
  const text = input.value.trim();
  if (!text) return;
  bubble(text, "me");
  input.value = "";
  const anxious = isAnxious(text);
  const mode = anxious ? "anxiety" : "chat";
  const res = await api("/api/companion/reply", { method: "POST", body: JSON.stringify({ message: text, mode }) });
  if (!res.ok) { bubble("（连接失败了，先深呼吸一次，做最小的一步。）", "them"); return; }
  const j = await res.json();
  bubble(j.reply, "them");
  if (j.tip) bubble("小提示：" + j.tip, "tip");
});

$("#chatInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#chatForm")?.requestSubmit(); }
});

/* tap companion */
$("#companion")?.addEventListener("click", async () => {
  const res = await api("/api/companion/tap", { method: "POST", body: "{}" });
  if (res.ok) { const j = await res.json(); toast(j.reply); }
  else toast("我在呢，先开始 5 分钟试试。");
});
$("#companion")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#companion").click(); }
});

/* ── proactive greeting ── */
function greet() {
  const h = new Date().getHours();
  let period = "晚上好";
  if (h >= 5 && h < 12) period = "早上好";
  else if (h >= 12 && h < 14) period = "中午好";
  else if (h >= 14 && h < 18) period = "下午好";
  else if (h >= 23 || h < 5) period = "夜深了，注意休息哦";
  const rel = (readLocal() || defaults()).relationship;
  const greetings = {
    brother: `${period}！兄弟，今天准备搞点什么？`,
    bestie:  `${period}～今天也要一起加油呀！`,
    partner: `${period}～我在这儿陪你，想做什么？`,
    senior:  `${period}。先看看今天的任务清单，挑一个开始。`,
  };
  bubble(greetings[rel] || greetings.bestie, "them");
}

/* ── stats ── */
async function loadToday() {
  const el = $("#todayReport"); if (!el) return;
  const res = await api("/api/stats/today");
  if (!res.ok) { el.textContent = "暂时离线，先专注一小步也好。"; return; }
  const s = await res.json();
  const min = Math.round(s.focus_seconds / 60);
  el.textContent = `今日：专注 ${min} 分钟 · ${s.tasks_completed} 个任务 · ${s.pomodoros} 个番茄`;
}

async function loadHistory(days = 7) {
  const chart = $("#historyChart"); const summary = $("#historySummary");
  if (!chart) return;
  const res = await api(`/api/stats/history?days=${days}`);
  if (!res.ok) { chart.innerHTML = '<span class="note">暂时无法加载</span>'; return; }
  const data = await res.json();
  const maxMin = Math.max(1, ...data.map(d => Math.round(d.focus_seconds / 60)));
  chart.innerHTML = "";
  for (const d of data) {
    const min = Math.round(d.focus_seconds / 60);
    const pct = Math.round((min / maxMin) * 100);
    const bar = document.createElement("div");
    bar.className = "hbar";
    bar.innerHTML = `<span class="hbar-label">${d.day.slice(5)}</span><div class="hbar-track"><div class="hbar-fill" style="width:${pct}%"></div></div><span class="hbar-val">${min}m · ${d.pomodoros}p</span>`;
    chart.appendChild(bar);
  }
  const tMin = data.reduce((s, d) => s + d.focus_seconds, 0);
  const tP   = data.reduce((s, d) => s + d.pomodoros, 0);
  const tT   = data.reduce((s, d) => s + d.tasks_completed, 0);
  if (summary) summary.textContent = `合计：${Math.round(tMin / 60)} 分钟 · ${tP} 番茄 · ${tT} 任务`;
}

/* ── tasks ── */
function fmtTask(t) {
  return [LABEL.task_type[t.task_type] || t.task_type, LABEL.urgency[t.urgency], LABEL.difficulty[t.difficulty], LABEL.status[t.status]].join(" · ");
}

async function refreshTasks() {
  const ul = $("#taskList"); if (!ul) return;
  const res = await api("/api/tasks");
  if (!res.ok) { ul.innerHTML = `<li class="task-item"><div class="task-body"><span class="task-meta">任务列表暂时无法加载</span></div></li>`; return; }
  const items = await res.json();
  ul.innerHTML = "";
  if (!items.length) { ul.innerHTML = `<li class="task-item"><div class="flex-1"><span class="text-sm text-stone-400">还没有任务，先加一条最急的吧</span></div></li>`; return; }
  for (const t of items) {
    const li = document.createElement("li");
    li.className = "task-item";
    const body = document.createElement("div");
    body.className = "task-body";
    body.innerHTML = `<div class="task-name"></div><div class="task-meta"></div><div class="task-advice"></div>`;
    body.querySelector(".task-name").textContent = t.name;
    body.querySelector(".task-meta").textContent = fmtTask(t);
    body.querySelector(".task-advice").textContent = t.advice || "";

    const actions = document.createElement("div");
    actions.className = "task-actions flex gap-2 flex-wrap mt-2.5";

    if (t.status !== "done") {
      const focus = mk("button", "btn blue sm", "专注");
      focus.addEventListener("click", () => startFocusOnTask(t));
      actions.appendChild(focus);
    }

    if (t.status !== "done") {
      const next = t.status === "pending" ? { label: "开始", status: "in_progress" } : { label: "完成", status: "done" };
      const b = mk("button", "btn sm outline", next.label);
      b.addEventListener("click", () => patchTaskStatus(t.id, next.status, t.name));
      actions.appendChild(b);
    } else {
      const b = mk("button", "btn sm ghost", "恢复");
      b.addEventListener("click", () => patchTaskStatus(t.id, "pending", t.name));
      actions.appendChild(b);
    }

    const edit = mk("button", "btn sm ghost", "编辑");
    edit.addEventListener("click", () => openTaskEdit(li, t));
    actions.appendChild(edit);

    const del = mk("button", "btn sm ghost", "删除");
    del.addEventListener("click", async () => { if (!confirm("确定删除？")) return; const r = await api(`/api/tasks/${t.id}`, { method: "DELETE" }); if (r.ok) refreshTasks(); });
    actions.appendChild(del);

    body.appendChild(actions);
    li.appendChild(body);
    ul.appendChild(li);
  }
}

function openTaskEdit(li, t) {
  if (li.querySelector(".task-edit-form")) return;
  const form = document.createElement("form");
  form.className = "task-edit-form";
  form.innerHTML = `
    <input name="name" type="text" value="${escHtml(t.name)}" required />
    <select name="task_type">${["homework","review","hobby","other"].map(v => `<option value="${v}"${v === t.task_type ? " selected":""}>${LABEL.task_type[v]}</option>`).join("")}</select>
    <select name="urgency">${["high","medium","low"].map(v => `<option value="${v}"${v === t.urgency ? " selected":""}>${LABEL.urgency[v]}</option>`).join("")}</select>
    <select name="difficulty">${["easy","medium","hard"].map(v => `<option value="${v}"${v === t.difficulty ? " selected":""}>${LABEL.difficulty[v]}</option>`).join("")}</select>
    <div class="row"><button type="submit" class="btn primary sm">保存</button><button type="button" class="btn ghost sm task-edit-cancel">取消</button></div>
  `;
  form.querySelector(".task-edit-cancel").addEventListener("click", () => form.remove());
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const p = { name: String(fd.get("name")||"").trim(), task_type: fd.get("task_type"), urgency: fd.get("urgency"), difficulty: fd.get("difficulty") };
    if (!p.name) return;
    const r = await api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify(p) });
    if (r.ok) { toast("已更新"); refreshTasks(); } else toast("更新失败");
  });
  li.querySelector(".task-body").appendChild(form);
}

async function patchTaskStatus(id, status, name) {
  const res = await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  if (!res.ok) { toast("更新失败"); return; }
  if (status === "done") {
    const cr = await api("/api/companion/reply", { method: "POST", body: JSON.stringify({ message: `我搞定了：${name}`, mode: "chat" }) });
    if (cr.ok) { const j = await cr.json(); bubble(j.reply || "太棒了！", "them"); }
    else toast("太棒了，继续下一个！");
    /* if currently focusing this task, stop focus */
    if (pomo.focusTaskId === id) endFocus();
  }
  refreshTasks();
  loadToday();
}

/* ── task form pill groups ── */
document.querySelectorAll(".task-form .pill-group[data-field]").forEach(group => {
  const field = group.dataset.field;
  const hidden = document.querySelector(`.task-form input[name="${field}"]`);
  /* set initial active */
  const first = group.querySelector(".pill.active") || group.querySelector(".pill");
  if (first && !group.querySelector(".pill.active")) first.classList.add("active");
  if (first && hidden) hidden.value = first.dataset.val;

  group.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      group.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      if (hidden) hidden.value = pill.dataset.val;
    });
  });
});

/* ── task form submit ── */
$("#taskForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const p = { name: String(fd.get("name")||"").trim(), task_type: fd.get("task_type"), urgency: fd.get("urgency"), difficulty: fd.get("difficulty") };
  if (!p.name) return;
  const res = await api("/api/tasks", { method: "POST", body: JSON.stringify(p) });
  if (!res.ok) { toast("添加失败"); return; }
  e.target.querySelector('input[name="name"]').value = "";
  refreshTasks();
});

/* ── memos ── */
async function refreshMemos() {
  const ul = $("#memoList"); if (!ul) return;
  const res = await api("/api/memos");
  if (!res.ok) { ul.innerHTML = `<li class="memo-item"><span class="memo-meta">备忘录暂时无法加载</span></li>`; return; }
  const items = await res.json();
  ul.innerHTML = "";
  if (!items.length) { ul.innerHTML = `<li class="memo-item"><span class="text-sm text-stone-400">还没有备忘</span></li>`; return; }
  for (const m of items) {
    const li = document.createElement("li");
    li.className = "memo-item";
    li.innerHTML = `
      ${m.title ? `<div class="memo-title">${escHtml(m.title)}</div>` : ""}
      ${m.body  ? `<div class="memo-body">${escHtml(m.body)}</div>` : ""}
      <div class="memo-meta">${m.important ? "★ 重要 · " : ""}${m.updated_at || ""}</div>
      <div class="memo-actions"></div>
    `;
    const acts = li.querySelector(".memo-actions");

    const imp = mk("button", "btn sm ghost", m.important ? "取消重要" : "重要");
    imp.addEventListener("click", async () => { await api(`/api/memos/${m.id}`, { method: "PATCH", body: JSON.stringify({ important: !m.important }) }); refreshMemos(); });

    const editBtn = mk("button", "btn sm ghost", "编辑");
    editBtn.addEventListener("click", () => openMemoEdit(li, m));

    const toTask = mk("button", "btn sm outline", "转任务");
    toTask.addEventListener("click", async () => {
      const r = await api("/api/tasks/from-memo", { method: "POST", body: JSON.stringify({ memo_id: m.id }) });
      if (r.ok) { toast("已转为任务"); refreshTasks(); } else toast("转任务失败");
    });

    const del = mk("button", "btn sm ghost", "删除");
    del.addEventListener("click", async () => { if (!confirm("删除这条备忘？")) return; await api(`/api/memos/${m.id}`, { method: "DELETE" }); refreshMemos(); });

    acts.append(imp, editBtn, toTask, del);
    ul.appendChild(li);
  }
}

function mk(tag, cls, text) { const el = document.createElement(tag); el.type = "button"; el.className = cls; el.textContent = text; return el; }

function openMemoEdit(li, m) {
  if (li.querySelector(".memo-edit-form")) return;
  const form = document.createElement("form");
  form.className = "memo-edit-form";
  form.innerHTML = `
    <input name="title" type="text" value="${escHtml(m.title || "")}" placeholder="标题" />
    <textarea name="body" rows="2" placeholder="内容">${escHtml(m.body || "")}</textarea>
    <div class="row"><button type="submit" class="btn primary sm">保存</button><button type="button" class="btn ghost sm memo-edit-cancel">取消</button></div>
  `;
  form.querySelector(".memo-edit-cancel").addEventListener("click", () => form.remove());
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const p = { title: String(fd.get("title")||"").trim(), body: String(fd.get("body")||"").trim() };
    if (!p.title && !p.body) { toast("至少填一项"); return; }
    const r = await api(`/api/memos/${m.id}`, { method: "PATCH", body: JSON.stringify(p) });
    if (r.ok) { toast("已更新"); refreshMemos(); } else toast("更新失败");
  });
  li.appendChild(form);
}

$("#memoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const p = { title: String(fd.get("title")||"").trim(), body: String(fd.get("body")||"").trim(), important: Boolean(fd.get("important")) };
  if (!p.title && !p.body) { toast("写点内容再保存"); return; }
  const res = await api("/api/memos", { method: "POST", body: JSON.stringify(p) });
  if (!res.ok) { toast("保存失败"); return; }
  e.target.reset();
  refreshMemos();
});

/* ═══════════════════════════════════════
   Pomodoro + Focus Mode
   ═══════════════════════════════════════ */

let pomo = {
  mode: "idle", left: 0, tick: null, paused: false,
  workSec: 25 * 60, breakSec: 5 * 60, elapsedWork: 0,
  focusTaskId: null, focusTaskName: null,
};

function syncDurations(s) {
  pomo.workSec  = Math.max(60, (s.pomodoro_work_minutes || 25) * 60);
  pomo.breakSec = Math.max(60, (s.pomodoro_break_minutes || 5) * 60);
  if (pomo.mode === "idle") $("#pomoDisplay").textContent = fmtClock(pomo.workSec);
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function setPomoUi() {
  const display = fmtClock(Math.max(0, pomo.left));
  $("#pomoDisplay").textContent = display;
  const ring = $("#pomoRing");
  ring?.classList.toggle("active", pomo.mode === "work" && !pomo.paused);
  ring?.classList.toggle("breaking", pomo.mode === "break");

  const ph = $("#pomoPhase");
  if (pomo.mode === "work" && pomo.paused) ph.textContent = "已暂停";
  else if (pomo.mode === "work") ph.textContent = "专注中";
  else if (pomo.mode === "break" && pomo.paused) ph.textContent = "休息暂停中";
  else if (pomo.mode === "break") ph.textContent = "休息中";
  else ph.textContent = "准备就绪";

  const btn = $("#pomoStart");
  if (btn) {
    if ((pomo.mode === "work" || pomo.mode === "break") && !pomo.paused) btn.textContent = "暂停";
    else if (pomo.paused) btn.textContent = "继续";
    else btn.textContent = "开始专注";
  }

  /* sync focus banner */
  const banner = $("#focusBanner");
  if (pomo.focusTaskId && pomo.mode !== "idle") {
    banner?.classList.remove("is-hidden");
    const ft = $("#focusTimer"); if (ft) ft.textContent = display;
    const fn = $("#focusTaskName"); if (fn) fn.textContent = pomo.focusTaskName || "";
    const fp = $("#focusPause");
    if (fp) fp.textContent = pomo.paused ? "继续" : "暂停";
  } else {
    banner?.classList.add("is-hidden");
  }
}

function stopTick() { if (pomo.tick) clearInterval(pomo.tick); pomo.tick = null; }

function startPomoWork() {
  if (pomo.tick) return;
  pomo.mode = "work"; pomo.left = pomo.workSec; pomo.paused = false; pomo.elapsedWork = 0;
  setPomoUi();
  pomo.tick = setInterval(() => { pomo.left--; pomo.elapsedWork++; setPomoUi(); if (pomo.left <= 0) finishWork(); }, 1000);
}

function pausePomo()  { if (!pomo.tick) return; clearInterval(pomo.tick); pomo.tick = null; pomo.paused = true; setPomoUi(); }
function resumePomo() {
  if (pomo.tick || !pomo.paused) return;
  pomo.paused = false; setPomoUi();
  const isWork = pomo.mode === "work";
  pomo.tick = setInterval(() => {
    pomo.left--; if (isWork) pomo.elapsedWork++;
    setPomoUi();
    if (pomo.left <= 0) { isWork ? finishWork() : finishBreak(); }
  }, 1000);
}

async function finishWork() {
  stopTick();
  pomo.mode = "break"; pomo.left = pomo.breakSec; setPomoUi();
  const rel = $("#relationship").value;
  const pool = { brother: "歇会儿，喝口水，眼睛抬远看看。", bestie: "休息一下吧，伸个懒腰～", partner: "休息一下，我在旁边等你。", senior: "休息 5 分钟，走动一下。" };
  toast(pool[rel] || pool.bestie);
  pomo.tick = setInterval(() => { pomo.left--; setPomoUi(); if (pomo.left <= 0) finishBreak(); }, 1000);
  await api("/api/stats/event", { method: "POST", body: JSON.stringify({ type: "pomodoro_complete", focus_seconds: Math.max(0, pomo.elapsedWork || pomo.workSec) }) });
  loadToday();
  const st = await api("/api/stats/today");
  if (st.ok) { const j = await st.json(); if (j.pomodoros > 0 && j.pomodoros % 3 === 0) { const eggs = EGG[rel] || EGG.bestie; toast(eggs[Math.floor(Math.random() * eggs.length)]); } }
}

function finishBreak() {
  stopTick(); pomo.mode = "idle"; pomo.left = pomo.workSec; pomo.paused = false;
  if (pomo.focusTaskId) { /* keep focus task, ready for next round */ }
  setPomoUi();
}

function endFocus() {
  stopTick(); pomo.mode = "idle"; pomo.left = pomo.workSec; pomo.paused = false; pomo.elapsedWork = 0;
  pomo.focusTaskId = null; pomo.focusTaskName = null;
  setPomoUi();
}

/* Start focus on a specific task */
function startFocusOnTask(t) {
  if (pomo.focusTaskId === t.id && pomo.mode !== "idle") {
    toast("已在专注这个任务"); return;
  }
  /* if another focus is running, stop it first */
  if (pomo.mode !== "idle") endFocus();
  pomo.focusTaskId = t.id;
  pomo.focusTaskName = t.name;
  /* auto set task to in_progress if pending */
  if (t.status === "pending") {
    api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: "in_progress" }) }).then(() => refreshTasks());
  }
  startPomoWork();
  bubble(`开始专注：${t.name}，加油！`, "system");
}

/* Pomo UI buttons */
$("#pomoStart")?.addEventListener("click", () => {
  if (pomo.paused) { resumePomo(); return; }
  if ((pomo.mode === "work" || pomo.mode === "break") && pomo.tick) { pausePomo(); return; }
  if (pomo.mode === "idle") startPomoWork();
});

$("#pomoReset")?.addEventListener("click", () => endFocus());

/* Focus banner buttons */
$("#focusPause")?.addEventListener("click", () => {
  if (pomo.paused) resumePomo(); else if (pomo.tick) pausePomo();
});
$("#focusStop")?.addEventListener("click", () => endFocus());

/* Pomo settings */
function initPomoSettings(s) {
  const wi = $("#pomoWorkMin"), bi = $("#pomoBreakMin");
  if (wi) wi.value = s.pomodoro_work_minutes || 25;
  if (bi) bi.value = s.pomodoro_break_minutes || 5;
  wi?.addEventListener("change", () => {
    const v = Math.max(1, Math.min(120, parseInt(wi.value) || 25)); wi.value = v;
    const n = merge({ pomodoro_work_minutes: v }); writeLocal(n); syncDurations(n); saveSettings({ pomodoro_work_minutes: v });
  });
  bi?.addEventListener("change", () => {
    const v = Math.max(1, Math.min(60, parseInt(bi.value) || 5)); bi.value = v;
    const n = merge({ pomodoro_break_minutes: v }); writeLocal(n); syncDurations(n); saveSettings({ pomodoro_break_minutes: v });
  });
}

/* ═══════════════════════════════════════
   Ambient noise (Web Audio API)
   ═══════════════════════════════════════ */

const ambient = {
  ctx: null, nodes: [], playing: false,
  _ctx() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; },
  _noise(ctx, type) {
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    if (type === "brown") { let l = 0; for (let i = 0; i < n; i++) { const w = Math.random()*2-1; d[i] = (l + .02*w)/1.02; l = d[i]; d[i] *= 3.5; } }
    else if (type === "pink") { let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; for (let i=0;i<n;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=b0+b1+b2+b3+b4+b5+b6+w*.5362;d[i]*=.11;b6=w*.115926;} }
    else { for (let i = 0; i < n; i++) d[i] = Math.random()*2-1; }
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  },
  start(mood, vol) {
    this.stop(); const ctx = this._ctx(); if (ctx.state === "suspended") ctx.resume();
    const g = ctx.createGain(); g.gain.value = (vol ?? 40)/100*.5;
    const t = {focus:"brown",calm:"pink",energy:"white"}[mood]||"brown";
    const s = this._noise(ctx, t); s.connect(g).connect(ctx.destination); s.start();
    this.nodes = [s, g]; this.playing = true;
  },
  stop() { for (const n of this.nodes) { try { n.disconnect(); if (n.stop) n.stop(); } catch{} } this.nodes = []; this.playing = false; },
  setVol(v) { const g = this.nodes[1]; if (g?.gain) g.gain.value = v/100*.5; },
};

$("#musicToggle")?.addEventListener("click", () => {
  const btn = $("#musicToggle");
  if (ambient.playing) { ambient.stop(); btn.textContent = "♪"; }
  else { const c = readLocal() || defaults(); ambient.start(c.music_mood || "focus", parseInt($("#musicVolume")?.value ?? 40)); btn.textContent = "■"; }
});
$("#musicVolume")?.addEventListener("input", (e) => ambient.setVol(parseInt(e.target.value)));

/* ═══════════════════════════════════════
   Settings bindings
   ═══════════════════════════════════════ */

$("#relationship")?.addEventListener("change", (e) => {
  const n = merge({ relationship: e.target.value }); applyChrome(n); writeLocal(n); saveSettings({ relationship: e.target.value });
});

document.querySelectorAll("[data-avatar]").forEach(b => b.addEventListener("click", () => {
  const n = merge({ avatar_style: b.dataset.avatar }); applyChrome(n); writeLocal(n); saveSettings({ avatar_style: b.dataset.avatar });
}));

document.querySelectorAll("[data-music]").forEach(b => b.addEventListener("click", () => {
  const n = merge({ music_mood: b.dataset.music }); applyChrome(n); writeLocal(n); saveSettings({ music_mood: b.dataset.music });
  if (ambient.playing) { ambient.start(b.dataset.music, parseInt($("#musicVolume")?.value ?? 40)); }
}));

$("#nightToggle")?.addEventListener("click", () => {
  const cur = document.body.dataset.night === "1"; const next = !cur;
  document.body.dataset.night = next ? "1" : "0";
  writeLocal(merge({ night_mode: next })); saveSettings({ night_mode: next });
});

$("#historyRange")?.addEventListener("change", (e) => loadHistory(parseInt(e.target.value) || 7));

/* ═══════════════════════════════════════
   Init
   ═══════════════════════════════════════ */

(async function main() {
  const s = await initSettings();
  syncDurations(s);
  initPomoSettings(s);
  setPomoUi();
  greet();
  await Promise.all([refreshTasks(), refreshMemos(), loadToday(), loadHistory(7)]);
})();
