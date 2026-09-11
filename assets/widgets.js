/* TradingView widgets — carregats des de data/cartera.json i data/radar.json */
(function () {
  var FALLBACK_SYMBOLS = [
    { ticker: "META", tv: "NASDAQ:META", name: "Meta Platforms" },
    { ticker: "YUM", tv: "NYSE:YUM", name: "Yum Brands" },
    { ticker: "CASY", tv: "NASDAQ:CASY", name: "Casey's" },
    { ticker: "CAT", tv: "NYSE:CAT", name: "Caterpillar" },
    { ticker: "NBIS", tv: "NASDAQ:NBIS", name: "Nebius" },
    { ticker: "CLNX", tv: "BME:CLNX", name: "Cellnex" },
    { ticker: "ITX", tv: "BME:ITX", name: "Inditex" },
    { ticker: "CABK", tv: "BME:CABK", name: "CaixaBank" }
  ];

  function getJSON(url) {
    if (location.protocol === "file:") return Promise.reject(new Error("file://"));
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function embed(container, src, config) {
    var host = document.createElement("div");
    host.className = "tradingview-widget-container";
    var inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    host.appendChild(inner);
    container.appendChild(host);
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = src;
    s.async = true;
    s.innerHTML = JSON.stringify(config);
    host.appendChild(s);
  }

  function tickerTape(items) {
    var el = document.getElementById("ticker-tape");
    if (!el || !items.length) return;
    embed(el, "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js", {
      symbols: items.map(function (i) { return { proName: i.tv, title: i.ticker }; }),
      showSymbolLogo: false,
      colorTheme: "dark",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "ca"
    });
  }

  function miniChart(container, symbol, name) {
    if (!container) return;
    embed(container, "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js", {
      symbol: symbol,
      width: "100%",
      height: 200,
      locale: "ca",
      dateRange: "1M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
      noTimeScale: false
    });
  }

  function renderRadar(list) {
    var grid = document.getElementById("radar-widgets");
    if (!grid) return;
    grid.innerHTML = "";
    list.forEach(function (c) {
      var card = document.createElement("div");
      card.className = "widget-box";
      var lbl = document.createElement("div");
      lbl.className = "wlabel";
      lbl.textContent = c.name + " · " + c.ticker;
      card.appendChild(lbl);
      var box = document.createElement("div");
      card.appendChild(box);
      grid.appendChild(card);
      miniChart(box, c.tv, c.name);
    });
  }

  function renderPortfolio(list) {
    var grid = document.getElementById("portfolio-widgets");
    if (!grid) return;
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><h3>Encara no tens posicions</h3><p>Omple <code>data/cartera.json</code> o demana a l\'assistent que hi afegeixi les teves compres. Quan hi hagi posicions, aquí veuràs el preu en directe de cadascuna.</p></div>';
      return;
    }
    list.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "widget-box live";
      var lbl = document.createElement("div");
      lbl.className = "wlabel";
      lbl.textContent = (p.nom || p.ticker) + " · " + (p.quantitat || 0) + " títols";
      card.appendChild(lbl);
      var box = document.createElement("div");
      card.appendChild(box);
      grid.appendChild(card);
      miniChart(box, p.tv || p.ticker, p.nom || p.ticker);
    });
  }

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
    renderRadar(radar.empreses || []);
    renderPortfolio(cartera.posicions || []);
  });
})();
