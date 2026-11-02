(() => {
"use strict";
const t = (k, v) => I18N.t(k, v);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const sg = v => (v >= 0 ? "+" : "") + v;
const getp = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setp = (o, p, v) => { const ks = p.split("."), last = ks.pop(); let x = o; for (const k of ks) { if (x[k] == null) x[k] = {}; x = x[k]; } x[last] = v; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const A = { view: "list", chars: [], ch: null, c: null, tab: "sheet", open: new Set(), fold: {}, log: [], filter: "", saveT: null, gotList: false, listAsked: false };
let main;
const foldOpen = (name, def) => (name in A.fold ? A.fold[name] : def);

window.UI = {
  _t: null,
  toast(msg) {
    if (msg && typeof msg === "object") msg = t(msg.key, msg.vars);
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(UI._t); UI._t = setTimeout(() => el.classList.remove("show"), 2600);
  },
};

const confirmDlg = (title, body, ok) => new Promise(res => {
  const ov = $("#modal-overlay");
  $("#modal-title").textContent = title; $("#modal-body").textContent = body; $("#modal-confirm").textContent = ok; ov.hidden = false;
  const done = v => { ov.hidden = true; $("#modal-confirm").onclick = $("#modal-cancel").onclick = null; res(v); };
  $("#modal-confirm").onclick = () => done(true); $("#modal-cancel").onclick = () => done(false);
});

/* ---------- field builders ---------- */
const T = (p, cls = "", x = "") => `<input class="in ${cls}" data-path="${p}" value="${esc(getp(A.ch, p))}" ${x}>`;
const N = (p, cls = "", x = "") => `<input class="in num ${cls}" type="number" step="any" data-t="n" data-path="${p}" value="${esc(getp(A.ch, p))}" ${x}>`;
const C = (p, x = "") => `<input type="checkbox" data-t="b" data-path="${p}" ${getp(A.ch, p) ? "checked" : ""} ${x}>`;
const TA = (p, cls = "", x = "") => `<textarea class="in ${cls}" data-path="${p}" ${x}>${esc(getp(A.ch, p))}</textarea>`;
const SEL = (p, opts, ty = "s", cls = "", x = "") => `<select class="in ${cls}" data-t="${ty}" data-path="${p}" ${x}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(getp(A.ch, p)) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const lab = (l, h, cls = "") => `<label class="lab ${cls}"><span>${l}</span>${h}</label>`;
const ph = (key, path, cls = "") => T(path, cls, `placeholder="${esc(t(key))}" title="${esc(t(key))}"`);
const ctl = (list, i, n) => `<span class="ctl"><button class="ib" data-act="up" data-list="${list}" data-i="${i}" ${i === 0 ? "disabled" : ""} title="${esc(t("move_up"))}">▲</button><button class="ib" data-act="down" data-list="${list}" data-i="${i}" ${i === n - 1 ? "disabled" : ""} title="${esc(t("move_down"))}">▼</button><button class="ib danger" data-act="del" data-list="${list}" data-i="${i}" title="${esc(t("remove"))}">✕</button></span>`;
const idIn = (list, i, id) => `<input class="in idin" data-t="id" data-path="${list}.${i}.id" value="${esc(id)}" title="${esc(t("formula_id"))}">`;
const fold = (name, title, body, def = false, extra = "") => `<details class="fold" data-fold="${name}" ${foldOpen(name, def) ? "open" : ""}><summary><span class="fold-t">${title}</span>${extra}<span class="chev"></span></summary><div class="fold-b">${body}</div></details>`;
const addBtn = list => `<button class="btn sm" data-act="add" data-list="${list}">${t("add")}</button>`;

/* ---------- derived values ---------- */
function rawNum(k) {
  const c = A.c, [ty, id] = k.split(":");
  switch (ty) {
    case "mod": return c.S[id + "_mod"] ?? 0;
    case "skill": return c.skills[id] ?? 0;
    case "save": return c.saves[id] ?? 0;
    case "atk": return c.atk[id] ?? 0;
  }
  return 0;
}
function outValue(k) {
  const c = A.c, [ty, id] = k.split(":");
  switch (ty) {
    case "prof": return sg(c.prof);
    case "mod": case "skill": case "save": case "atk": return sg(rawNum(k));
    case "stat": return c.stats[id] ?? 0;
    case "hpmax": return c.hpMax;
    case "rmax": return c.resMax[id] ?? 0;
    case "dmg": return c.dmg[id] ?? "";
    case "weight": return c.weight;
  }
  return "";
}
function refreshDerived() {
  const c = A.c; if (!c) return;
  $$("[data-out]").forEach(el => { el.textContent = outValue(el.dataset.out); });
  $$("[data-bar]").forEach(el => {
    const [ty, id] = el.dataset.bar.split(":"); let cur, max;
    if (ty === "hp") { cur = A.ch.hp.cur; max = c.hpMax; }
    else { const r = A.ch.resources.find(r => r.id === id); cur = r ? r.cur : 0; max = c.resMax[id] || 0; }
    el.style.width = (max > 0 ? clamp(cur / max * 100, 0, 100) : 0) + "%";
  });
  $$("[data-ek]").forEach(el => { const e = c.err[el.dataset.ek]; el.classList.toggle("bad", !!e); el.title = e || ""; });
}

/* ---------- persistence: Python пушит результаты в window.Chars / window.App ---------- */
function touch() { A.c = Model.compute(A.ch); refreshDerived(); scheduleSave(); }
function saveNow(after = "") {
  clearTimeout(A.saveT); A.saveT = null;
  Api.send("save_character", A.ch.id, JSON.stringify(A.ch), after);
  $("#save-state").textContent = t("saved");
}
function scheduleSave() { clearTimeout(A.saveT); $("#save-state").textContent = t("saving"); A.saveT = setTimeout(() => saveNow(), 400); }
function showList() {
  if (A.ch && A.saveT) return saveNow("list");
  Api.send("list_characters");
}
const openChar = id => Api.send("load_character", id, "open");
function newChar() { const ch = Model.defaultCharacter(); Api.send("save_character", ch.id, JSON.stringify(ch), "open"); }
const exportChar = ch => Api.send("export_character", (ch.info && ch.info.name) || "character", JSON.stringify(ch, null, 2));

window.Chars = {
  setList(p) {
    A.gotList = true; A.chars = (p && p.items) || []; A.view = "list"; A.ch = A.c = null;
    $("#save-state").textContent = ""; render();
  },
  loaded(p) {
    if (!p || !p.raw) return UI.toast(t("load_fail"));
    let obj;
    try { obj = Model.migrate(JSON.parse(p.raw)); } catch (e) { return UI.toast(t("broken_file", { e: e.message })); }
    obj.id = p.id;
    if (p.purpose === "open") { A.ch = obj; A.c = Model.compute(obj); A.view = "sheet"; A.tab = "sheet"; render(); }
    else if (p.purpose === "dup") { obj.id = Model.newId(); obj.info.name += " (copy)"; Api.send("save_character", obj.id, JSON.stringify(obj), "list"); }
    else if (p.purpose === "export") exportChar(obj);
  },
};
window.App = {
  setSettings(p) {
    const s = (p && p.settings) || {};
    if (s.lang) I18N.set(s.lang);
    syncLang();
    if (!A.listAsked) { A.listAsked = true; Api.send("list_characters"); }
  },
};
function syncLang() {
  document.documentElement.lang = I18N.lang;
  $$("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang === I18N.lang));
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  if (A.gotList || A.ch) render();
}
function setLang(l) {
  I18N.set(l); Api.send("save_settings", JSON.stringify({ lang: l })); syncLang();
}

/* ---------- views ---------- */
function render() {
  const top = main.scrollTop;
  main.innerHTML = A.view === "list" ? listView() : sheetView();
  main.scrollTop = top;
  refreshDerived(); applyFilter();
}

const listView = () => `
<div class="list-head"><h1>${t("characters")}</h1>
  <div class="row gap"><button class="btn primary" data-act="new">${t("new_char")}</button><button class="btn" data-act="import">${t("import")}</button></div></div>
${A.chars.length ? `<div class="cards">${A.chars.map(c => `
  <div class="card" data-act="open" data-id="${c.id}">
    <div class="card-name">${esc(c.name || t("unnamed"))}</div>
    <div class="muted">${esc([c.race, c.cls].filter(Boolean).join(" ") || t("no_rc"))}, ${t("lvl")} ${esc(c.level)}</div>
    <div class="card-actions">
      <button class="btn sm quiet" data-act="dup" data-id="${c.id}">${t("duplicate")}</button>
      <button class="btn sm quiet" data-act="export-id" data-id="${c.id}">${t("export")}</button>
      <button class="btn sm quiet danger" data-act="delete" data-id="${c.id}" data-name="${esc(c.name)}">${t("delete")}</button>
    </div></div>`).join("")}</div>` : `<div class="empty">${t("no_chars")}</div>`}`;

const TABS = [["sheet", "tab.sheet"], ["spells", "tab.spells"], ["inventory", "tab.inv"], ["features", "tab.feat"], ["notes", "tab.notes"], ["config", "tab.cfg"]];
function sheetView() {
  const body = { sheet: tabSheet, spells: tabSpells, inventory: tabInventory, features: tabFeatures, notes: () => TA("notes", "notes-ta"), config: tabConfig }[A.tab]();
  return `
<div class="sheet-head">
  <button class="btn sm quiet" data-act="back">‹ ${t("back")}</button>
  ${T("info.name", "name-in")}
  <div class="meta">
    ${ph("ph.race", "info.race")}${ph("ph.class", "info.class")}${ph("ph.subclass", "info.subclass")}${ph("ph.bg", "info.background")}${ph("ph.align", "info.alignment")}
    <span class="tagged">${t("level")}${N("info.level")}</span><span class="tagged">${t("xp")}${N("info.xp")}</span>
  </div>
  <button class="btn sm" data-act="export-cur">${t("export_json")}</button>
</div>
<nav class="tabs">${TABS.map(([k, l]) => `<button class="tab ${A.tab === k ? "active" : ""}" data-act="tab" data-id="${k}">${t(l)}</button>`).join("")}</nav>
<div>${body}</div>`;
}

function tabSheet() {
  const ch = A.ch;
  const abil = ch.abilities.map((a, i) => `
    <div class="abil"><span class="abil-n">${esc(a.name)}</span>
      <button class="mod" data-roll="mod:${a.id}" data-label="${esc(t("check_suffix", { n: a.name }))}" data-out="mod:${a.id}"></button>
      ${N(`abilities.${i}.score`, "ghost score")}</div>`).join("");
  const saves = ch.abilities.map((a, i) => `
    <div class="line">${C(`abilities.${i}.save`, 'class="dotbox"')}<span class="grow">${esc(a.name)}</span>${N(`abilities.${i}.saveBonus`, "ghost xs", `title="${esc(t("extra_bonus"))}"`)}
    <button class="val" data-roll="save:${a.id}" data-label="${esc(t("save_suffix", { n: a.name }))}" data-out="save:${a.id}"></button></div>`).join("");
  const skills = ch.skills.map((k, i) => {
    const ab = ch.abilities.find(a => a.id === k.ability);
    return `<div class="line"><button class="prof" data-p="${Number(k.prof) || 0}" data-act="cycle" data-i="${i}"></button>
    <span class="grow">${esc(k.name)}<em>${esc(ab ? ab.name : "?")}</em></span>${N(`skills.${i}.bonus`, "ghost xs", `title="${esc(t("extra_bonus"))}"`)}
    <button class="val" data-roll="skill:${k.id}" data-label="${esc(k.name)}" data-out="skill:${k.id}" data-ek="skill:${k.id}"></button></div>`;
  }).join("");
  const stats = ch.stats.map(s => `<div class="stat"><b data-out="stat:${s.id}" data-ek="stat:${s.id}"></b><span>${esc(s.name)}</span></div>`).join("");
  const res = ch.resources.map((r, i) => `
    <div class="res"><div class="res-top"><span>${esc(r.name)}</span>
      <span class="row gap"><button class="ib" data-act="res" data-i="${i}" data-d="-1">−</button>${N(`resources.${i}.cur`, "ghost")}<span class="muted">/ <span data-out="rmax:${r.id}"></span></span><button class="ib" data-act="res" data-i="${i}" data-d="1">+</button></span></div>
      <div class="bar"><i data-bar="res:${r.id}" style="background:${esc(r.color)}"></i></div></div>`).join("") || `<div class="muted">${t("no_res")}</div>`;
  const rests = ch.rests.map(r => `<button class="btn sm" data-act="rest" data-id="${r.id}">${esc(r.name)}</button>`).join("");
  const atks = ch.attacks.map((a, i) => `
    <details class="atk" data-fold="atk:${a.id}" ${foldOpen("atk:" + a.id, false) ? "open" : ""}>
      <summary><span class="grow">${esc(a.name)}</span><b class="dmg" data-out="dmg:${a.id}"></b>
        <button class="val" data-roll="atk:${a.id}" data-label="${esc(t("attack_suffix", { n: a.name }))}" data-out="atk:${a.id}" data-ek="atk:${a.id}"></button></summary>
      <div class="atk-b">
        <div class="full">${lab(t("name"), T(`attacks.${i}.name`, "", "data-r"))}</div>
        ${lab(t("to_hit"), T(`attacks.${i}.bonus`, "mono", `data-ek="atk:${a.id}"`))}${lab(t("dmg_dice"), T(`attacks.${i}.dmg`, "mono", 'placeholder="1d8"'))}
        <div class="full">${lab(t("dmg_bonus"), T(`attacks.${i}.dmgBonus`, "mono", `data-ek="atkd:${a.id}"`))}</div>
        <div class="full row"><span class="grow"></span><button class="btn sm quiet danger" data-act="del" data-list="attacks" data-i="${i}">${t("delete")}</button></div>
      </div></details>`).join("");
  const custom = ch.customFields.map((f, i) => lab(esc(f.label), f.type === "check" ? C(`customFields.${i}.value`) : f.type === "number" ? N(`customFields.${i}.value`) : T(`customFields.${i}.value`))).join("");

  return `<div class="cols">
  <div>
    <div class="panel"><div class="abils">${abil}</div></div>
    ${fold("saves", t("saves"), saves, false)}
    ${fold("skills", t("skills"), `<div class="hint">${t("skills_hint")}</div>${skills}`, true)}
  </div>
  <div>
    <div class="panel"><div class="hp-top"><div class="hp-main">${N("hp.cur", "hp-cur ghost")}<span class="muted">/</span><b data-out="hpmax" data-ek="hpmax"></b></div>
      <label class="temp">${t("temp")}${N("hp.temp", "ghost sm")}</label></div>
      <div class="bar"><i data-bar="hp"></i></div>
      <div class="row gap"><input id="hp-amt" class="in num sm" type="number" value="1" min="0"><button class="btn sm danger" data-act="dmg">${t("damage")}</button><button class="btn sm" data-act="heal">${t("heal")}</button></div></div>
    <div class="panel"><div class="stats">${stats}</div><div class="line"><span class="muted grow">${t("prof_bonus")}</span><b data-out="prof" data-ek="prof"></b></div></div>
    <div class="panel"><h3>${t("resources")}</h3>${res}<div class="rests">${rests}</div></div>
    <div class="panel"><div class="panel-h"><h3>${t("attacks")}</h3>${addBtn("attacks")}</div>${atks || `<div class="muted">${t("no_atk")}</div>`}</div>
  </div>
  <div>
    <div class="panel"><h3>${t("dice")}</h3>
      <div class="row gap"><input id="dice-in" class="in" value="1d20" placeholder="2d6+3"><button class="btn sm primary" data-act="dice">${t("roll")}</button></div>
      <div class="log" id="roll-log">${A.log.map(l => `<div>${esc(l)}</div>`).join("")}</div></div>
    ${custom ? `<div class="panel"><h3>${t("custom")}</h3>${custom}</div>` : ""}
  </div></div>`;
}

const costTxt = s => (s.cost || []).map(c => { const r = A.ch.resources.find(r => r.id === c.res); return `${c.amount} ${r ? r.name : "?"}`; }).join(", ") || t("free");
function spellCard(s, i) {
  const ch = A.ch, resOpts = ch.resources.map(r => [r.id, r.name]);
  const costs = s.cost.map((c, j) => `<div class="cost-row">${SEL(`spells.${i}.cost.${j}.res`, resOpts, "s", "", "data-r")}${N(`spells.${i}.cost.${j}.amount`, "sm", "data-r")}<button class="ib danger" data-act="del-cost" data-i="${i}" data-j="${j}">✕</button></div>`).join("");
  return `<details class="spell ${s.prepared ? "" : "off"}" data-sid="${s.id}" data-name="${esc((s.name + " " + s.school).toLowerCase())}" ${A.open.has(s.id) ? "open" : ""}>
  <summary><span class="s-name">${esc(s.name)}</span><span class="muted">${esc(s.school)}</span><span class="chip">${esc(costTxt(s))}</span><button class="btn sm primary" data-act="cast" data-i="${i}">${t("cast")}</button></summary>
  <div class="spell-body">
    <div class="grid2">${lab(t("name"), T(`spells.${i}.name`, "", "data-r"))}${lab(t("level"), N(`spells.${i}.level`, "", "data-r"))}${lab(t("school"), T(`spells.${i}.school`, "", "data-r"))}${lab(t("cast_time"), T(`spells.${i}.castTime`))}</div>
    <div><div class="hint">${t("cost")}</div>${costs}<button class="btn sm" data-act="add-cost" data-i="${i}" ${ch.resources.length ? "" : "disabled"}>${t("add_cost")}</button></div>
    ${TA(`spells.${i}.desc`, "", `placeholder="${esc(t("desc"))}"`)}
    <div class="row gap"><label class="row gap">${C(`spells.${i}.prepared`, 'class="dotbox" data-r')}${t("prepared")}</label><span class="grow"></span><button class="btn sm quiet danger" data-act="del" data-list="spells" data-i="${i}">${t("delete_spell")}</button></div>
  </div></details>`;
}
function tabSpells() {
  const sp = A.ch.spells, idx = sp.map((_, i) => i).sort((a, b) => sp[a].level - sp[b].level || a - b);
  let h = `<div class="toolbar"><input id="spell-filter" class="in" style="max-width:320px" placeholder="${esc(t("filter_ph"))}" value="${esc(A.filter)}"><button class="btn primary" data-act="add" data-list="spells">${t("add_spell")}</button></div>`;
  if (!idx.length) return h + `<div class="empty">${t("no_spells")}</div>`;
  let last = null;
  for (const i of idx) {
    if (sp[i].level !== last) { if (last !== null) h += "</div>"; last = sp[i].level; h += `<h3 class="grp">${last === 0 ? t("lvl0") : t("lvl_n", { n: last })}</h3><div>`; }
    h += spellCard(sp[i], i);
  }
  return h + "</div>";
}
const applyFilter = () => { const q = A.filter.trim().toLowerCase(); $$(".spell").forEach(el => el.classList.toggle("hidden", !!q && !el.dataset.name.includes(q))); };

function tabInventory() {
  const inv = A.ch.inventory;
  const rows = inv.map((it, i) => `<tr><td>${T(`inventory.${i}.name`, "ghost")}</td><td>${N(`inventory.${i}.qty`, "ghost xs")}</td><td>${N(`inventory.${i}.weight`, "ghost xs")}</td><td>${T(`inventory.${i}.notes`, "ghost")}</td><td>${ctl("inventory", i, inv.length)}</td></tr>`).join("");
  return `<div class="toolbar"><span class="muted">${t("total_weight")}: <b data-out="weight"></b></span><button class="btn primary" data-act="add" data-list="inventory">${t("add_item")}</button></div>
  ${rows ? `<table class="tbl"><thead><tr><th>${t("name")}</th><th>${t("qty")}</th><th>${t("weight")}</th><th>${t("notes")}</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty">${t("empty_inv")}</div>`}`;
}
function tabFeatures() {
  const f = A.ch.features.map((x, i) => `<div class="panel"><div class="row gap">${T(`features.${i}.name`)}${ph("source", `features.${i}.source`)}${ctl("features", i, A.ch.features.length)}</div><div style="height:8px"></div>${TA(`features.${i}.desc`, "", `placeholder="${esc(t("desc"))}"`)}</div>`).join("");
  return `<div class="toolbar"><span></span><button class="btn primary" data-act="add" data-list="features">${t("add_feature")}</button></div>${f || `<div class="empty">${t("no_feat")}</div>`}`;
}

function tabConfig() {
  const ch = A.ch, n = k => ch[k].length;
  const vars = [...ch.abilities.flatMap(a => [a.id, a.id + "_mod"]), ...ch.stats.map(s => s.id)];
  const abilOpts = ch.abilities.map(a => [a.id, a.name]);
  const sec = (name, title, list, rows) => fold("cfg:" + name, `${title} <span class="muted">${ch[list] ? ch[list].length : ""}</span>`, rows || `<div class="muted">${t("empty")}</div>`, false, addBtn(list));
  return `<div class="cfg">
  ${fold("cfg:formulas", t("formulas"), `
    <div class="rowc">${lab(t("mod_formula"), T("settings.modFormula", "mono", 'data-ek="modFormula"'), "wide")}${lab(t("prof_formula"), T("settings.profFormula", "mono", 'data-ek="prof"'), "wide")}</div>
    <div class="rowc">${lab(t("maxhp_formula"), T("hp.maxFormula", "mono", 'data-ek="hpmax"'), "wide")}${lab(t("maxhp_static"), N("hp.max"))}</div>
    <div class="hint" style="margin-top:8px">${t("vars_hint", { vars: vars.map(v => "<code>" + esc(v) + "</code>").join(" ") })}</div>`, true)}
  ${sec("abilities", t("abilities"), "abilities", ch.abilities.map((a, i) => `<div class="rowc">${idIn("abilities", i, a.id)}${T(`abilities.${i}.name`, "", "data-r")}${ctl("abilities", i, n("abilities"))}</div>`).join(""))}
  ${sec("stats", t("stats"), "stats", ch.stats.map((s, i) => `<div class="rowc">${idIn("stats", i, s.id)}${T(`stats.${i}.name`, "", "data-r")}${T(`stats.${i}.formula`, "mono", `data-ek="stat:${s.id}" placeholder="${esc(t("formula"))}"`)}${ctl("stats", i, n("stats"))}</div>`).join(""))}
  ${sec("resources", t("resources_cfg"), "resources", ch.resources.map((r, i) => `<div class="rowc">
    ${idIn("resources", i, r.id)}${T(`resources.${i}.name`, "", "data-r")}<input type="color" data-t="s" data-path="resources.${i}.color" data-r value="${esc(r.color)}" title="${esc(t("color"))}">
    ${lab(t("max_formula"), T(`resources.${i}.maxFormula`, "mono", `data-ek="rmax:${r.id}"`), "wide")}${lab(t("static_max"), N(`resources.${i}.max`, "sm"))}${ctl("resources", i, n("resources"))}
    <details class="sub"><summary>${t("rest_rules")}</summary><div class="hint">${t("rest_hint")}</div><div class="rowc">${ch.rests.map(x => lab(esc(t("on_rest", { name: x.name })), T(`resources.${i}.regen.${x.id}`, "mono sm", 'placeholder="max, +N, =N"'))).join("")}</div></details></div>`).join(""))}
  ${sec("rests", t("rests"), "rests", ch.rests.map((r, i) => `<div class="rowc">${idIn("rests", i, r.id)}${T(`rests.${i}.name`, "", "data-r")}${lab(t("hp_rule"), T(`rests.${i}.hp`, "mono", 'placeholder="max, +N, =N"'))}${ctl("rests", i, n("rests"))}</div>`).join(""))}
  ${sec("skills", t("skills_cfg"), "skills", ch.skills.map((k, i) => `<div class="rowc"><code style="width:112px">${esc(k.id)}</code>${T(`skills.${i}.name`, "", "data-r")}${SEL(`skills.${i}.ability`, abilOpts, "s", "", "data-r")}${ctl("skills", i, n("skills"))}</div>`).join(""))}
  ${sec("custom", t("custom_cfg"), "customFields", ch.customFields.map((f, i) => `<div class="rowc">${T(`customFields.${i}.label`, "", "data-r")}${SEL(`customFields.${i}.type`, [["text", t("type_text")], ["number", t("type_number")], ["check", t("type_check")]], "s", "", "data-r")}${ctl("customFields", i, n("customFields"))}</div>`).join(""))}
  </div>`;
}

/* ---------- field events ---------- */
function renameId(list, i, raw) {
  const cur = A.ch[list][i], s = Model.cleanId(raw);
  if (s === cur.id) return;
  if (Model.idTaken(A.ch, list, i, s)) return UI.toast(t("bad_id"));
  const old = cur.id; cur.id = s;
  if (list === "abilities") A.ch.skills.forEach(k => { if (k.ability === old) k.ability = s; });
  if (list === "resources") A.ch.spells.forEach(sp => sp.cost.forEach(c => { if (c.res === old) c.res = s; }));
  if (list === "rests") A.ch.resources.forEach(r => { if (old in r.regen) { r.regen[s] = r.regen[old]; delete r.regen[old]; } });
}
function onField(e) {
  const el = e.target;
  if (el.id === "spell-filter") { A.filter = el.value; return applyFilter(); }
  if (!el.dataset || !el.dataset.path || !A.ch) return;
  const ty = el.dataset.t || "s";
  if (ty === "id") {
    if (e.type !== "change") return;
    const [list, i] = el.dataset.path.split(".");
    renameId(list, +i, el.value); touch(); return render();
  }
  let v = ty === "b" ? el.checked : ty === "n" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
  if (ty === "n" && !Number.isFinite(v)) v = 0;
  setp(A.ch, el.dataset.path, v);
  touch();
  if (e.type === "change" && el.dataset.r !== undefined) render();
}

/* ---------- game actions ---------- */
function pushLog(msg) {
  A.log.unshift(msg); A.log.length = Math.min(A.log.length, 10);
  const el = $("#roll-log"); if (el) el.innerHTML = A.log.map(l => `<div>${esc(l)}</div>`).join("");
}
function doRoll(key, label) {
  const b = Number(rawNum(key)) || 0, d = 1 + Math.floor(Math.random() * 20);
  const msg = `${label || key}: d20(${d}) ${sg(b)} = ${d + b}${d === 20 ? " (" + t("natural20") + ")" : d === 1 ? " (" + t("natural1") + ")" : ""}`;
  pushLog(msg); UI.toast(msg);
}
function rollDice(expr) {
  const m = /^\s*(\d*)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(expr);
  if (!m) return UI.toast(t("dice_fmt"));
  const n = clamp(+m[1] || 1, 1, 100), sides = clamp(+m[2], 2, 1000), bonus = m[3] ? (m[3] === "-" ? -1 : 1) * +m[4] : 0;
  const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
  const msg = `${n}d${sides}${bonus ? sg(bonus) : ""}: [${rolls.join(", ")}]${bonus ? " " + sg(bonus) : ""} = ${rolls.reduce((a, b) => a + b, 0) + bonus}`;
  pushLog(msg); UI.toast(msg);
}
function cast(i) {
  const ch = A.ch, s = ch.spells[i], need = s.cost || [];
  for (const c of need) {
    const r = ch.resources.find(r => r.id === c.res);
    if (!r) return UI.toast(t("res_missing", { n: s.name }));
    if (r.cur < c.amount) return UI.toast(t("not_enough", { r: r.name, cur: r.cur, need: c.amount }));
  }
  need.forEach(c => { ch.resources.find(r => r.id === c.res).cur -= Number(c.amount) || 0; });
  pushLog(`${t("cast_done", { n: s.name })} (${costTxt(s)})`); touch(); render(); UI.toast(t("cast_done", { n: s.name }));
}
function applyRest(r) {
  if (!r) return;
  const ch = A.ch, c = A.c, sc = c.S;
  const calc = (cur, max, rule) => {
    rule = String(rule ?? "").trim();
    if (!rule) return cur;
    const v = rule === "max" ? max : rule[0] === "=" ? Model.evalFormula(rule.slice(1), sc) : cur + Model.evalFormula(rule, sc);
    return clamp(Math.floor(v), 0, max);
  };
  try {
    const next = ch.resources.map(res => calc(res.cur, c.resMax[res.id], res.regen && res.regen[r.id]));
    const hp = calc(ch.hp.cur, c.hpMax, r.hp);
    ch.resources.forEach((res, i) => { res.cur = next[i]; }); ch.hp.cur = hp;
  } catch (e) { return UI.toast(t("rule_error", { e: e.message })); }
  pushLog(t("rest_done", { n: r.name })); touch(); render(); UI.toast(t("rest_done", { n: r.name }));
}
function hpChange(sign) {
  const amt = Math.max(0, Math.floor(Number($("#hp-amt").value) || 0)), hp = A.ch.hp;
  if (sign < 0) { const x = Math.min(hp.temp || 0, amt); hp.temp -= x; hp.cur = Math.max(0, hp.cur - (amt - x)); }
  else hp.cur = Math.min(A.c.hpMax > 0 ? A.c.hpMax : Infinity, hp.cur + amt);
  touch(); render();
}

/* ---------- click dispatch ---------- */
async function onClick(e) {
  if (e.target.closest("summary") && e.target.closest("button")) e.preventDefault();
  const roll = e.target.closest("[data-roll]");
  if (roll) return doRoll(roll.dataset.roll, roll.dataset.label);
  const el = e.target.closest("[data-act]"); if (!el) return;
  const d = el.dataset, ch = A.ch;
  const move = (list, i, dir) => { const a = ch[list], j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; };
  switch (d.act) {
    case "new": return newChar();
    case "import": return $("#file-import").click();
    case "open": return openChar(d.id);
    case "back": return showList();
    case "dup": return Api.send("load_character", d.id, "dup");
    case "export-id": return Api.send("load_character", d.id, "export");
    case "delete":
      if (await confirmDlg(t("del_title"), t("del_body", { n: d.name || t("unnamed") }), t("delete"))) Api.send("delete_character", d.id);
      return;
    case "export-cur": return exportChar(ch);
    case "tab": A.tab = d.id; return render();
    case "add": ch[d.list].push(Model.newItem(d.list, ch)); touch(); return render();
    case "del": ch[d.list].splice(+d.i, 1); touch(); return render();
    case "up": move(d.list, +d.i, -1); touch(); return render();
    case "down": move(d.list, +d.i, 1); touch(); return render();
    case "cycle": { const vals = [0, 0.5, 1, 2], k = ch.skills[+d.i]; k.prof = vals[(vals.indexOf(Number(k.prof)) + 1) % vals.length]; touch(); return render(); }
    case "add-cost": ch.spells[+d.i].cost.push({ res: ch.resources[0]?.id || "", amount: 1 }); touch(); return render();
    case "del-cost": ch.spells[+d.i].cost.splice(+d.j, 1); touch(); return render();
    case "res": { const r = ch.resources[+d.i]; r.cur = clamp((Number(r.cur) || 0) + Number(d.d), 0, A.c.resMax[r.id] ?? Infinity); touch(); return render(); }
    case "dmg": return hpChange(-1);
    case "heal": return hpChange(1);
    case "cast": return cast(+d.i);
    case "rest": return applyRest(ch.rests.find(r => r.id === d.id));
    case "dice": return rollDice($("#dice-in").value);
  }
}

async function onImport(e) {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const obj = JSON.parse(await f.text()), items = Array.isArray(obj) ? obj : [obj], raws = [];
    for (const o of items) {
      if (!o || typeof o !== "object" || !o.info) throw new Error(t("not_char"));
      const ch = Model.migrate(o); ch.id = Model.newId(); raws.push(JSON.stringify(ch));
    }
    Api.send("import_characters", raws); UI.toast(t("imported", { n: raws.length }));
  } catch (err) { UI.toast(t("import_fail", { e: err.message })); }
}

function init() {
  main = $("#main");
  $("#btn-close").onclick = () => { if (A.ch && A.saveT) { saveNow(); setTimeout(() => Api.win("close"), 200); } else Api.win("close"); };
  $("#btn-minimize").onclick = () => Api.win("minimize");
  $("#btn-maximize").onclick = () => Api.win("maximize");
  $("#titlebar").addEventListener("click", e => { const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang); });
  main.addEventListener("input", onField);
  main.addEventListener("change", onField);
  main.addEventListener("click", onClick);
  main.addEventListener("toggle", e => {
    const d = e.target; if (!d.dataset) return;
    if (d.dataset.sid) (d.open ? A.open.add(d.dataset.sid) : A.open.delete(d.dataset.sid));
    if (d.dataset.fold) A.fold[d.dataset.fold] = d.open;
  }, true);
  $("#file-import").addEventListener("change", onImport);
  window.addEventListener("beforeunload", () => { if (A.saveT && A.ch) saveNow(); });
  syncLang();
  Api.send("load_settings");
  setTimeout(() => { if (!A.listAsked) { A.listAsked = true; Api.send("list_characters"); } }, 1500);
  setTimeout(() => { if (!A.gotList) window.__showErr("Python did not answer list_characters: Chars.setList was never called"); }, 6000);
}
let tries = 0;
function boot() {
  if ($("#main") && $("#btn-close")) return init();
  if (++tries > 200) return window.__showErr("UI markup not found: #main missing");
  setTimeout(boot, 50);
}
boot();
})();
