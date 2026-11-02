// Мост JS -> Python. В pywebview функции, зарегистрированные через
// register_api_function, доступны как window.pywebview.api.<name>().
// Без pywebview (открыт в браузере) включается localStorage-мок для отладки UI.
window.__showErr = msg => {
  let el = document.getElementById("err");
  if (!el) {
    el = document.createElement("pre"); el.id = "err";
    el.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;max-height:40vh;overflow:auto;background:#2a1816;border:1px solid #d1604d;padding:10px;z-index:99;white-space:pre-wrap;font:12px monospace;color:#e8e4d8";
    (document.body || document.documentElement).appendChild(el);
  }
  el.textContent += msg + "\n";
};
window.addEventListener("error", e => window.__showErr("JS error: " + e.message + " (" + (e.filename || "").split("/").pop() + ":" + e.lineno + ")"));
window.addEventListener("unhandledrejection", e => window.__showErr("Promise error: " + (e.reason && e.reason.message || e.reason)));

window.Api = (() => {
  // JS -> Python: fire-and-forget через диспетчер window.pywebview.api.call(name, [args]).
  // Ответы Python присылает сам: InterfaceApi.call("Chars.setList" | "Chars.loaded" | "UI.toast", payload).
  // Вне pywebview (обычный браузер) работает localStorage-мок с теми же колбэками.
  const KEY = "charforge:mock";
  let mode = null;
  const ready = new Promise(resolve => {
    const done = () => { mode = "py"; resolve(); };
    if (window.pywebview && window.pywebview.api) return done();
    window.addEventListener("pywebviewready", done, { once: true });
    setTimeout(() => { if (!mode) { mode = "mock"; resolve(); } }, 1500);
  });

  const db = () => JSON.parse(localStorage.getItem(KEY) || "{}");
  const put = d => localStorage.setItem(KEY, JSON.stringify(d));
  const summary = c => ({ id: c.id, name: c.info.name, race: c.info.race, cls: c.info.class, level: c.info.level });
  const mock = {
    list_characters: () => window.Chars.setList({ items: Object.values(db()).map(summary) }),
    load_character: (id, purpose) => window.Chars.loaded({ id, raw: db()[id] ? JSON.stringify(db()[id]) : null, purpose }),
    save_character: (id, raw, after) => {
      const d = db(); d[id] = JSON.parse(raw); put(d);
      if (after === "list") mock.list_characters(); else if (after === "open") mock.load_character(id, "open");
    },
    delete_character: id => { const d = db(); delete d[id]; put(d); mock.list_characters(); },
    import_characters: raws => { const d = db(); raws.forEach(r => { const c = JSON.parse(r); d[c.id] = c; }); put(d); mock.list_characters(); },
    load_settings: () => window.App.setSettings({ settings: JSON.parse(localStorage.getItem(KEY + ":settings") || "{}") }),
    save_settings: raw => localStorage.setItem(KEY + ":settings", raw),
    export_character: (name, raw) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      a.download = (name || "character") + ".json"; a.click();
    },
  };

  function send(name, ...args) {
    ready.then(() => {
      if (mode === "py") {
        const disp = window.pywebview.api.call;
        if (typeof disp !== "function") throw new Error("pywebview.api.call missing. Available: " + Object.keys(window.pywebview.api).join(", "));
        return disp.call(window.pywebview.api, name, args);
      }
      if (mock[name]) mock[name](...args);
    }).catch(e => window.__showErr("Api." + name + ": " + (e && e.message || e)));
  }
  return { send, win: action => send(action) };
})();
