import {
  SESSION_NOTE_SEC,
  agoText,
  authAge,
  cleanName,
  deviceLine,
  findNode,
  formatMac,
  hiddenHomeText,
  isInsideTelegram,
  isStale,
  loadState,
  nodeLabel,
  onlineCount,
  pingClass,
  validateAction,
  vpnTitle,
  NET_ORDER
} from "./logic.mjs";

var PANEL_VER = "v6 · 24.11";
var NET_META = {
  m: { icon: "🏠", title: "Основная сеть · g20", dev: "📱" },
  g: { icon: "👥", title: "Гостевая · g20-guest", dev: "👤" },
  h: { icon: "💡", title: "Умный дом · g20-home", dev: "💡" }
};

function showFatal() {
  var app = document.getElementById("app");
  if (!app) return;
  while (app.firstChild) app.removeChild(app.firstChild);
  var box = document.createElement("div");
  box.className = "err";
  box.setAttribute("role", "alert");
  var icon = document.createElement("div");
  icon.className = "icon";
  icon.textContent = "⚠️";
  var title = document.createElement("p");
  var b = document.createElement("b");
  b.textContent = "Панель не открылась";
  title.appendChild(b);
  var text = document.createElement("p");
  text.textContent = "Закройте окно и отправьте боту /panel. Если не поможет — проверьте интернет и откройте снова.";
  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(text);
  app.appendChild(box);
}

window.onerror = function () {
  var app = document.getElementById("app");
  if (app && app.getAttribute("data-booted") !== "1") {
    showFatal();
    return true;
  }
  return false;
};

function el(tag, attrs) {
  var node = document.createElement(tag);
  if (attrs) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, String(attrs[k]));
    }
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];
    if (child == null || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function hexToRgba(hex, alpha) {
  var h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "rgba(36,129,204," + alpha + ")";
  var n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}

function boot() {
  if (window.__g20timer) clearTimeout(window.__g20timer);
  var app = document.getElementById("app");
  if (!app) return;
  app.setAttribute("data-booted", "1");
  var tg = window.Telegram && window.Telegram.WebApp;
  var ctl = { busy: false };
  function send(obj, onFail) {
    if (ctl.busy) return;
    var problem = validateAction(obj);
    if (problem) {
      toast(problem);
      hapNote("error");
      if (onFail) onFail();
      return;
    }
    var payload;
    try { payload = JSON.stringify(obj); } catch (e) {
      toast("Некорректная команда.");
      hapNote("error");
      if (onFail) onFail();
      return;
    }
    if (!insideTelegram() || !tg || !tg.sendData) {
      toast("Откройте панель в Telegram кнопкой «Роутер».");
      hapNote("error");
      if (onFail) onFail();
      return;
    }
    ctl.busy = true;
    app.setAttribute("aria-busy", "true");
    toast("Отправляю боту…");
    var bridged = bridgeLikely();
    try {
      tg.sendData(payload);
    } catch (e2) {
      ctl.busy = false;
      app.removeAttribute("aria-busy");
      console.error(e2);
      toast("Не получилось отправить команду. Закройте окно и откройте панель кнопкой «Роутер».");
      hapNote("error");
      if (onFail) onFail();
      return;
    }
    if (!bridged) {
      ctl.busy = false;
      app.removeAttribute("aria-busy");
      hapNote("warning");
      toast("Telegram не подтвердил отправку. Закройте окно и нажмите «Роутер» внизу чата.");
      if (onFail) onFail();
      return;
    }
    hapNote("success");
    setTimeout(function () {
      toast("Команда ушла боту. Если ответа нет — закройте окно и нажмите «Роутер» внизу чата.");
    }, 1200);
  }
  function insideTelegram() {
    return isInsideTelegram(tg, Math.round(Date.now() / 1000));
  }
  var now = Math.round(Date.now() / 1000);
  var inside = isInsideTelegram(tg, now);

  function applyChrome() {
    if (!tg) return;
    var scheme = "light";
    try {
      scheme = tg.colorScheme === "dark" ? "dark" : "light";
    } catch (e) {}
    document.documentElement.style.colorScheme = scheme;
    var accent = "#2481cc";
    var pageBg = scheme === "dark" ? "#1c1c1d" : "#f2f2f7";
    try {
      if (tg.themeParams && tg.themeParams.button_color) accent = tg.themeParams.button_color;
      if (tg.themeParams && tg.themeParams.secondary_bg_color) pageBg = tg.themeParams.secondary_bg_color;
    } catch (e2) {}
    document.documentElement.style.setProperty("--acc-soft", hexToRgba(accent, ".12"));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", pageBg);
    try { tg.setHeaderColor("secondary_bg_color"); } catch (e3) {}
    try { tg.setBackgroundColor("secondary_bg_color"); } catch (e4) {}
    try {
      if (!tg.isVersionAtLeast || tg.isVersionAtLeast("7.10")) tg.setBottomBarColor("secondary_bg_color");
    } catch (e5) {}
  }

  if (tg) {
    try { tg.ready(); } catch (e) {}
    try { tg.expand(); } catch (e2) {}
    try {
      if (!tg.isVersionAtLeast || tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes();
    } catch (e3) {}
    applyChrome();
    try { tg.onEvent("themeChanged", applyChrome); } catch (e4) {}
    setTimeout(function () {
      try { tg.expand(); } catch (e5) {}
    }, 80);
  }

  if (window.__tgFailed || (inside && !tg)) {
    renderMessage(app, {
      icon: "⚠️",
      title: "Не удалось загрузить панель",
      text: "Проверьте интернет и откройте панель ещё раз. Если открыто в Telegram — закройте окно и нажмите «Роутер».",
      button: "Повторить",
      onClick: function () { location.reload(); }
    });
    return;
  }

  var search = "";
  var hash = "";
  try {
    var href = String(location.href);
    var hi = href.indexOf("#");
    var beforeHash = hi < 0 ? href : href.slice(0, hi);
    hash = hi < 0 ? "" : href.slice(hi);
    var qi = beforeHash.indexOf("?");
    search = qi < 0 ? "" : beforeHash.slice(qi);
  } catch (e6) {
    search = location.search || "";
    hash = location.hash || "";
  }
  try { historyReplaceStripS(); } catch (e7) {}

  if (!inside) {
    renderMessage(app, {
      icon: "🛜",
      title: "Панель роутера g20",
      text: "Эта страница открывается в Telegram. В чате с ботом нажмите кнопку «Роутер» внизу или отправьте /panel."
    });
    return;
  }

  var startParam = "";
  try {
    startParam = tg.initDataUnsafe && tg.initDataUnsafe.start_param || "";
  } catch (e8) {}
  var loaded = loadState(search, hash, startParam && String(startParam).length >= 24 ? startParam : "");
  if (!loaded.state) {
    var bad = loaded.status === "bad";
    renderMessage(app, {
      icon: bad ? "⚠️" : "🛜",
      title: bad ? "Данные в ссылке повреждены" : "Нет свежих данных о роутере",
      text: bad
        ? "Нажмите «Обновить данные» — бот пришлёт новую кнопку «Роутер». Если ничего не пришло, закройте окно и нажмите «Роутер» под полем ввода или отправьте /panel."
        : "Нажмите «Обновить данные» — бот пришлёт новую кнопку «Роутер». Если не сработало, закройте окно и нажмите кнопку «Роутер» внизу чата или отправьте /panel.",
      button: "🔄 Обновить данные",
      onClick: function () { send({ a: "refresh" }); }
    });
    return;
  }

  renderPanel(app, tg, loaded.state, now, ctl, send);
}

function historyReplaceStripS() {
  var href = String(location.href);
  var hash = "";
  var hi = href.indexOf("#");
  if (hi >= 0) {
    hash = href.slice(hi);
    href = href.slice(0, hi);
  }
  var qi = href.indexOf("?");
  if (qi < 0) return;
  var path = href.slice(0, qi);
  var parts = href.slice(qi + 1).split("&");
  var kept = [];
  var had = false;
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    var eq = parts[i].indexOf("=");
    var key = eq < 0 ? parts[i] : parts[i].slice(0, eq);
    try { key = decodeURIComponent(key.replace(/\+/g, "%20")); } catch (e) {}
    if (key === "s") { had = true; continue; }
    kept.push(parts[i]);
  }
  if (!had || !history.replaceState) return;
  history.replaceState(null, "", path + (kept.length ? "?" + kept.join("&") : "") + hash);
}

function renderMessage(app, opts) {
  while (app.firstChild) app.removeChild(app.firstChild);
  var box = el("div", { class: "err", role: "status" },
    el("div", { class: "icon", "aria-hidden": "true", text: opts.icon }),
    el("p", {}, el("b", { text: opts.title })),
    el("p", { text: opts.text })
  );
  app.appendChild(box);
  if (opts.button) {
    var btn = el("button", { class: "btn", type: "button", id: "refresh", text: opts.button });
    btn.addEventListener("click", function () {
      hapSel();
      opts.onClick();
    });
    app.appendChild(btn);
  }
  app.appendChild(el("div", { class: "foot", text: PANEL_VER }));
}

function renderPanel(app, tg, state, now, ctl, send) {
  while (app.firstChild) app.removeChild(app.firstChild);
  var pendingConfirm = false;
  var stack = [];
  var main = el("main");
  main.appendChild(el("h1", { class: "sr", text: "Роутер g20" }));

  if (isStale(state.ts, now)) {
    main.appendChild(el("div", {
      class: "note warn",
      role: "status",
      text: "Данные " + agoText(state.ts, now) + ". Лучше обновить, прежде чем что-то менять."
    }));
  }
  var age = 0;
  try { age = authAge(tg.initData, now); } catch (e) { age = null; }
  if (age != null && age > SESSION_NOTE_SEC) {
    main.appendChild(el("div", {
      class: "note",
      role: "status",
      text: "Сессия Telegram открыта давно. Если команда не уйдёт, закройте панель и откройте её снова."
    }));
  }

  var hero = el("div", { class: "hero" });
  hero.appendChild(tile("VPN", (state.vpn ? "🛡️ " : "⛔ ") + (state.vpn ? vpnTitle(state) : "Выключен")));
  hero.appendChild(tile("Устройств в сети", "📱 " + String(onlineCount(state.devices))));
  hero.appendChild(tile("Работает", "⏱ " + (state.uptime || "—")));
  hero.appendChild(tile("Память · нагрузка", pair(state.mem, state.load)));
  main.appendChild(hero);

  main.appendChild(el("h2", { text: "Управление" }));
  var controls = el("div", { class: "card" });
  controls.appendChild(switchRow("🛡️", "VPN (Podkop)", "Заблокированные сайты через VPN, остальное напрямую", "vpn", state.vpn, "vpn"));
  controls.appendChild(switchRow("👥", "Гостевой Wi‑Fi", "g20-guest", "guest", state.guest, "guest"));
  controls.appendChild(el("div", { class: "row" },
    el("span", { class: "ic", "aria-hidden": "true", text: "🚫" }),
    el("div", { class: "t", text: "Блокировка рекламы" }, el("div", { class: "s", text: "AdGuard Home" })),
    el("span", { class: "s", text: state.adguard ? "работает" : "выключена" })
  ));
  main.appendChild(controls);

  if (state.vpn) main.appendChild(serverSection(state));

  var anyDev = false;
  for (var n = 0; n < NET_ORDER.length; n++) {
    var key = NET_ORDER[n];
    var list = [];
    for (var di = 0; di < state.devices.length; di++) {
      if (state.devices[di].net === key) list.push(state.devices[di]);
    }
    var hidden = key === "h" ? state.hiddenHome : 0;
    if (!list.length && !hidden) continue;
    anyDev = true;
    main.appendChild(netSection(key, list, hidden));
  }
  if (!anyDev) {
    main.appendChild(el("h2", { text: "Устройства" }));
    main.appendChild(el("div", { class: "card" },
      el("div", { class: "row" }, el("div", { class: "t" }, el("div", { class: "s wrap", text: "В списке никого нет. Обновите данные, если это неожиданно." })))
    ));
  }
  if (state.skipped) {
    main.appendChild(el("div", { class: "foot", text: "Часть записей об устройствах пропущена — обновите данные." }));
  }
  if (state.hiddenOffline) {
    main.appendChild(el("div", { class: "foot", text: "Не в сети и скрыто: " + String(state.hiddenOffline) }));
  }

  main.appendChild(el("h2", { text: "Сеть" }));
  main.appendChild(el("div", { class: "card" },
    el("div", { class: "row" },
      el("span", { class: "ic", "aria-hidden": "true", text: "🌐" }),
      el("div", { class: "t", text: "Внешний IP" }, el("div", { class: "s", text: "WAN " + (state.wan || "нет данных") })),
      el("span", { class: "s", text: state.wanExtra || "" })
    )
  ));

  main.appendChild(el("h2", { text: "Действия" }));
  main.appendChild(actionButton("speed", "📶 Тест скорости", function () { hapSel(); send({ a: "speed" }); }));
  main.appendChild(actionButton("report", "📋 Отчёт за сутки", function () { hapSel(); send({ a: "report" }); }));
  main.appendChild(actionButton("refresh", "🔄 Обновить данные", function () { hapSel(); send({ a: "refresh" }); }));
  var reboot = actionButton("reboot", "⏻ Перезагрузить роутер", function () {
    confirmDo("Перезагрузить роутер? Интернет пропадёт примерно на 2 минуты.", function () {
      send({ a: "reboot" });
    });
  });
  reboot.classList.add("red");
  main.appendChild(reboot);
  var shortIp = false;
  for (var si = 0; si < state.devices.length; si++) {
    if (state.devices[si].ip && state.devices[si].ip.charAt(0) === ".") shortIp = true;
  }
  var foot = "Данные: " + agoText(state.ts, now) + " · команды выполняет бот · " + PANEL_VER;
  if (shortIp) foot += " · адреса — по окончанию";
  main.appendChild(el("div", { class: "foot", text: foot }));
  app.appendChild(main);

  try {
    tg.BackButton.onClick(function () {
      if (!stack.length) {
        syncBack();
        return;
      }
      var mac = stack.pop();
      setEditor(mac, false);
      syncBack();
      hapSel();
    });
  } catch (e) {}

  function tile(k, v) {
    return el("div", { class: "tile" }, el("div", { class: "k", text: k }), el("div", { class: "v", text: v }));
  }

  function pair(a, b) {
    if (!a && !b) return "—";
    if (!a) return b;
    if (!b) return a;
    return a + " · " + b;
  }

  function switchRow(icon, title, sub, id, checked, action) {
    var input = el("input", { type: "checkbox", id: id });
    if (checked) input.checked = true;
    input.addEventListener("change", function () {
      if (ctl.busy || pendingConfirm) {
        input.checked = !input.checked;
        return;
      }
      var on = input.checked;
      if (on) {
        hapSel();
        send({ a: action, v: 1 }, function () { input.checked = false; });
        return;
      }
      input.checked = true;
      var text = action === "vpn"
        ? "Выключить VPN? Заблокированные сайты перестанут открываться."
        : "Выключить гостевой Wi‑Fi? Гости отключатся от сети.";
      confirmDo(text, function () {
        input.checked = false;
        send({ a: action, v: 0 }, function () { input.checked = true; });
      });
    });
    var sw = el("span", { class: "sw" }, input, el("span", { "aria-hidden": "true" }));
    return el("label", { class: "row" },
      el("span", { class: "ic", "aria-hidden": "true", text: icon }),
      el("div", { class: "t", text: title }, el("div", { class: "s wrap", text: sub })),
      sw
    );
  }

  function serverSection(s) {
    var wrap = el("div");
    wrap.appendChild(el("h2", { text: "Сервер VPN" }));
    var card = el("div", { class: "card", role: "group", "aria-label": "Сервер VPN" });
    if (!s.nodes.length) {
      card.appendChild(el("div", { class: "row" }, el("div", { class: "t" }, el("div", { class: "s wrap", text: "Список серверов пуст. Обновите данные." }))));
    } else {
      var autoNode = findNode(s, s.auto);
      var ap = autoNode ? autoNode.ping : 0;
      var autoLabel = autoNode ? nodeLabel(autoNode.cc).join(" ") : "выбирается";
      card.appendChild(serverRow("AUTO", "⚡", "Авто (лучший)", "сейчас: " + autoLabel, ap, s.sel === "AUTO", false));
      for (var i = 0; i < s.nodes.length; i++) {
        var node = s.nodes[i];
        var label = nodeLabel(node.cc);
        card.appendChild(serverRow(node.tag, label[0], label[1], "", node.ping, s.sel === node.tag, node.ping <= 0));
      }
    }
    wrap.appendChild(card);
    return wrap;
  }

  function serverRow(tag, icon, title, sub, ping, on, dead) {
    var cls = "row srv" + (on ? " on" : "") + (dead ? " dead" : "");
    var pingText = ping > 0 ? ping + " мс" : (tag === "AUTO" ? "" : "нет связи");
    var row = el("div", {
      class: cls,
      role: "button",
      tabindex: "0",
      "aria-pressed": on ? "true" : "false",
      "data-t": tag
    },
      el("span", { class: "chk", "aria-hidden": "true", text: on ? "✓" : "" }),
      el("span", { class: "ic", "aria-hidden": "true", text: icon }),
      el("div", { class: "t", text: title }, sub ? el("div", { class: "s", text: sub }) : null),
      el("span", { class: "ping " + pingClass(ping), text: pingText })
    );
    if (on) row.appendChild(el("span", { class: "sr", text: "выбран" }));
    bindPress(row, function () {
      if (ctl.busy || pendingConfirm) return;
      if (tag === state.sel) return;
      var go = function () { send({ a: "sel", t: tag }); };
      if (dead) confirmDo("С этим сервером нет связи. Всё равно переключить?", go);
      else { hapSel(); go(); }
    });
    return row;
  }

  function netSection(key, list, hidden) {
    var meta = NET_META[key];
    var online = 0;
    for (var i = 0; i < list.length; i++) if (list[i].online) online++;
    var wrap = el("div");
    var heading = el("h2", { text: meta.icon + " " + meta.title });
    heading.appendChild(el("span", { class: "badge", text: online + " в сети" }));
    wrap.appendChild(heading);
    var card = el("div", { class: "card" });
    for (var j = 0; j < list.length; j++) card.appendChild(deviceBlock(list[j], meta.dev));
    if (hidden) {
      card.appendChild(el("div", { class: "row" },
        el("span", { class: "ic", "aria-hidden": "true", text: "💡" }),
        el("div", { class: "t", text: hiddenHomeText(hidden) }, el("div", { class: "s", text: "не поместились в ссылку" }))
      ));
    }
    wrap.appendChild(card);
    return wrap;
  }

  function deviceBlock(d, icon) {
    var frag = document.createDocumentFragment();
    var title = el("div", { class: "t" });
    title.appendChild(document.createTextNode(d.name || "Без имени"));
    if (d.blocked) title.appendChild(el("span", { class: "bl", text: " · без интернета" }));
    title.appendChild(el("div", { class: "s", text: deviceLine(d) }));
    var row = el("div", { class: "row dev" + (d.online ? "" : " off") + (d.manageable ? "" : " static") },
      el("span", { class: "ic", "aria-hidden": "true", text: icon }),
      title,
      d.manageable ? el("span", { class: "s", "aria-hidden": "true", text: "›" }) : null
    );
    frag.appendChild(row);
    if (!d.manageable) return frag;
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.setAttribute("aria-expanded", "false");
    row.setAttribute("data-m", d.mac);
    var ed = el("div", { class: "ed", id: "ed-" + d.mac });
    var input = el("input", {
      id: "in-" + d.mac,
      maxlength: "24",
      placeholder: "Имя устройства",
      "aria-label": "Имя устройства",
      enterkeyhint: "done",
      autocomplete: "off",
      spellcheck: "false"
    });
    input.value = d.name || "";
    var original = d.name || "";
    input.addEventListener("input", syncDirty);
    input.addEventListener("focus", function () {
      setTimeout(function () {
        try { input.scrollIntoView({ block: "center" }); } catch (e) {}
      }, 280);
    });
    var save = el("button", { type: "button", text: "Сохранить имя" });
    save.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (ctl.busy || pendingConfirm) return;
      var name = cleanName(input.value);
      if (!name) { toast("Введите имя устройства."); hapNote("error"); return; }
      if (name === original) { toast("Имя не изменилось."); return; }
      hapSel();
      send({ a: "ren", m: d.mac, n: name });
    });
    var block = el("button", {
      type: "button",
      class: d.blocked ? "grn" : "red",
      text: d.blocked ? "Вернуть интернет" : "Отключить интернет"
    });
    block.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (ctl.busy || pendingConfirm) return;
      if (d.blocked) {
        hapSel();
        send({ a: "blk", m: d.mac, v: 0 });
      } else {
        confirmDo("Отключить интернет этому устройству? Локальная сеть останется.", function () {
          send({ a: "blk", m: d.mac, v: 1 });
        });
      }
    });
    ed.appendChild(input);
    ed.appendChild(el("div", { class: "s", text: "MAC " + formatMac(d.mac) }));
    if (!d.mac) ed.appendChild(el("div", { class: "s", text: "Управление недоступно — нет адреса устройства." }));
    ed.appendChild(save);
    ed.appendChild(block);
    row.setAttribute("aria-controls", "ed-" + d.mac);
    bindPress(row, function () { toggleEditor(d.mac); });
    frag.appendChild(ed);
    return frag;
  }

  function toggleEditor(mac) {
    var ed = document.getElementById("ed-" + mac);
    if (!ed) return;
    var open = !ed.classList.contains("open");
    setEditor(mac, open);
    var idx = stack.indexOf(mac);
    if (idx >= 0) stack.splice(idx, 1);
    if (open) stack.push(mac);
    syncBack();
    hapSel();
  }

  function setEditor(mac, open) {
    var ed = document.getElementById("ed-" + mac);
    var row = null;
    var rows = app.querySelectorAll(".dev");
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute("data-m") === mac) row = rows[i];
    }
    if (ed) {
      if (open) ed.classList.add("open");
      else ed.classList.remove("open");
    }
    if (row) row.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function syncBack() {
    try {
      if (stack.length) tg.BackButton.show();
      else tg.BackButton.hide();
    } catch (e) {}
    syncDirty();
  }

  function syncDirty() {
    var dirty = false;
    var inputs = app.querySelectorAll(".ed input");
    for (var i = 0; i < inputs.length; i++) {
      var id = inputs[i].id.replace(/^in-/, "");
      var dev = null;
      for (var j = 0; j < state.devices.length; j++) if (state.devices[j].mac === id) dev = state.devices[j];
      if (dev && cleanName(inputs[i].value) !== (dev.name || "") && cleanName(inputs[i].value) !== "") dirty = true;
    }
    try {
      if (dirty) tg.enableClosingConfirmation();
      else tg.disableClosingConfirmation();
    } catch (e) {}
  }

  function actionButton(id, label, onClick) {
    var btn = el("button", { class: "btn", type: "button", id: id, text: label });
    btn.addEventListener("click", function () {
      if (ctl.busy || pendingConfirm) return;
      onClick();
    });
    return btn;
  }

  function confirmDo(text, onYes) {
    if (ctl.busy || pendingConfirm) return;
    pendingConfirm = true;
    hapNote("warning");
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      pendingConfirm = false;
    }
    var ask = tg && tg.showConfirm;
    var canPopup = false;
    try { canPopup = !tg.isVersionAtLeast || tg.isVersionAtLeast("6.2"); } catch (e) { canPopup = true; }
    if (ask && canPopup) {
      try {
        ask.call(tg, text, function (ok) {
          finish();
          if (ok) onYes();
        });
        setTimeout(finish, 60000);
        return;
      } catch (e2) {}
    }
    var ok = false;
    try { ok = window.confirm(text); } catch (e3) { ok = false; }
    finish();
    if (ok) onYes();
  }
}

function bridgeLikely() {
  try {
    if (window.TelegramWebviewProxy !== undefined) return true;
    if (window.external && "notify" in window.external) return true;
    if (window.parent && window.parent !== window) return true;
  } catch (e) {
    return true;
  }
  return false;
}

function toast(text) {
  var node = document.getElementById("toast");
  if (!node) return;
  node.textContent = text;
  node.className = "toast show";
  clearTimeout(toast._t);
  toast._t = setTimeout(function () {
    node.className = "toast";
  }, 6000);
}

function hapSel() {
  var tg = window.Telegram && window.Telegram.WebApp;
  try { tg && tg.HapticFeedback && tg.HapticFeedback.selectionChanged(); } catch (e) {}
}
function hapNote(type) {
  var tg = window.Telegram && window.Telegram.WebApp;
  try { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred(type); } catch (e) {}
}

function bindPress(node, fn) {
  node.addEventListener("click", fn);
  node.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      fn();
    }
  });
}

if (typeof document !== "undefined" && document.getElementById("app")) {
  try { boot(); } catch (e) {
    console.error(e);
    showFatal();
  }
}
