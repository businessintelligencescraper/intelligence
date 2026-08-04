"use strict";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* minimal markdown → html: headings, bold, italics, links, lists, paragraphs */
function md(src){
  const lines = String(src || "").split(/\r?\n/);
  const out = []; let inList = false;
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  for (const ln of lines){
    if (/^\s*[-*] /.test(ln)){
      if (!inList){ out.push("<ul>"); inList = true; }
      out.push("<li>" + inline(ln.replace(/^\s*[-*] /, "")) + "</li>");
      continue;
    }
    if (inList){ out.push("</ul>"); inList = false; }
    const h = ln.match(/^(#{1,3}) +(.*)/);
    if (h){ out.push(`<h${h[1].length}>` + inline(h[2]) + `</h${h[1].length}>`); continue; }
    if (ln.trim() === "") continue;
    out.push("<p>" + inline(ln) + "</p>");
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

/* ---- dates ---- */
const today = () => new Date().toISOString().slice(0,10);
const seenOn = it => it.first_seen || it.date || "";

function fmtDate(d){
  try { return new Date(d + "T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"}); }
  catch(e){ return d; }
}
function fmtShort(d){
  try { return new Date(d + "T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}); }
  catch(e){ return d; }
}
/* Monday of the week containing d (YYYY-MM-DD) */
function weekStart(d){
  const dt = new Date(d + "T12:00:00");
  const dow = (dt.getDay() + 6) % 7;            // Mon = 0
  dt.setDate(dt.getDate() - dow);
  return dt.toISOString().slice(0,10);
}
function fmtWeek(startISO){
  const a = new Date(startISO + "T12:00:00");
  const b = new Date(a); b.setDate(b.getDate() + 6);
  const sameMonth = a.getMonth() === b.getMonth();
  const opt = {month:"short", day:"numeric"};
  const left = a.toLocaleDateString(undefined, opt);
  const right = b.toLocaleDateString(undefined, sameMonth ? {day:"numeric"} : opt);
  return `Week of ${left} – ${right}, ${b.getFullYear()}`;
}

/* ---- rendering ---- */
const relClass = r => /Executive|Messaging/.test(r || "") ? "b-rel hot" : "b-rel";

function renderCard(it){
  const primary = (it.sources && it.sources[0]) || {};
  const pub = it.date && it.date !== seenOn(it)
    ? ` <span class="pub">· published ${esc(fmtShort(it.date))}</span>` : "";
  return `<div class="card">
    <div class="badges">
      <span class="badge b-cat">${esc(it.category || "")}</span>
      <span class="badge b-risk-${esc(it.risk || "Low")}">${esc(it.risk || "")} risk</span>
      <span class="badge ${relClass(it.comms_relevance)}">${esc(it.comms_relevance || "")}</span>
    </div>
    <h3>${primary.url ? `<a href="${esc(primary.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>` : esc(it.title)}</h3>
    <p class="summary">${esc(it.summary || "")}</p>
    ${it.why_it_matters ? `<p class="why"><b>Why it matters:</b> ${esc(it.why_it_matters)}</p>` : ""}
    ${it.recommended_action ? `<p class="action">Recommended: ${esc(it.recommended_action)}</p>` : ""}
    <div class="srcs">${(it.sources || []).map(s =>
      `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.outlet || "source")}</a>`).join(" · ")}${pub}</div>
  </div>`;
}

const RISK_RANK = {High:0, Medium:1, Low:2};

/* Group items into dated buckets. mode = "day" | "week" */
function groupItems(items, mode){
  const buckets = {};
  for (const it of items){
    const key = mode === "week" ? weekStart(seenOn(it)) : seenOn(it);
    (buckets[key] = buckets[key] || []).push(it);
  }
  return Object.keys(buckets).sort().reverse().map(key => ({
    key,
    label: mode === "week" ? fmtWeek(key)
         : (key === today() ? "Today · " : "") + fmtDate(key),
    items: buckets[key].sort((a,b) => (RISK_RANK[a.risk] ?? 3) - (RISK_RANK[b.risk] ?? 3))
  }));
}

function renderGroups(groups, emptyMsg){
  if (!groups.length) return `<div class="empty">${esc(emptyMsg)}</div>`;
  return groups.map(g =>
    `<div class="day">${esc(g.label)}</div>` + g.items.map(renderCard).join("")
  ).join("");
}

/* ---- data ---- */
async function loadData(){
  const r = await fetch("data.json?t=" + Date.now());
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function setMeta(el, data){
  const n = (data.items || []).length;
  el.textContent = data.generated_at
    ? `Last updated ${new Date(data.generated_at).toLocaleString()} · ${n} item${n === 1 ? "" : "s"} on file`
    : "Waiting for the first agent run";
}
