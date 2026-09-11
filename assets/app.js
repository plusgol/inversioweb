// Cerca i filtre de l'arxiu d'informes
(function () {
  var input = document.getElementById("archive-search");
  if (input) {
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().trim();
      document.querySelectorAll(".report-item").forEach(function (el) {
        var text = el.textContent.toLowerCase();
        el.style.display = text.indexOf(q) === -1 ? "none" : "";
      });
    });
  }
})();

// Botó "Copiar resum per WhatsApp"
(function () {
  var btn = document.getElementById("copy-wa");
  var src = document.getElementById("wa-summary");
  if (!btn || !src) return;
  btn.addEventListener("click", function () {
    var text = src.textContent.trim();
    var done = function () {
      var old = btn.textContent;
      btn.textContent = "Copiat!";
      setTimeout(function () { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
    } else {
      fallback(text, done);
    }
  });
  function fallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { alert(text); }
    document.body.removeChild(ta);
  }
})();

// Filtre per etiqueta dins d'un informe
(function () {
  var chips = document.querySelectorAll("[data-filter]");
  if (!chips.length) return;
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      document.querySelectorAll("[data-tag]").forEach(function (card) {
        card.style.display = (f === "all" || card.getAttribute("data-tag") === f) ? "" : "none";
      });
    });
  });
})();
