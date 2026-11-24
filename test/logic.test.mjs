import test from "node:test";
import assert from "node:assert/strict";
import {
  agoText,
  authAge,
  b64json,
  cleanName,
  deviceLine,
  formatMac,
  hiddenHomeText,
  isInsideTelegram,
  isStale,
  loadState,
  nodeLabel,
  normalizeState,
  onlineCount,
  parseDevice,
  pingClass,
  plural,
  readParam,
  validateAction,
  vpnTitle
} from "../logic.mjs";

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

const NOW = 1764000000;

test("preserves plus signs in the state query", () => {
  assert.equal(readParam("?s=abc+def/ghi", "s"), "abc+def/ghi");
  assert.equal(readParam("s=abc%2Bdef", "s"), "abc+def");
  assert.equal(readParam("a=1&s=zzz&b=2", "s"), "zzz");
});

test("decodes unicode base64url and rejects junk", () => {
  const raw = b64json(b64url({ ts: NOW, vpn: 1, c: [["Телефон", 15, "m", "aabbccddeeff", 1, -40]] }));
  assert.equal(raw.c[0][0], "Телефон");
  assert.equal(b64json("@@@"), null);
  assert.equal(b64json(b64url([1, 2, 3])), null);
});

test("query plus does not corrupt a standard base64 payload", () => {
  const encoded = Buffer.from(JSON.stringify({ ts: NOW, vpn: false, z: String.fromCharCode(190) }), "utf8").toString("base64");
  assert.equal(encoded.includes("+"), true);
  const state = loadState("?s=" + encoded, "", "");
  assert.equal(state.status, "ok");
  assert.equal(state.state.ts, NOW);
  assert.equal(state.state.vpn, false);
});

test("normalizes the bot snapshot and drops hostile fields", () => {
  const state = normalizeState({
    ts: String(NOW),
    vpn: "1",
    g: 0,
    a: 1,
    sel: "AUTO",
    auto: "nl",
    up: "3 д",
    m: "41%",
    ld: "0.2",
    w: "<b>203.0.113.8</b>",
    e: "DHCP",
    n: [["nl", "nl", "40"], ["<script>", "xx", 1]],
    c: [
      ["<img src=x onerror=alert(1)>", "15", "m", "AA:BB:CC:DD:EE:FF", 1, -48],
      ["Лампа", 4, "h", "001122334455", 3, 0],
      ["Ноут", "10.1.1.9", "l5", -55],
      ["битый", 1, "m", null, 1, -20],
      "nope",
      ["Дубль", 16, "m", "aabbccddeeff", 1, -30]
    ],
    hg: "2",
    co: -4,
    sub: { m: "192.168.1", g: "<script>", h: "" }
  });
  assert.equal(state.vpn, true);
  assert.equal(state.guest, false);
  assert.equal(state.adguard, true);
  assert.equal(state.wan, "<b>203.0.113.8</b>");
  assert.equal(state.nodes.length, 1);
  assert.equal(state.nodes[0].ping, 40);
  assert.equal(state.devices.length, 3);
  assert.equal(state.devices[0].ip, "192.168.1.15");
  assert.equal(state.devices[0].mac, "aabbccddeeff");
  assert.equal(state.devices[0].name.includes("<img"), true);
  assert.equal(state.devices[1].blocked, true);
  assert.equal(state.devices[1].online, true);
  assert.equal(state.devices[1].ip, ".4");
  assert.equal(state.devices[2].net, "m");
  assert.equal(state.devices[2].band, "5 ГГц");
  assert.equal(state.devices[2].manageable, false);
  assert.equal(state.hiddenHome, 2);
  assert.equal(state.hiddenOffline, 0);
  assert.equal(state.skipped >= 3, true);
  assert.equal(onlineCount(state.devices), 3);
});

test("accepts millisecond timestamps and groups wifi bands", () => {
  const state = normalizeState({ ts: NOW * 1000, c: [["Телефон", "192.168.1.5", "l2", -60]] });
  assert.equal(state.ts, NOW);
  assert.equal(state.devices[0].net, "m");
  assert.equal(state.devices[0].ip, "192.168.1.5");
  assert.equal(deviceLine(state.devices[0]).includes("2.4 ГГц"), true);
  assert.equal(deviceLine(state.devices[0]).includes("-60 dBm"), true);
});

test("malformed mac does not throw and is skipped", () => {
  assert.equal(parseDevice(["x", 1, "m", "<svg/onload=alert(1)>", 1, -40], {}), null);
  assert.equal(formatMac("aabbccddeeff"), "aa:bb:cc:dd:ee:ff");
  assert.equal(cleanName("  Кот \u0000"), "Кот");
});

test("russian plurals and stale copy", () => {
  assert.equal(plural(1, "минуту", "минуты", "минут"), "минуту");
  assert.equal(plural(2, "минуту", "минуты", "минут"), "минуты");
  assert.equal(plural(5, "минуту", "минуты", "минут"), "минут");
  assert.equal(plural(11, "устройство", "устройства", "устройств"), "устройств");
  assert.equal(plural(21, "час", "часа", "часов"), "час");
  assert.equal(agoText(NOW, NOW + 30), "только что");
  assert.equal(agoText(NOW, NOW + 60), "1 минуту назад");
  assert.equal(agoText(NOW, NOW + 5 * 60), "5 минут назад");
  assert.equal(agoText(NOW, NOW + 2 * 3600), "2 часа назад");
  assert.equal(agoText(NOW, NOW + 5 * 86400), "5 дней назад");
  assert.equal(hiddenHomeText(1), "Ещё 1 устройство умного дома");
  assert.equal(hiddenHomeText(2), "Ещё 2 устройства умного дома");
  assert.equal(isStale(NOW, NOW + 14 * 60), false);
  assert.equal(isStale(NOW, NOW + 15 * 60), true);
});

test("vpn title and unknown country stay safe", () => {
  const state = normalizeState({
    ts: NOW,
    vpn: 1,
    sel: "AUTO",
    auto: "de",
    n: [["de", "de", 10], ["xx", "<img>", 5]]
  });
  assert.equal(vpnTitle(state), "Авто → 🇩🇪 Германия");
  assert.deepEqual(nodeLabel("<img>"), ["🌐", "неизвестный"]);
  assert.deepEqual(nodeLabel("toString"), ["🌐", "toString"]);
  assert.equal(nodeLabel("kz")[1], "Казахстан");
  assert.equal(pingClass(0), "bad");
  assert.equal(pingClass(100), "ok");
  assert.equal(pingClass(300), "mid");
  assert.equal(pingClass(900), "bad");
});

test("hash state survives tgWebApp params and a broken query falls through", () => {
  const good = b64url({ ts: NOW, up: "1 ч" });
  const fromHash = loadState("", "#tgWebAppData=query%3D1&s=" + good, "");
  assert.equal(fromHash.status, "ok");
  assert.equal(fromHash.state.uptime, "1 ч");
  const raw = loadState("", "#" + good, "");
  assert.equal(raw.status, "ok");
  const badThenGood = loadState("?s=" + b64url({ nope: 1 }) + "&x=1", "#s=" + good, "");
  assert.equal(badThenGood.status, "ok");
  assert.equal(loadState("", "", "").status, "empty");
  assert.equal(loadState("?s=" + b64url({ ts: "nope" }), "", "").status, "bad");
});

test("telegram gate checks shape, not a signature", () => {
  const hash = "a".repeat(64);
  const tg = {
    initData: "query_id=AA&auth_date=" + (NOW - 10) + "&hash=" + hash,
    platform: "ios"
  };
  assert.equal(isInsideTelegram(tg, NOW), true);
  assert.equal(isInsideTelegram({ initData: "", platform: "unknown" }, NOW), false);
  assert.equal(isInsideTelegram({ initData: "hash=abcd&auth_date=" + NOW, platform: "ios" }, NOW), false);
  assert.equal(isInsideTelegram({
    initData: "auth_date=" + (NOW + 3 * 86400) + "&hash=" + hash,
    platform: "ios"
  }, NOW), false);
  assert.equal(authAge(tg.initData, NOW), 10);
});

test("actions are a closed set", () => {
  assert.equal(validateAction({ a: "reboot" }), "");
  assert.equal(validateAction({ a: "reboot", v: 1 }), "Некорректная команда.");
  assert.equal(validateAction({ a: "vpn", v: 0 }), "");
  assert.equal(validateAction({ a: "sel", t: "nl" }), "");
  assert.equal(validateAction({ a: "sel", t: "<script>" }), "Некорректный сервер.");
  assert.equal(validateAction({ a: "ren", m: "aabbccddeeff", n: "Кот" }), "");
  assert.equal(validateAction({ a: "ren", m: "aabbccddeeff", n: "" }), "Введите имя устройства.");
  assert.equal(validateAction({ a: "blk", m: "nope", v: 1 }), "Некорректный адрес устройства. Обновите данные.");
  assert.equal(validateAction({ a: "eval", t: "x" }), "Неизвестная команда.");
});
