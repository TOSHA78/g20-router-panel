import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import assert from "node:assert/strict";

const require = createRequire("/home/ubuntu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/package.json");
const { chromium } = require("playwright");

const root = new URL("..", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function hashFor(theme) {
  const auth = Math.floor(Date.now() / 1000);
  const init = [
    "query_id=AA",
    "user=" + encodeURIComponent(JSON.stringify({ id: 1, first_name: "Тоша", language_code: "ru" })),
    "auth_date=" + auth,
    "hash=" + "ab".repeat(32)
  ].join("&");
  return [
    "tgWebAppData=" + encodeURIComponent(init),
    "tgWebAppVersion=8.0",
    "tgWebAppPlatform=ios",
    "tgWebAppThemeParams=" + encodeURIComponent(JSON.stringify(theme))
  ].join("&");
}

const light = {
  bg_color: "#ffffff",
  secondary_bg_color: "#f2f2f7",
  text_color: "#000000",
  hint_color: "#8e8e93",
  button_color: "#2481cc",
  button_text_color: "#ffffff",
  section_bg_color: "#ffffff",
  section_header_text_color: "#8e8e93",
  destructive_text_color: "#e53935"
};
const dark = {
  bg_color: "#1c1c1d",
  secondary_bg_color: "#2c2c2e",
  text_color: "#ffffff",
  hint_color: "#98989d",
  button_color: "#2481cc",
  button_text_color: "#ffffff",
  section_bg_color: "#1c1c1d",
  section_header_text_color: "#8e8e93",
  destructive_text_color: "#ff453a"
};

function sample(extra) {
  return Object.assign({
    ts: Math.floor(Date.now() / 1000),
    vpn: 1,
    g: 1,
    a: 1,
    sel: "AUTO",
    auto: "de",
    up: "4 д",
    m: "38%",
    ld: "0.4",
    w: "203.0.113.8",
    e: "DHCP",
    n: [["de", "de", 42], ["bad", "<img src=x onerror=alert(1)>", 0], ["nl", "nl", 180]],
    c: [
      ["<img src=x onerror=a>", 15, "m", "aabbccddeeff", 1, -48],
      ["Лампа", 4, "h", "001122334455", 3, 0],
      ["Гость", 8, "g", "112233445566", 0, -70]
    ],
    hg: 2,
    co: 1,
    sub: { m: "10.1.1.", g: "10.2.2.", h: "10.3.3." }
  }, extra || {});
}

function url(port, state, theme, queryExtra) {
  const q = state ? "s=" + b64url(state) + (queryExtra || "") : (queryExtra || "").replace(/^&/, "");
  const hash = theme ? "#" + hashFor(theme) : "";
  return "http://127.0.0.1:" + port + "/index.html" + (q ? "?" + q : "") + hash;
}

async function start() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    if (path !== "/index.html" && path !== "/tg.js" && path !== "/p.html") {
      res.writeHead(404);
      res.end("no");
      return;
    }
    const file = join(root, path.slice(1));
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "text/plain", "cache-control": "no-store" });
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

function sent(page) {
  return page.evaluate(() => (window.__tgEvents || []).filter((e) => e[0] === "web_app_data_send").map((e) => JSON.parse(JSON.parse(e[1]).data)));
}

async function open(browser, address, opts) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); return d.dismiss(); });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.__errors = errors;
  if (!opts || !opts.noProxy) {
    await page.addInitScript(() => {
      window.__tgEvents = [];
      window.TelegramWebviewProxy = {
        postEvent: function (name, data) { window.__tgEvents.push([name, String(data)]); }
      };
    });
  }
  await page.goto(address, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("app").getAttribute("data-booted") === "1");
  page.__dialogs = dialogs;
  return page;
}

async function armConfirm(page) {
  await page.evaluate(() => {
    window.__confirm = null;
    window.Telegram.WebApp.showConfirm = function (text, cb) { window.__confirm = { text: text, cb: cb }; };
  });
}

const failures = [];
function check(name, cond, detail) {
  if (cond) console.log("ok", name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

const { server, port } = await start();
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

try {
  const outside = await open(browser, url(port, sample(), null), { noProxy: true });
  const outsideText = await outside.locator("#app").innerText();
  check("outside placeholder", outsideText.includes("открывается в Telegram") && !outsideText.includes("Лампа") && !outsideText.includes("203.0.113.8"));
  check("outside has no actions", await outside.locator("#reboot").count() === 0);
  check("viewport allows zoom", (await outside.locator("meta[name=viewport]").getAttribute("content")).includes("viewport-fit=cover") && !(await outside.locator("meta[name=viewport]").getAttribute("content")).includes("user-scalable"));
  await outside.screenshot({ path: "/tmp/g20-outside.png" });
  await outside.close();

  const page = await open(browser, url(port, sample(), light));
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--tg-safe-area-inset-bottom", "34px");
    document.documentElement.style.setProperty("--tg-content-safe-area-inset-top", "47px");
  });
  const pad = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { top: s.paddingTop, bottom: s.paddingBottom };
  });
  check("safe area padding", pad.top === "59px" && pad.bottom === "62px", JSON.stringify(pad));
  const events = await page.evaluate(() => (window.__tgEvents || []).map((e) => e[0]));
  check("header color follows page", events.includes("web_app_set_header_color"));
  check("vertical swipe disabled", events.includes("web_app_setup_swipe_behavior"));
  check("expanded", events.includes("web_app_expand"));
  const html = await page.locator("#app").innerHTML();
  const text = await page.locator("#app").innerText();
  check("xss name is text", text.includes("<img src=x onerror=a>") && !html.includes("<img"));
  check("country code not injected", text.includes("неизвестный") && !html.includes("<img") && !html.includes("<svg"));
  check("addresses from payload", text.includes("10.1.1.15") && text.includes("10.3.3.4"));
  check("russian device states", text.includes("без интернета") && text.includes("по кабелю") && text.includes("не в сети") && text.includes("Ещё 2 устройства"));
  check("query stripped", !(await page.evaluate(() => location.search)).includes("s="));
  check("checkbox stays available", await page.evaluate(() => getComputedStyle(document.getElementById("vpn")).display) !== "none");
  check("server is a button", await page.locator('.srv[data-t="nl"]').getAttribute("role") === "button");
  check("no stray dialog", page.__dialogs.length === 0, page.__dialogs.join("|"));
  await page.screenshot({ path: "/tmp/g20-panel.png", fullPage: true });

  await armConfirm(page);
  await page.locator("label", { hasText: "VPN (Podkop)" }).click();
  let confirm = await page.evaluate(() => window.__confirm && window.__confirm.text);
  check("vpn off asks", confirm && confirm.includes("Выключить VPN"));
  await page.evaluate(() => window.__confirm.cb(false));
  check("vpn cancel keeps it on", await page.locator("#vpn").isChecked());
  check("vpn cancel sends nothing", (await sent(page)).length === 0);
  await page.locator("label", { hasText: "VPN (Podkop)" }).click();
  await page.evaluate(() => window.__confirm.cb(true));
  check("vpn confirm sends off", (await sent(page)).some((c) => c.a === "vpn" && c.v === 0));

  const guest = await open(browser, url(port, sample(), light));
  await armConfirm(guest);
  await guest.locator("label", { hasText: "Гостевой" }).click();
  check("guest off asks", (await guest.evaluate(() => window.__confirm.text)).includes("гостевой"));
  await guest.evaluate(() => window.__confirm.cb(false));
  check("guest cancel keeps it on", await guest.locator("#guest").isChecked());

  const servers = await open(browser, url(port, sample(), light));
  await armConfirm(servers);
  await servers.locator('.srv[data-t="bad"]').click();
  check("dead server asks", (await servers.evaluate(() => window.__confirm && window.__confirm.text)).includes("нет связи"));
  await servers.evaluate(() => window.__confirm.cb(false));
  await servers.locator('.srv[data-t="nl"]').click();
  check("server switch sends", (await sent(servers)).some((c) => c.a === "sel" && c.t === "nl"));

  const editor = await open(browser, url(port, sample(), light));
  await editor.locator('.dev[data-m="aabbccddeeff"]').click();
  check("editor opens", await editor.locator("#ed-aabbccddeeff").evaluate((n) => n.classList.contains("open")));
  check("back button shown", await editor.evaluate(() => (window.__tgEvents || []).some((e) => e[0] === "web_app_setup_back_button" && e[1].includes("true"))));
  await editor.locator('.dev[data-m="aabbccddeeff"]').press("Enter");
  check("enter closes editor", !(await editor.locator("#ed-aabbccddeeff").evaluate((n) => n.classList.contains("open"))));
  await editor.locator('.dev[data-m="aabbccddeeff"]').click();
  await editor.screenshot({ path: "/tmp/g20-editor.png", fullPage: true });
  await editor.locator("#in-aabbccddeeff").fill("");
  await editor.locator("#ed-aabbccddeeff button", { hasText: "Сохранить имя" }).click();
  check("empty name blocked", (await editor.locator("#toast").innerText()).includes("Введите имя"));
  check("empty name not sent", !(await sent(editor)).some((c) => c.a === "ren"));
  await editor.locator("#in-aabbccddeeff").fill("Кухня");
  await editor.locator("#ed-aabbccddeeff button", { hasText: "Сохранить имя" }).click();
  check("rename sent", (await sent(editor)).some((c) => c.a === "ren" && c.n === "Кухня" && c.m === "aabbccddeeff"));

  const rebootPage = await open(browser, url(port, sample(), light));
  await armConfirm(rebootPage);
  await rebootPage.locator("#reboot").click();
  await rebootPage.locator("#reboot").click();
  check("reboot confirms once", await rebootPage.evaluate(() => window.__confirm && window.__confirm.text.includes("2 минуты")));
  await rebootPage.evaluate(() => window.__confirm.cb(false));
  check("reboot cancel sends nothing", (await sent(rebootPage)).every((c) => c.a !== "reboot"));
  await rebootPage.locator("#refresh").click();
  check("refresh sends", (await sent(rebootPage)).some((c) => c.a === "refresh" && Object.keys(c).length === 1));
  await rebootPage.waitForTimeout(1400);
  check("still-open hint", (await rebootPage.locator("#toast").innerText()).includes("Команда ушла боту"));

  const darkPage = await open(browser, url(port, sample(), dark));
  const bg = await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const scheme = await darkPage.evaluate(() => document.documentElement.style.colorScheme);
  check("dark background", bg === "rgb(44, 44, 46)", bg);
  check("dark color scheme", scheme === "dark", scheme);
  await darkPage.screenshot({ path: "/tmp/g20-dark.png", fullPage: true });

  const stale = await open(browser, url(port, sample({ ts: Math.floor(Date.now() / 1000) - 3600 }), light));
  check("stale banner", (await stale.locator(".note.warn").innerText()).includes("Лучше обновить"));
  check("hour plural", (await stale.locator(".foot").last().innerText()).includes("час"));

  const empty = await open(browser, url(port, sample({ vpn: 0, n: [], c: [], hg: 0, co: 0, sub: {} }), light));
  check("empty devices", (await empty.locator("#app").innerText()).includes("В списке никого нет"));
  check("no server list while vpn off", await empty.locator(".srv").count() === 0);

  const bare = await open(browser, url(port, null, light));
  check("inside without snapshot", (await bare.locator("#app").innerText()).includes("Нет свежих данных"));
  await armConfirm(bare);
  await bare.locator("#refresh").click();
  check("empty refresh sends", (await sent(bare)).some((c) => c.a === "refresh"));

  const corrupt = await open(browser, "http://127.0.0.1:" + port + "/index.html?s=" + Buffer.from(JSON.stringify({ nope: 1 })).toString("base64url") + "#" + hashFor(light));
  check("corrupt snapshot", (await corrupt.locator("#app").innerText()).includes("повреждены"));

  const broken = await open(browser, url(port, sample({ c: [["битый", 1, "m", null, 1, -20], ["Живой", 9, "m", "abcdefabcdef", 1, -33]] }), light));
  check("bad row does not kill the panel", (await broken.locator("#app").innerText()).includes("Живой") && !(await broken.locator("#app").innerText()).includes("Панель не открылась"));
  check("skipped note", (await broken.locator("#app").innerText()).includes("пропущена"));

  const nosub = await open(browser, url(port, sample({ sub: {} }), light));
  check("octet fallback", (await nosub.locator("#app").innerText()).includes(".15") && !(await nosub.locator("#app").innerText()).includes("192.168"));

  const blockedJs = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await blockedJs.route("**/tg.js*", (route) => route.abort());
  await blockedJs.goto(url(port, null, null), { waitUntil: "load" });
  await blockedJs.waitForFunction(() => document.getElementById("app").getAttribute("data-booted") === "1");
  check("script failure is visible", (await blockedJs.locator("#app").innerText()).includes("Не удалось загрузить"));
  await blockedJs.close();

  const pages = [outside, page, guest, servers, editor, rebootPage, darkPage, stale, empty, bare, corrupt, broken, nosub];
  const pageErrors = pages.flatMap((p) => p.__errors || []);
  check("no page errors", pageErrors.length === 0, pageErrors.join(" | "));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nui ok");
