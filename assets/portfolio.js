/* Renderitza la cartera detallada i el radar. Depèn de window.RadarWidgets (widgets.js) */
(function () {
  function getJSON(url) {
    if (location.protocol === "file:") return Promise.reject(new Error("file://"));
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function fmt(n, d) {
    if (n === null || n === undefined) return "—";
    return Number(n).toLocaleString("ca-ES", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 2 });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  var ACTION = {
    buy: { cls: "buy", label: "COMPRAR" },
    wait: { cls: "wait", label: "ESPERAR" },
    reduce: { cls: "reduce", label: "REDUIR" }
  };
  function scoreCls(s) { return s >= 75 ? "high" : (s >= 45 ? "mid" : "low"); }

  function metricChips(p) {
    var m = p.metrics || {};
    var chips = [];
    function chip(k, v) { if (v !== null && v !== undefined && v !== "") chips.push('<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'); }
    chip("Pes cartera", fmt(p.pes_pct, 1) + "%");
    chip("Horitzó", p.horitzo || "—");
    if (m.per !== null && m.per !== undefined) chip("PER", fmt(m.per, 1) + "×");
    if (m.per_fwd) chip("PER forward", fmt(m.per_fwd, 1) + "×");
    if (m.per_index) chip("PER índex", fmt(m.per_index, 1) + "×");
    if (m.mcap) chip("Capitalització", m.mcap);
    if (m.preu_ref) chip("Preu ref.", fmt(m.preu_ref, 2));
    if (m.range52 && m.range52[0]) chip("Mínim 52 set.", fmt(m.range52[0], 2));
    if (m.data_ref) chip("Dades de", m.data_ref);
    if (m.extra) chip("Detalls", m.extra);
    return chips.join("");
  }

  function scoreBars(p) {
    var d = p.score_detail;
    if (!d) return "";
    var rows = [
      ["Moment", d.moment, 35],
      ["Fonamentals", d.fonamentals, 25],
      ["Valoració", d.valoracio, 20],
      ["Analistes", d.analistes, 10],
      ["Risc", d.risc, 10]
    ];
    return '<div class="score-detail">' + rows.map(function (r) {
      var pct = Math.max(0, Math.min(100, (r[1] / r[2]) * 100));
      var low = pct < 50 ? " low" : "";
      return '<div class="sd-row"><span>' + r[0] + '</span>' +
        '<span class="sd-bar"><span class="sd-fill' + low + '" style="width:' + pct + '%"></span></span>' +
        '<span class="sd-val">' + r[1] + '/' + r[2] + '</span></div>';
    }).join("") + '</div>';
  }

  function analysisCard(p) {
    var act = ACTION[p.accio] || ACTION.wait;
    var up = p.pl_eur >= 0;
    var bullets = (p.analisi || []).map(function (t) {
      return "<li>" + esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") + "</li>";
    }).join("");
    return '<article class="card pos-card">' +
      '<div class="pos-top"><div><h3>' + esc(p.nom) + ' <span class="ticker">' + esc(p.ticker) + '</span></h3>' +
      '<div class="meta">' + esc(p.tipus || "") + ' · ' + esc(p.moment || "") + '</div></div>' +
      '<div style="text-align:right"><div class="pl-big ' + (up ? "up" : "down") + '">' + (up ? "+" : "") + fmt(p.pl_eur) + ' €</div>' +
      '<div class="meta">' + (up ? "+" : "") + fmt(p.pl_pct, 2) + '% · <span class="action ' + act.cls + '">' + act.label + '</span> <span class="score ' + scoreCls(p.score) + '">' + p.score + '</span></div></div></div>' +
      '<div class="metrics">' + metricChips(p) + '</div>' +
      '<div class="chart-slot" data-chart="' + esc(p.tv) + '"></div>' +
      '<div class="analysis"><h4>Per què (detall)</h4><ul>' + bullets + '</ul>' +
      '<div class="risk"><b>Invalidació:</b> ' + esc(p.invalidacio || "") + '</div></div>' +
      '<div><h4 style="margin:0 0 8px;font-size:16px;font-weight:500">Puntuació desglossada</h4>' + scoreBars(p) + '</div>' +
      '<div class="tech-slot" data-tech="' + esc(p.tv) + '"></div>' +
      '<div class="source">Font: ' + esc(p.source || "—") + '</div>' +
      '</article>';
  }

  function renderSummary(c) {
    var r = c.resum || {};
    var set = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
    set("s-valor", fmt(r.valor_total) + " €");
    set("s-cost", fmt(r.cost_total) + " €");
    set("s-efectiu", fmt(c.efectiu) + " €");
    var plEl = document.getElementById("s-pl");
    if (plEl) {
      plEl.textContent = (r.pl_total > 0 ? "+" : "") + fmt(r.pl_total) + " €";
      plEl.style.color = r.pl_total >= 0 ? "var(--color-signal-mint)" : "var(--color-signal-down)";
    }
    set("s-plpct", (r.pl_pct > 0 ? "+" : "") + fmt(r.pl_pct, 2) + "% · " + (c.posicions || []).length + " posicions");
    var a = document.getElementById("s-alerta");
    if (a && r.alerta_concentracio) {
      a.hidden = false;
      a.innerHTML = "<b>Vigila la concentració.</b> " + esc(r.alerta_concentracio);
    }
  }

  function renderTable(c) {
    var body = document.getElementById("portfolio-body") || document.getElementById("posicions-body");
    if (!body) return;
    body.innerHTML = "";
    (c.posicions || []).forEach(function (p) {
      var act = ACTION[p.accio] || ACTION.wait;
      var up = p.pl_eur >= 0;
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(p.nom) + " <span class='lbl'>" + esc(p.ticker) + "</span></td>" +
        "<td class='num'>" + fmt(p.cost) + " €</td>" +
        "<td class='num'>" + fmt(p.valor_actual) + " €</td>" +
        "<td class='num " + (up ? "up" : "down") + "'>" + (up ? "+" : "") + fmt(p.pl_eur) + " €</td>" +
        "<td class='num " + (up ? "up" : "down") + "'>" + (up ? "+" : "") + fmt(p.pl_pct, 2) + "%</td>" +
        "<td class='num'>" + fmt(p.pes_pct, 1) + "%</td>" +
        "<td><span class='score " + scoreCls(p.score) + "'>" + p.score + "</span></td>" +
        "<td><span class='action " + act.cls + "'>" + act.label + "</span></td>" +
        "<td class='lbl'>" + esc(p.horitzo || "—") + "</td>";
      body.appendChild(tr);
    });
  }

  function renderAnalysis(c) {
    var box = document.getElementById("portfolio-analysis") || document.getElementById("analisi");
    if (!box) return;
    box.innerHTML = "";
    (c.posicions || []).forEach(function (p) {
      var wrap = document.createElement("div");
      wrap.innerHTML = analysisCard(p);
      box.appendChild(wrap.firstChild);
    });
  }

  function renderRadar(radar) {
    var tb = document.getElementById("radar-body");
    if (!tb || !radar) return;
    tb.innerHTML = "";
    (radar.empreses || []).filter(function (e) { return !e.cartera; }).forEach(function (e) {
      var a = ACTION[e.action] || ACTION.wait;
      var upCls = (e.upside_pct >= 0) ? "up" : "down";
      var upTxt = (e.upside_pct === null || e.upside_pct === undefined) ? "—"
        : (e.upside_pct > 0 ? "+" : "") + fmt(e.upside_pct, 1) + "%";
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(e.name) + " <span class='lbl'>" + esc(e.ticker) + "</span></td>" +
        "<td class='num'>" + (e.price ? fmt(e.price, 2) : "—") + "</td>" +
        "<td class='num'>" + (e.target ? fmt(e.target, 2) : "—") + "</td>" +
        "<td class='num " + upCls + "'>" + upTxt + "</td>" +
        "<td class='lbl'>" + esc(e.moment || "—") + "</td>" +
        "<td><span class='score " + scoreCls(e.score) + "'>" + e.score + "</span></td>" +
        "<td><span class='action " + a.cls + "'>" + a.label + "</span></td>" +
        "<td class='lbl'>" + esc(e.horitzo || "—") + "</td>";
      tb.appendChild(tr);
    });
  }

  Promise.all([
    getJSON("data/cartera.json").catch(function () { return null; }),
    getJSON("data/radar.json").catch(function () { return null; })
  ]).then(function (res) {
    var c = res[0], radar = res[1];
    if (c) {
      renderSummary(c);
      renderTable(c);
      renderAnalysis(c);
    }
    renderRadar(radar);
    if (window.RadarWidgets && window.RadarWidgets.scan) window.RadarWidgets.scan();
  });
})();
