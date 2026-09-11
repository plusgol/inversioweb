/* TradingView widgets — carregats des de data/cartera.json i data/radar.json */
(function () {
  var FALLBACK_SYMBOLS = [
    { ticker: "QDVE", tv: "XETR:QDVE", name: "S&P 500 Info Tech" },
    { ticker: "ASML", tv: "AMS:ASML", name: "ASML" },
    { ticker: "BYD", tv: "HKEX:1211", name: "BYD" },
    { ticker: "SPCX", tv: "NASDAQ:SPCX", name: "SpaceX" },
    { ticker: "PL", tv: "NYSE:PL", name: "Planet Labs" }
  ];

  function getJSON(url) {
    if (location.protocol === "file:") return Promise.reject(new Error("file://"));
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function embed(container, src, config) {
    if (!container || container.dataset.tvdone) return;
    container.dataset.tvdone = "1";
    container.innerHTML = "";
    var host = document.createElement("div");
    host.className = "tradingview-widget-container";
    host.style.height = "100%";
    var inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    host.appendChild(inner);
    container.appendChild(host);
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = src;
    s.async = true;
    s.innerHTML = JSON.stringify(config);
    host.appendChild(s);
  }

  function miniChart(container, symbol) {
    embed(container, "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js", {
      symbol: symbol, width: "100%", height: 200, locale: "ca",
      dateRange: "1M", colorTheme: "dark", isTransparent: true, autosize: true, noTimeScale: false
    });
  }

  function advancedChart(container, symbol) {
    embed(container, "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js", {
      autosize: true, symbol: symbol, interval: "D", timezone: "Europe/Madrid",
      theme: "dark", style: "1", locale: "ca", backgroundColor: "rgba(23,23,23,1)",
      gridColor: "rgba(34,34,34,1)", hide_top_toolbar: false, hide_legend: false,
      allow_symbol_change: true, save_image: false, calendar: false,
      support_host: "https://www.tradingview.com"
    });
  }

  function technical(container, symbol) {
    embed(container, "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js", {
      interval: "1D", width: "100%", isTransparent: true, height: 400,
      symbol: symbol, showIntervalTabs: true, displayMode: "single",
      locale: "ca", colorTheme: "dark"
    });
  }

  function symbolInfo(container, symbol) {
    embed(container, "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js", {
      symbol: symbol, width: "100%", locale: "ca", colorTheme: "dark", isTransparent: true
    });
  }

  function scan() {
    document.querySelectorAll("[data-chart]").forEach(function (el) { miniChart(el, el.getAttribute("data-chart")); });
    document.querySelectorAll("[data-bigchart]").forEach(function (el) { advancedChart(el, el.getAttribute("data-bigchart")); });
    document.querySelectorAll("[data-tech]").forEach(function (el) { technical(el, el.getAttribute("data-tech")); });
    document.querySelectorAll("[data-info]").forEach(function (el) { symbolInfo(el, el.getAttribute("data-info")); });
  }

  function tickerTape(items) {
    var el = document.getElementById("ticker-tape");
    if (!el || !items.length) return;
    embed(el, "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js", {
      symbols: items.map(function (i) { return { proName: i.tv, title: i.ticker }; }),
      showSymbolLogo: false, colorTheme: "dark", isTransparent: true,
      displayMode: "adaptive", locale: "ca"
    });
  }

  function renderGrid(gridId, list, live) {
    var grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><h3>Encara no hi ha res</h3><p>Quan hi hagi posicions o candidats, aquí veuràs el preu en directe.</p></div>';
      return;
    }
    list.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "widget-box" + (live ? " live" : "");
      var lbl = document.createElement("div");
      lbl.className = "wlabel";
      lbl.textContent = (p.nom || p.name || p.ticker) + (typeof p.valor_actual === "number"
        ? " · " + p.valor_actual.toLocaleString("ca-ES", { maximumFractionDigits: 2 }) + " €" : "");
      card.appendChild(lbl);
      var box = document.createElement("div");
      card.appendChild(box);
      grid.appendChild(card);
      miniChart(box, p.tv || p.ticker);
    });
  }

  window.RadarWidgets = { scan: scan, embed: embed, getJSON: getJSON };

  Promise.all([
    getJSON("data/cartera.json").catch(function () { return { posicions: [] }; }),
    getJSON("data/radar.json").catch(function () { return { empreses: [] }; })
  ]).then(function (res) {
    var cartera = res[0] || { posicions: [] };
    var radar = res[1] || { empreses: [] };

    var tape = [];
    (cartera.posicions || []).forEach(function (p) {
      if (p.tv) tape.push({ ticker: p.ticker, tv: p.tv, name: p.nom });
    });
    (radar.empreses || []).forEach(function (c) {
      if (c.tv && !tape.some(function (t) { return t.tv === c.tv; })) {
        tape.push({ ticker: c.ticker, tv: c.tv, name: c.name });
      }
    });
    if (!tape.length) tape = FALLBACK_SYMBOLS;

    tickerTape(tape);
    renderGrid("portfolio-widgets", cartera.posicions || [], true);
    renderGrid("radar-widgets", (radar.empreses || []).filter(function (e) { return !e.cartera; }), false);
    scan();
  });
})();
