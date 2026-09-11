/**
 * Vigilant d'alertes — Radar d'inversió
 * Mira preus, volum i notícies de la watchlist i envia avisos per ntfy.sh.
 * Sense claus d'API. Executat per GitHub Actions cada 5 minuts.
 */

import { readFile, writeFile } from "node:fs/promises";

const WATCHLIST = "data/watchlist.json";
const ESTAT = "data/alertes-estat.json";
const HISTORIAL = "data/alertes.json";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

const SESSIONS = {
  us: { start: 13.5, end: 20.0 },
  eu: { start: 7.0, end: 15.5 }
};

function nowUtcHours() {
  const d = new Date();
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

function sessionFraction(yahoo) {
  const s = yahoo.endsWith(".MC") ? SESSIONS.eu : SESSIONS.us;
  const h = nowUtcHours();
  if (h <= s.start) return 0;
  const frac = Math.min((h - s.start) / (s.end - s.start), 1);
  return frac;
}

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.json();
}

async function getText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.text();
}

async function quote(symbol) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(symbol) + "?range=1mo&interval=1d";
  const j = await getJSON(url);
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) throw new Error("sense dades per " + symbol);
  const meta = res.meta || {};
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const closes = q.close || [];
  const vols = q.volume || [];

  const rows = [];
  for (let i = 0; i < closes.length; i++) {
    if (typeof closes[i] === "number") {
      rows.push({ c: closes[i], v: typeof vols[i] === "number" ? vols[i] : null });
    }
  }
  if (!rows.length) throw new Error("sense preus per " + symbol);

  const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : rows[rows.length - 1].c;
  const prev = rows.length >= 2 ? rows[rows.length - 2].c : null;
  const pct = (typeof price === "number" && prev) ? ((price - prev) / prev) * 100 : null;

  const todayVol = rows[rows.length - 1].v;
  const prior = rows.slice(0, -1).map(function (r) { return r.v; }).filter(function (v) { return v; });
  const avg = prior.length ? prior.reduce(function (a, b) { return a + b; }, 0) / prior.length : null;

  return { price: price, prevClose: prev, pct: pct, avgVolume: avg, todayVolume: todayVol };
}

const NEWS_KEYWORDS = [
  "earnings", "results", "revenue", "profit", "guidance", "outlook",
  "upgrade", "downgrade", "price target", "initiates", "raises", "cuts",
  "merger", "acquisition", "takeover", "buyout", "stake", "deal",
  "contract", "partnership", "fda", "approval", "recall", "lawsuit",
  "investigation", "probe", "dividend", "buyback", "ceo", "bankruptcy",
  "surge", "soar", "plunge", "crash", "jump", "tumble", "rally", "halt"
];

function hasKeyword(title) {
  const t = String(title || "").toLowerCase();
  return NEWS_KEYWORDS.some(function (k) { return t.indexOf(k) !== -1; });
}

async function newsFor(name) {
  const q = encodeURIComponent('"' + name + '" stock');
  const url = "https://news.google.com/rss/search?q=" + q + "&hl=en-US&gl=US&ceid=US:en";
  const xml = await getText(url);
  const items = xml.split("<item>").slice(1, 8);
  const out = [];
  for (const it of items) {
    const title = (it.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
    const link = (it.match(/<link>(.*?)<\/link>/s) || [])[1] || "";
    const date = (it.match(/<pubDate>(.*?)<\/pubDate>/s) || [])[1] || "";
    out.push({ title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(), link: link.trim(), date: date.trim() });
  }
  return out;
}

function recent(dateStr, minutes) {
  const t = Date.parse(dateStr);
  if (isNaN(t)) return false;
  return Date.now() - t <= minutes * 60 * 1000;
}

async function notify(topic, title, body, tags) {
  const r = await fetch("https://ntfy.sh/" + topic, {
    method: "POST",
    headers: {
      Title: title,
      Priority: "default",
      Tags: tags || "chart_with_upwards_trend"
    },
    body: body
  });
  if (!r.ok) throw new Error("ntfy HTTP " + r.status);
}

function key(ticker, kind) { return ticker + ":" + kind; }

async function main() {
  const cfg = JSON.parse(await readFile(WATCHLIST, "utf8"));
  let estat = { last: {} };
  try { estat = JSON.parse(await readFile(ESTAT, "utf8")); } catch {}
  let hist = { updated: "", alerts: [] };
  try { hist = JSON.parse(await readFile(HISTORIAL, "utf8")); } catch {}

  const topic = cfg.ntfy_topic;
  const defs = cfg.defaults || {};
  const threshold = defs.threshold_pct || 3;
  const volMult = defs.volume_mult || 1.5;
  const cooldown = defs.cooldown_min || 180;
  const now = Date.now();
  const sent = [];

  for (const s of cfg.symbols || []) {
    try {
      const frac = sessionFraction(s.yahoo || "");
      const symbols = s.yahoo ? [s.yahoo] : [];
      if (!symbols.length) continue;

      // --- Senyal de preu i volum ---
      if (frac > 0.05) {
        const q = await quote(s.yahoo);
        const expected = (q.avgVolume && q.todayVolume) ? q.avgVolume * Math.max(frac, 0.2) : null;
        const volOk = expected ? q.todayVolume >= expected * volMult : true;
        const volTxt = (expected && q.todayVolume)
          ? " Volum " + (q.todayVolume / q.avgVolume).toFixed(2) + "× la mitjana diària."
          : "";
        if (q.pct !== null && Math.abs(q.pct) >= threshold && volOk) {
          const k = key(s.ticker, "price");
          const last = estat.last[k] || 0;
          if (now - last > cooldown * 60 * 1000) {
            const dir = q.pct >= 0 ? "puja" : "cau";
            const title = s.ticker + " " + dir + " " + q.pct.toFixed(2) + "%";
            const body = s.name + " (" + s.ticker + "): " + q.price + " " +
              (q.pct >= 0 ? "+" : "") + q.pct.toFixed(2) + "% al dia." + volTxt +
              " Avís automàtic, no és consell financer.";
            await notify(topic, title, body, q.pct >= 0 ? "chart_with_upwards_trend" : "chart_with_downwards_trend");
            estat.last[k] = now;
            sent.push({ ticker: s.ticker, kind: "price", title: title, body: body, time: new Date().toISOString(), pct: Number(q.pct.toFixed(2)) });
          }
        }
      }

      // --- Senyal de notícies (només titulars recents i rellevants) ---
      const news = await newsFor(s.name);
      const fresh = news.filter(function (n) { return recent(n.date, 45) && hasKeyword(n.title); });
      if (fresh.length) {
        const k = key(s.ticker, "news");
        const last = estat.last[k] || 0;
        if (now - last > cooldown * 60 * 1000) {
          const n = fresh[0];
          const title = "Notícia: " + s.ticker;
          const body = n.title + "\n" + (n.link ? n.link : "");
          await notify(topic, title, body, "newspaper");
          estat.last[k] = now;
          sent.push({ ticker: s.ticker, kind: "news", title: title + " · " + s.name, body: n.title, link: n.link, time: new Date().toISOString() });
        }
      }
    } catch (e) {
      console.error("Error amb " + s.ticker + ": " + e.message);
    }
    await new Promise(function (r) { setTimeout(r, 400); });
  }

  if (sent.length) {
    hist.updated = new Date().toISOString();
    hist.alerts = sent.concat(hist.alerts || []).slice(0, 300);
    await writeFile(HISTORIAL, JSON.stringify(hist, null, 2) + "\n", "utf8");
    await writeFile(ESTAT, JSON.stringify(estat, null, 2) + "\n", "utf8");
    console.log("Enviats " + sent.length + " avisos.");
  } else {
    console.log("Cap avís nou.");
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
