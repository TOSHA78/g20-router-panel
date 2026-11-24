// Pure helpers for the g20 panel. No DOM, no secrets, no network.
// The bot token never belongs here: initData HMAC can only be checked on the bot.

export var STALE_SEC = 15 * 60;
export var SESSION_NOTE_SEC = 12 * 3600;

export var NODES = {
  auto: ["🇪🇺", "Автовыбор провайдера"],
  pl: ["🇵🇱", "Польша"],
  gb: ["🇬🇧", "Англия"],
  nl: ["🇳🇱", "Нидерланды"],
  ru: ["🇷🇺", "Санкт-Петербург"],
  nskru: ["🇷🇺", "Новосибирск"],
  fr: ["🇫🇷", "Франция"],
  ee: ["🇪🇪", "Эстония"],
  se: ["🇸🇪", "Швеция"],
  de: ["🇩🇪", "Германия"],
  nyus: ["🇺🇸", "США"],
  by: ["🇧🇾", "Беларусь"],
  kz: ["🇰🇿", "Казахстан"],
  am: ["🇦🇲", "Армения"],
  mx: ["🇲🇽", "Мексика"],
  bg: ["🇧🇬", "Болгария"],
  cz: ["🇨🇿", "Чехия"],
  sg: ["🇸🇬", "Сингапур"],
  "br-rul": ["📶", "Обход БС #12"],
  "br-rub": ["📶", "Обход БС #13"],
  "rev-ru": ["🇷🇺", "Из-за рубежа"],
  "tg-nl": ["✈️", "Сервер для TG"]
};

var NETS = { m: 1, g: 1, h: 1 };
var BAND_TO_NET = { l2: "m", l5: "m", m: "m", g: "g", h: "h" };
var BAND_LABEL = { l2: "2.4 ГГц", l5: "5 ГГц" };

export function plural(n, one, few, many) {
  var abs = Math.abs(n) % 100;
  var last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function agoText(ts, nowSec) {
  var ago = Math.max(0, Math.floor(nowSec - ts));
  if (ago < 60) return "только что";
  if (ago < 3600) {
    var m = Math.floor(ago / 60);
    return m + " " + plural(m, "минуту", "минуты", "минут") + " назад";
  }
  if (ago < 86400) {
    var h = Math.floor(ago / 3600);
    return h + " " + plural(h, "час", "часа", "часов") + " назад";
  }
  var d = Math.floor(ago / 86400);
  return d + " " + plural(d, "день", "дня", "дней") + " назад";
}

export function isStale(ts, nowSec) {
  return nowSec - ts >= STALE_SEC;
}

export function nodeLabel(cc) {
  if (Object.prototype.hasOwnProperty.call(NODES, cc)) return NODES[cc];
  if (/^[a-z0-9-]{1,16}$/i.test(cc || "")) return ["🌐", cc];
  return ["🌐", "неизвестный"];
}

export function pingClass(p) {
  var n = typeof p === "number" ? p : 0;
  if (n <= 0) return "bad";
  if (n < 220) return "ok";
  if (n < 400) return "mid";
  return "bad";
}

export function readParam(qs, name) {
  var q = String(qs || "").replace(/^[?#]/, "");
  if (!q) return null;
  var parts = q.split("&");
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (!part) continue;
    var eq = part.indexOf("=");
    var key = eq < 0 ? part : part.slice(0, eq);
    var val = eq < 0 ? "" : part.slice(eq + 1);
    var decodedKey;
    try {
      decodedKey = decodeURIComponent(key.replace(/\+/g, "%20"));
    } catch (e) {
      decodedKey = key;
    }
    if (decodedKey !== name) continue;
    try {
      return decodeURIComponent(val.replace(/\+/g, "%2B"));
    } catch (e2) {
      return val;
    }
  }
  return null;
}

function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

export function b64json(h) {
  try {
    if (h == null) return null;
    var s = String(h).replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!s || s.length > 20000) return null;
    if (!/^[A-Za-z0-9+/]+=*$/.test(s)) return null;
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var txt;
    try {
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 255;
      txt = new TextDecoder("utf-8").decode(bytes);
    } catch (e2) {
      txt = decodeURIComponent(escape(bin));
    }
    var o = JSON.parse(txt);
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    return o;
  } catch (e) {
    return null;
  }
}

export function loadState(search, hash, startParam) {
  var cands = [];
  var fromQuery = readParam(search, "s");
  if (fromQuery) cands.push(fromQuery);
  var body = hash ? String(hash).replace(/^#/, "") : "";
  if (body) {
    var fromHash = readParam(body, "s");
    if (fromHash) cands.push(fromHash);
    else if (body.indexOf("tgWebApp") !== 0 && body.indexOf("=") < 0) cands.push(decodeURIComponentSafe(body));
  }
  if (startParam) cands.push(String(startParam));
  var sawObject = false;
  for (var i = 0; i < cands.length; i++) {
    var o = b64json(cands[i]);
    if (!o) continue;
    sawObject = true;
    var state = normalizeState(o);
    if (state) return { state: state, status: "ok" };
  }
  return { state: null, status: sawObject ? "bad" : "empty" };
}

function plain(v, max) {
  if (v == null || v === false) return "";
  return String(v).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function truthy(v) {
  return v === true || v === 1 || v === "1";
}

function toInt(v) {
  if (typeof v === "number" && isFinite(v)) return v | 0;
  if (typeof v === "string" && /^-?\d+$/.test(v)) return parseInt(v, 10);
  return 0;
}

function clampCount(v) {
  var n = toInt(v);
  if (n < 0) return 0;
  if (n > 9999) return 9999;
  return n;
}

function octetOf(v) {
  if (typeof v === "number" && isFinite(v) && v >= 0 && v <= 255 && Math.floor(v) === v) return v;
  if (typeof v === "string" && /^\d{1,3}$/.test(v)) {
    var n = parseInt(v, 10);
    if (n >= 0 && n <= 255) return n;
  }
  return null;
}

function toPing(v) {
  var n;
  if (typeof v === "number") n = v;
  else if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) n = Number(v);
  else return 0;
  if (!isFinite(n) || n <= 0) return 0;
  if (n > 60000) return 60000;
  return Math.round(n);
}

function toSignal(v) {
  if (v == null || v === "" || v === 0 || v === "0") return null;
  var n;
  if (typeof v === "number") n = v;
  else if (typeof v === "string" && /^-?\d+$/.test(v)) n = parseInt(v, 10);
  else return null;
  if (!isFinite(n) || n === 0) return null;
  if (n < -120 || n > 0) return null;
  return n;
}

export function macHex(v) {
  var s = String(v == null ? "" : v).toLowerCase().replace(/[^0-9a-f]/g, "");
  return s.length === 12 ? s : "";
}

export function formatMac(hex) {
  if (!hex || hex.length !== 12) return "";
  var parts = [];
  for (var i = 0; i < 12; i += 2) parts.push(hex.slice(i, i + 2));
  return parts.join(":");
}

export function cleanName(v) {
  return plain(v, 24);
}

function cleanPrefix(v) {
  var s = plain(v, 18);
  if (!/^\d{1,3}(\.\d{1,3}){1,3}\.?$/.test(s)) return "";
  return s.charAt(s.length - 1) === "." ? s : s + ".";
}

function parseSub(raw) {
  var out = { m: "", g: "", h: "" };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  out.m = cleanPrefix(raw.m);
  out.g = cleanPrefix(raw.g);
  out.h = cleanPrefix(raw.h);
  return out;
}

function netOf(code) {
  var s = String(code == null ? "" : code);
  return Object.prototype.hasOwnProperty.call(BAND_TO_NET, s) ? BAND_TO_NET[s] : "";
}

function parseNode(row) {
  if (!Array.isArray(row) || !row.length) return null;
  var tag = String(row[0] == null ? "" : row[0]);
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(tag)) return null;
  var cc = typeof row[1] === "string" ? row[1] : "";
  return { tag: tag, cc: cc, ping: toPing(row[2]) };
}

export function parseDevice(row, sub) {
  if (!Array.isArray(row) || row.length < 3) return null;
  var net = netOf(row[2]);
  if (!net) return null;
  var name = cleanName(row[0]);
  var band = Object.prototype.hasOwnProperty.call(BAND_LABEL, row[2]) ? BAND_LABEL[row[2]] : "";
  var prefixes = sub || { m: "", g: "", h: "" };
  if (row.length >= 5 && macHex(row[3])) {
    var oct = octetOf(row[1]);
    var ip = "";
    if (oct != null && prefixes[net]) ip = prefixes[net] + String(oct);
    else if (oct != null) ip = "." + String(oct);
    var flags = toInt(row[4]);
    return {
      name: name,
      net: net,
      band: band,
      ip: ip,
      mac: macHex(row[3]),
      online: (flags & 1) === 1,
      blocked: (flags & 2) === 2,
      signal: toSignal(row[5]),
      manageable: true
    };
  }
  if (row.length >= 5) return null;
  var legacyIp = plain(row[1], 64);
  return {
    name: name,
    net: net,
    band: band,
    ip: legacyIp,
    mac: "",
    online: true,
    blocked: false,
    signal: toSignal(row[3]),
    manageable: false
  };
}

export function normalizeState(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  var ts = o.ts;
  if (typeof ts === "string" && /^\d{10,13}$/.test(ts)) ts = Number(ts);
  if (typeof ts !== "number" || !isFinite(ts)) return null;
  if (ts > 1e12) ts = Math.round(ts / 1000);
  if (ts < 1577836800) return null;
  var sub = parseSub(o.sub);
  var nodes = [];
  var rawNodes = Array.isArray(o.n) ? o.n : [];
  for (var i = 0; i < rawNodes.length && nodes.length < 64; i++) {
    var node = parseNode(rawNodes[i]);
    if (node) nodes.push(node);
  }
  var devices = [];
  var seen = Object.create(null);
  var skipped = 0;
  var rawDevs = Array.isArray(o.c) ? o.c : [];
  for (var j = 0; j < rawDevs.length && devices.length < 200; j++) {
    if (!Array.isArray(rawDevs[j])) {
      skipped++;
      continue;
    }
    var dev = parseDevice(rawDevs[j], sub);
    if (!dev) {
      skipped++;
      continue;
    }
    if (dev.mac) {
      if (seen[dev.mac]) {
        skipped++;
        continue;
      }
      seen[dev.mac] = 1;
    }
    devices.push(dev);
  }
  if (rawDevs.length > 200) skipped += rawDevs.length - 200;
  var sel = typeof o.sel === "string" ? o.sel : "";
  if (sel !== "AUTO" && !/^[A-Za-z0-9_-]{1,32}$/.test(sel)) sel = "";
  var auto = typeof o.auto === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(o.auto) ? o.auto : "";
  return {
    ts: ts,
    vpn: truthy(o.vpn),
    guest: truthy(o.g),
    adguard: truthy(o.a),
    sel: sel,
    auto: auto,
    uptime: plain(o.up, 32),
    mem: plain(o.m, 32),
    load: plain(o.ld, 32),
    wan: plain(o.w, 64),
    wanExtra: plain(o.e, 64),
    nodes: nodes,
    devices: devices,
    skipped: skipped,
    hiddenHome: clampCount(o.hg),
    hiddenOffline: clampCount(o.co),
    sub: sub,
    hasSub: !!(sub.m || sub.g || sub.h)
  };
}

export function onlineCount(devices) {
  var n = 0;
  for (var i = 0; i < (devices || []).length; i++) if (devices[i].online) n++;
  return n;
}

export function findNode(state, tag) {
  if (!state || !tag) return null;
  for (var i = 0; i < state.nodes.length; i++) {
    if (state.nodes[i].tag === tag) return state.nodes[i];
  }
  return null;
}

export function vpnTitle(state) {
  if (!state.vpn) return "Выключен";
  if (state.sel === "AUTO") {
    var auto = findNode(state, state.auto);
    var tail = auto ? nodeLabel(auto.cc).join(" ") : "выбирается";
    return "Авто → " + tail;
  }
  var node = findNode(state, state.sel);
  if (!node) return "Включён";
  return nodeLabel(node.cc).join(" ");
}

export function isInsideTelegram(tg, nowSec) {
  if (!tg) return false;
  var data = "";
  var platform = "";
  try {
    data = String(tg.initData || "");
  } catch (e) {
    return false;
  }
  try {
    platform = String(tg.platform || "");
  } catch (e2) {
    return false;
  }
  if (!data || !platform || platform === "unknown") return false;
  if (!/(^|&)hash=[0-9a-f]{64}(&|$)/i.test(data)) return false;
  var m = data.match(/(?:^|&)auth_date=(\d{9,12})(?:&|$)/);
  if (!m) return false;
  var auth = Number(m[1]);
  var now = nowSec == null ? Math.round(Date.now() / 1000) : nowSec;
  if (auth > now + 86400) return false;
  return true;
}

export function authAge(initData, nowSec) {
  var m = String(initData || "").match(/(?:^|&)auth_date=(\d{9,12})(?:&|$)/);
  if (!m) return null;
  return nowSec - Number(m[1]);
}

function onlyKeys(obj, keys) {
  var present = [];
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) present.push(k);
  }
  if (present.length !== keys.length) return false;
  for (var i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(obj, keys[i])) return false;
  }
  return true;
}

export function validateAction(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "Некорректная команда.";
  var a = obj.a;
  if (a === "refresh" || a === "speed" || a === "report" || a === "reboot") {
    return onlyKeys(obj, ["a"]) ? "" : "Некорректная команда.";
  }
  if (a === "vpn" || a === "guest") {
    if (!onlyKeys(obj, ["a", "v"])) return "Некорректная команда.";
    return obj.v === 0 || obj.v === 1 ? "" : "Некорректная команда.";
  }
  if (a === "sel") {
    if (!onlyKeys(obj, ["a", "t"])) return "Некорректная команда.";
    if (obj.t === "AUTO" || /^[A-Za-z0-9_-]{1,32}$/.test(obj.t || "")) return "";
    return "Некорректный сервер.";
  }
  if (a === "ren") {
    if (!onlyKeys(obj, ["a", "m", "n"])) return "Некорректная команда.";
    if (!macHex(obj.m)) return "Некорректный адрес устройства. Обновите данные.";
    if (typeof obj.n !== "string" || !obj.n.length || obj.n.length > 24) return "Введите имя устройства.";
    if (/[\u0000-\u001F\u007F]/.test(obj.n)) return "Имя содержит недопустимые символы.";
    return "";
  }
  if (a === "blk") {
    if (!onlyKeys(obj, ["a", "m", "v"])) return "Некорректная команда.";
    if (!macHex(obj.m)) return "Некорректный адрес устройства. Обновите данные.";
    return obj.v === 0 || obj.v === 1 ? "" : "Некорректная команда.";
  }
  return "Неизвестная команда.";
}

export function deviceLine(d) {
  var bits = [];
  if (d.ip) bits.push(d.ip);
  if (d.band) bits.push(d.band);
  if (!d.online) bits.push("не в сети");
  else if (d.signal == null) bits.push("по кабелю");
  else bits.push(String(d.signal) + " dBm");
  return bits.join(" · ");
}

export function hiddenHomeText(n) {
  return "Ещё " + n + " " + plural(n, "устройство", "устройства", "устройств") + " умного дома";
}

export var NET_ORDER = ["m", "g", "h"];

export function knownNet(code) {
  return Object.prototype.hasOwnProperty.call(NETS, code);
}
