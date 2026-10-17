function showFatal(msg){ try { var a=document.getElementById("app"); a.innerHTML='<div class="err"><div style="font-size:40px">⚠️</div><p><b>Ошибка панели</b></p><p style="font-size:12px;word-break:break-word">'+String(msg).replace(/[<>&]/g,"")+'</p><p>Отправьте боту /panel</p></div>'; } catch(e){} }
window.onerror = function(m, src, line, col){ showFatal(m+" @"+line+":"+col); return true; };
function boot(){

const PANEL_VER = "v5 · 17.10 13:50";
const tg = window.Telegram && Telegram.WebApp; if (tg) { tg.ready(); tg.expand(); }
const NODES = {auto:["🇪🇺","Автовыбор провайдера"],pl:["🇵🇱","Польша"],gb:["🇬🇧","Англия"],nl:["🇳🇱","Нидерланды"],ru:["🇷🇺","Санкт-Петербург"],nskru:["🇷🇺","Новосибирск"],fr:["🇫🇷","Франция"],ee:["🇪🇪","Эстония"],se:["🇸🇪","Швеция"],de:["🇩🇪","Германия"],nyus:["🇺🇸","США"],by:["🇧🇾","Беларусь"],kz:["🇰🇿","Казахстан"],am:["🇦🇲","Армения"],mx:["🇲🇽","Мексика"],bg:["🇧🇬","Болгария"],cz:["🇨🇿","Чехия"],sg:["🇸🇬","Сингапур"],"br-rul":["📶","Обход БС #12"],"br-rub":["📶","Обход БС #13"],"rev-ru":["🇷🇺","Из-за рубежа"],"tg-nl":["✈️","Сервер для TG"]};
const BANDS = {l2:"g20 · 2.4", l5:"g20 · 5", g:"Гости", h:"Умный дом"};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function b64json(h) {
  try { h = decodeURIComponent(h).replace(/-/g,"+").replace(/_/g,"/").replace(/\s/g,""); while (h.length % 4) h += "=";
    const bin = atob(h); let txt;
    try { txt = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); } catch (e2) { txt = decodeURIComponent(escape(bin)); }
    const o = JSON.parse(txt);
    return (o && typeof o === "object" && "ts" in o) ? o : null; } catch (e) { return null; }
}
function decode() {
  const cands = [];
  try { const q = new URLSearchParams(location.search); if (q.get("s")) cands.push(q.get("s")); } catch (e) {}
  try { const h = location.hash.slice(1);
    if (h) { const hp = new URLSearchParams(h); if (hp.get("s")) cands.push(hp.get("s")); else if (!/^tgWebApp/.test(h)) cands.push(h); } } catch (e) {}
  try { const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param; if (sp) cands.push(sp); } catch (e) {}
  for (const c of cands) { const o = b64json(c); if (o) return o; }
  return null;
}
const S = decode();
const hap = (t="light") => { try { tg.HapticFeedback.impactOccurred(t); } catch(e){} };
const okHap = () => { try { tg.HapticFeedback.notificationOccurred("success"); } catch(e){} };
function send(obj) {
  if (!tg || !tg.sendData) { alert(JSON.stringify(obj)); return; }
  okHap(); tg.sendData(JSON.stringify(obj));  // closes the Mini App; bot replies in chat
}
function confirmDo(text, obj) { hap("medium"); if (tg && tg.showConfirm) tg.showConfirm(text, ok => ok && send(obj)); else if (confirm(text)) send(obj); }
const nodeLabel = cc => NODES[cc] || ["🌐", cc || "?"];
function devOnline(){ return (S.c||[]).filter(d => Array.isArray(d) && d.length>=5 ? (d[4]&1) : true).length; }
function pingCls(p){ return p<=0 ? "bad" : p<220 ? "ok" : p<400 ? "mid" : "bad"; }
function render() {
  const app = document.getElementById("app");
  if (!S) {
    app.innerHTML = `<div class="err"><div style="font-size:44px">🛜</div><p><b>Нет свежих данных о роутере</b></p>
      <p>Нажмите «Обновить данные» — бот пришлёт новую кнопку «Роутер». Если не сработало, закройте окно и нажмите кнопку «Роутер» внизу чата (или отправьте боту /panel).</p></div>
      <button class="btn" id="refresh">🔄 Обновить данные</button><div class="foot">${PANEL_VER}</div>`;
    document.getElementById("refresh").onclick = () => { hap();
      try { if (tg && tg.sendData && tg.initData === "") { tg.sendData(JSON.stringify({a:"refresh"})); return; } } catch (e) {}
      try { tg.sendData(JSON.stringify({a:"refresh"})); } catch (e) {
        if (tg && tg.showAlert) tg.showAlert("Закройте окно и нажмите кнопку «Роутер» под полем ввода или отправьте /panel."); } };
    return;
  }
  const ago = Math.max(0, Math.round(Date.now()/1000 - S.ts));
  const agoTxt = ago < 60 ? "только что" : ago < 3600 ? Math.round(ago/60)+" мин назад" : Math.round(ago/3600)+" ч назад";
  const byTag = Object.fromEntries((S.n||[]).map(n => [n[0], n]));
  const autoCC = byTag[S.auto] ? byTag[S.auto][1] : null;
  let cur;
  if (!S.vpn) cur = "Выключен";
  else if (S.sel === "AUTO") cur = "Авто → " + nodeLabel(autoCC).join(" ");
  else cur = nodeLabel(byTag[S.sel] ? byTag[S.sel][1] : null).join(" ");
  let h = '';
  h += `<div class="hero">
    <div class="tile"><div class="k">VPN</div><div class="v">${S.vpn ? "🛡️ " + esc(cur) : "⛔ Выключен"}</div></div>
    <div class="tile"><div class="k">Устройств в сети</div><div class="v">📱 ${devOnline()}</div></div>
    <div class="tile"><div class="k">Работает</div><div class="v">⏱ ${esc(S.up)}</div></div>
    <div class="tile"><div class="k">Память · нагрузка</div><div class="v">${esc(S.m)} · ${esc(S.ld)}</div></div>
  </div>`;
  h += `<h2>Управление</h2><div class="card">
    <label class="row"><span class="ic">🛡️</span><div class="t">VPN (Podkop)<div class="s">Заблокированные сайты через VPN, остальное напрямую</div></div>
      <span class="sw"><input type="checkbox" id="vpn" ${S.vpn?"checked":""}><span></span></span></label>
    <label class="row"><span class="ic">👥</span><div class="t">Гостевой Wi‑Fi<div class="s">g20-guest</div></div>
      <span class="sw"><input type="checkbox" id="guest" ${S.g?"checked":""}><span></span></span></label>
    <div class="row"><span class="ic">🚫</span><div class="t">Блокировка рекламы<div class="s">AdGuard Home</div></div><span class="s">${S.a?"работает":"выключена"}</span></div>
  </div>`;
  if (S.vpn && S.n && S.n.length) {
    h += `<h2>Сервер VPN</h2><div class="card">`;
    const ap = byTag[S.auto] ? byTag[S.auto][2] : 0;
    h += `<div class="row srv ${S.sel==="AUTO"?"on":""}" data-t="AUTO"><span class="chk">${S.sel==="AUTO"?"✓":""}</span><span class="ic">⚡</span>
      <div class="t">Авто (лучший)<div class="s">сейчас: ${esc(nodeLabel(autoCC).join(" "))}</div></div><span class="ping ${pingCls(ap)}">${ap>0?ap+" мс":""}</span></div>`;
    for (const [tag, cc, p] of S.n) {
      const [fl, nm] = nodeLabel(cc), on = S.sel === tag;
      h += `<div class="row srv ${on?"on":""} ${p>0?"":"dead"}" data-t="${esc(tag)}"><span class="chk">${on?"✓":""}</span><span class="ic">${fl}</span>
        <div class="t">${esc(nm)}</div><span class="ping ${pingCls(p)}">${p>0?p+" мс":"нет связи"}</span></div>`;
    }
    h += `</div>`;
  }
  const NETS = [["m","🏠 Основная сеть · g20"],["g","👥 Гостевая · g20-guest"],["h","💡 Умный дом · g20-home"]];
  const subnet = {m:"192.168.1.", g:"192.168.2.", h:"192.168.3."};
  for (const [nk, title] of NETS) {
    const list = (S.c||[]).filter(d => d[2] === nk);
    const hidden = nk === "h" ? (S.hg||0) : 0;
    if (!list.length && !hidden) continue;
    h += `<h2>${title}<span class="badge">${list.filter(d=>d[4]&1).length} в сети</span></h2><div class="card">`;
    for (const d of list) {
      const [nm, oct, , mac, fl, sig] = d, on = fl & 1, bl = fl & 2;
      const macF = mac.match(/../g).join(":");
      h += `<div class="row dev ${on?"":"off"}" data-m="${esc(mac)}"><span class="ic">${nk==="h"?"💡":nk==="g"?"👤":"📱"}</span>
        <div class="t">${esc(nm||"Без имени")} ${bl?'<span class="bl">· без интернета</span>':""}<div class="s">${subnet[nk]}${oct} · ${on?(sig?sig+" dBm":"по кабелю"):"не в сети"}</div></div><span class="s">›</span></div>
        <div class="ed" id="ed-${esc(mac)}"><input maxlength="24" placeholder="Имя устройства" value="${esc(nm)}" id="in-${esc(mac)}">
        <div class="s" style="flex:1 1 100%">MAC ${macF}</div>
        <button data-act="ren" data-m="${esc(mac)}">Сохранить имя</button>
        <button class="${bl?"grn":"red"}" data-act="blk" data-v="${bl?0:1}" data-m="${esc(mac)}">${bl?"Разблокировать":"Блок интернета"}</button></div>`;
    }
    if (hidden) h += `<div class="row"><span class="ic">💡</span><div class="t">Ещё ${hidden} устройств умного дома<div class="s">скрыто, чтобы ссылка влезла</div></div></div>`;
    h += `</div>`;
  }
  if (S.co) h += `<div class="foot">Не в сети и скрыто: ${S.co}</div>`;
  h += `<h2>Сеть</h2><div class="card">
    <div class="row"><span class="ic">🌐</span><div class="t">Внешний IP<div class="s">WAN ${esc(S.w)}</div></div><span class="s">${esc(S.e)}</span></div></div>`;
  h += `<h2>Действия</h2><button class="btn" id="speed">📶 Тест скорости</button><button class="btn" id="report">📋 Отчёт за сутки</button><button class="btn" id="refresh">🔄 Обновить данные</button><button class="btn red" id="reboot">⏻ Перезагрузить роутер</button>`;
  h += `<div class="foot">Данные: ${agoTxt} · изменения применяет бот · ${PANEL_VER}</div>`;
  app.innerHTML = h;
  document.getElementById("vpn").onchange = e => { hap(); e.target.checked ? send({a:"vpn",v:1}) : confirmDo("Выключить VPN? Заблокированные сайты перестанут открываться.", {a:"vpn",v:0}) || (e.target.checked = true); };
  document.getElementById("guest").onchange = e => { hap(); send({a:"guest",v:e.target.checked?1:0}); };
  document.getElementById("refresh").onclick = () => { hap(); send({a:"refresh"}); };
  document.getElementById("speed").onclick = () => { hap(); send({a:"speed"}); };
  document.getElementById("report").onclick = () => { hap(); send({a:"report"}); };
  document.querySelectorAll(".dev").forEach(el => el.onclick = () => { hap(); const e = document.getElementById("ed-"+el.dataset.m); e && e.classList.toggle("open"); });
  document.querySelectorAll(".ed button").forEach(b => b.onclick = ev => { ev.stopPropagation(); const m = b.dataset.m;
    if (b.dataset.act === "ren") { const n = (document.getElementById("in-"+m).value||"").trim().slice(0,24); send({a:"ren", m, n}); }
    else { const v = +b.dataset.v; v ? confirmDo("Отключить интернет этому устройству? Локальная сеть останется.", {a:"blk", m, v}) : send({a:"blk", m, v}); } });
  document.getElementById("reboot").onclick = () => confirmDo("Перезагрузить роутер? Интернет пропадёт примерно на 2 минуты.", {a:"reboot"});
  document.querySelectorAll(".srv").forEach(el => el.onclick = () => { hap(); const t = el.dataset.t;
    if ((t==="AUTO" && S.sel==="AUTO") || t===S.sel) return; send({a:"sel", t}); });
}
render();

}
try { boot(); } catch (e) { showFatal((e && e.message) + (e && e.stack ? " | " + String(e.stack).slice(0,300) : "")); }
