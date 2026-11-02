// Модель персонажа, формулы, вычисляемые значения. Без DOM.
window.Model = (() => {
  const FORMAT = "charforge-character";
  const LISTS = ["abilities", "skills", "stats", "resources", "rests", "spells", "attacks", "inventory", "features", "customFields"];
  const HELPERS = { floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max, abs: Math.abs, pow: Math.pow, sqrt: Math.sqrt };
  const RESERVED = new Set(["level", "prof", "score", ...Object.keys(HELPERS)]);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  const uid = () => Math.random().toString(36).slice(2, 10);
  const newId = () => Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  function slug(name, taken) {
    let s = String(name || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!s || /^\d/.test(s)) s = "x" + s;
    const base = s; let n = 2;
    while (taken.has(s) || RESERVED.has(s)) s = base + "_" + n++;
    return s;
  }
  const cleanId = v => String(v || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");

  // Пространство имён формул: abilities, abilities+"_mod", stats, зарезервированные слова.
  function formulaIds(ch, skipList, skipI) {
    const used = new Set(RESERVED);
    ch.abilities.forEach((a, k) => { if (skipList === "abilities" && k === skipI) return; used.add(a.id); used.add(a.id + "_mod"); });
    ch.stats.forEach((a, k) => { if (skipList === "stats" && k === skipI) return; used.add(a.id); });
    return used;
  }
  function idTaken(ch, list, i, s) {
    if (!/^[a-z_][a-z0-9_]*$/.test(s)) return true;
    if (list === "abilities" || list === "stats") {
      const used = formulaIds(ch, list, i);
      return used.has(s) || (list === "abilities" && used.has(s + "_mod"));
    }
    return ch[list].some((x, k) => k !== i && x.id === s);
  }

  // Безопасный вычислитель: whitelist символов, идентификаторов и без доступа к свойствам.
  function evalFormula(expr, scope) {
    expr = String(expr ?? "").trim();
    if (!expr) return 0;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (!/^[\w\s+\-*\/%().,<>=!&|?:]+$/.test(expr)) throw new Error("invalid characters");
    if (/[A-Za-z_\d]\s*\.\s*[A-Za-z_]/.test(expr)) throw new Error("property access not allowed");
    const env = Object.assign({}, HELPERS, scope);
    for (const id of expr.match(/[A-Za-z_]\w*/g) || []) if (!has(env, id)) throw new Error("unknown: " + id);
    const names = Object.keys(env).filter(k => /^[A-Za-z_]\w*$/.test(k));
    let v = new Function(...names, `"use strict"; return (${expr});`)(...names.map(k => env[k]));
    if (typeof v === "boolean") v = +v;
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("not a number");
    return Math.round(v * 1000) / 1000;
  }

  function defaultCharacter() {
    const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(n => ({ id: n.toLowerCase(), name: I18N.t("d.ab." + n.toLowerCase()), score: 10, save: false, saveBonus: 0 }));
    const SK = [["Acrobatics", "dex"], ["Animal Handling", "wis"], ["Arcana", "int"], ["Athletics", "str"], ["Deception", "cha"], ["History", "int"], ["Insight", "wis"], ["Intimidation", "cha"], ["Investigation", "int"], ["Medicine", "wis"], ["Nature", "int"], ["Perception", "wis"], ["Performance", "cha"], ["Persuasion", "cha"], ["Religion", "int"], ["Sleight of Hand", "dex"], ["Stealth", "dex"], ["Survival", "wis"]];
    return {
      format: FORMAT, version: 1, id: newId(),
      info: { name: I18N.t("d.char"), race: "", class: "", subclass: "", background: "", alignment: "", level: 1, xp: 0 },
      settings: { modFormula: "floor((score-10)/2)", profFormula: "2+floor((level-1)/4)" },
      abilities,
      skills: SK.map(([n, a]) => { const id = slug(n, new Set()); return { id, name: I18N.t("d.sk." + id), ability: a, prof: 0, bonus: 0 }; }),
      hp: { cur: 10, max: 10, temp: 0, maxFormula: "" },
      stats: [
        { id: "ac", name: I18N.t("d.st.ac"), formula: "10+dex_mod" },
        { id: "initiative", name: I18N.t("d.st.initiative"), formula: "dex_mod" },
        { id: "speed", name: I18N.t("d.st.speed"), formula: "30" },
      ],
      resources: [{ id: "mana", name: I18N.t("d.res.mana"), cur: 4, max: 0, maxFormula: "level*4+int_mod*2", color: "#5b8cff", regen: { short: "+level", long: "max" } }],
      rests: [{ id: "short", name: I18N.t("d.rest.short"), hp: "" }, { id: "long", name: I18N.t("d.rest.long"), hp: "max" }],
      spells: [], attacks: [], inventory: [], features: [], customFields: [], notes: "",
    };
  }

  function newItem(list, ch) {
    switch (list) {
      case "abilities": return { id: slug("ability", formulaIds(ch)), name: I18N.t("d.ability"), score: 10, save: false, saveBonus: 0 };
      case "stats": return { id: slug("stat", formulaIds(ch)), name: I18N.t("d.stat"), formula: "0" };
      case "skills": return { id: slug("skill", new Set(ch.skills.map(x => x.id))), name: I18N.t("d.skill"), ability: ch.abilities[0]?.id || "", prof: 0, bonus: 0 };
      case "resources": return { id: slug("resource", new Set(ch.resources.map(x => x.id))), name: I18N.t("d.resource"), cur: 0, max: 0, maxFormula: "", color: "#e0a84a", regen: {} };
      case "rests": return { id: slug("rest", new Set(ch.rests.map(x => x.id))), name: I18N.t("d.rest"), hp: "" };
      case "spells": return { id: uid(), name: I18N.t("d.spell"), level: 0, school: "", castTime: "", desc: "", prepared: true, cost: ch.resources[0] ? [{ res: ch.resources[0].id, amount: 1 }] : [] };
      case "attacks": return { id: uid(), name: I18N.t("d.attack"), bonus: "prof+str_mod", dmg: "1d6", dmgBonus: "str_mod" };
      case "inventory": return { id: uid(), name: I18N.t("d.item"), qty: 1, weight: 0, notes: "" };
      case "features": return { id: uid(), name: I18N.t("d.feature"), source: "", desc: "" };
      case "customFields": return { id: uid(), label: I18N.t("d.field"), type: "text", value: "" };
    }
    throw new Error("unknown list " + list);
  }

  // Достраивает недостающие поля у импортированных/старых файлов. Неизвестные ключи сохраняются.
  function migrate(o) {
    const d = defaultCharacter();
    for (const k of Object.keys(d)) {
      if (o[k] == null) o[k] = d[k];
      else if (!Array.isArray(d[k]) && typeof d[k] === "object")
        for (const kk of Object.keys(d[k])) if (o[k][kk] == null) o[k][kk] = d[k][kk];
    }
    for (const l of LISTS) if (!Array.isArray(o[l])) o[l] = [];
    const fid = formulaIds({ abilities: [], stats: [] });
    for (const l of ["abilities", "stats"]) o[l].forEach(it => { if (!it.id) { it.id = slug(it.name, fid); fid.add(it.id); fid.add(it.id + "_mod"); } });
    for (const l of LISTS) o[l].forEach(it => { if (!it.id) it.id = uid(); });
    o.spells.forEach(s => { s.level = Number(s.level) || 0; if (!Array.isArray(s.cost)) s.cost = []; });
    o.resources.forEach(r => { if (!r.regen || typeof r.regen !== "object") r.regen = {}; });
    o.format = FORMAT; o.version = 1;
    return o;
  }

  function compute(ch) {
    const err = {}, S = { level: Number(ch.info.level) || 0 };
    const ev = (key, expr, extra) => {
      try { return evalFormula(expr, Object.assign({}, S, extra)); }
      catch (e) { err[key] = e.message; return 0; }
    };
    S.prof = ev("prof", ch.settings.profFormula);
    ch.abilities.forEach(a => {
      const score = Number(a.score) || 0;
      S[a.id] = score;
      S[a.id + "_mod"] = ev("modFormula", ch.settings.modFormula, { score });
    });
    const stats = {};
    ch.stats.forEach(s => { S[s.id] = stats[s.id] = ev("stat:" + s.id, s.formula); });

    const skills = {}, saves = {};
    ch.skills.forEach(k => {
      const m = S[k.ability + "_mod"];
      if (m === undefined) err["skill:" + k.id] = "unknown ability";
      skills[k.id] = (m || 0) + Math.floor((Number(k.prof) || 0) * S.prof) + (Number(k.bonus) || 0);
    });
    ch.abilities.forEach(a => { saves[a.id] = S[a.id + "_mod"] + (a.save ? S.prof : 0) + (Number(a.saveBonus) || 0); });

    const hpMax = String(ch.hp.maxFormula || "").trim() ? ev("hpmax", ch.hp.maxFormula) : Number(ch.hp.max) || 0;
    const resMax = {};
    ch.resources.forEach(r => { resMax[r.id] = String(r.maxFormula || "").trim() ? ev("rmax:" + r.id, r.maxFormula) : Number(r.max) || 0; });

    const atk = {}, dmg = {};
    ch.attacks.forEach(a => {
      atk[a.id] = ev("atk:" + a.id, a.bonus);
      const b = ev("atkd:" + a.id, a.dmgBonus);
      dmg[a.id] = `${a.dmg || ""}${b ? (b > 0 ? "+" : "") + b : ""}`;
    });
    const weight = ch.inventory.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.weight) || 0), 0);
    return { S, prof: S.prof, stats, skills, saves, hpMax, resMax, atk, dmg, weight: Math.round(weight * 100) / 100, err };
  }

  return { FORMAT, uid, newId, slug, cleanId, idTaken, evalFormula, defaultCharacter, newItem, migrate, compute };
})();
