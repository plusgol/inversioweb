# Radar d'inversió

Terminal d'inversió estàtic: informe diari, cartera amb preus en directe i alertes automàtiques. Estil visual **Sandclock** (canvas #0a0a0a, targetes #171717, accent menta #3fe280).

- **Cost**: 0 €. GitHub Pages + GitHub Actions + ntfy.sh.
- **Sense API de pagament**: dades públiques i widgets gratuïts de TradingView.

## Estructura

```
index.html                     Portada + arxiu d'informes
reports/AAAA-MM-DD.html        Un informe per dia (només notícies del dia o del dia abans)
cartera.html                   Cartera, preus en directe i radar de compra
alertes.html                   Historial d'alertes + com configurar ntfy
data/cartera.json              La teva cartera (efectiu i posicions)
data/radar.json                Puntuacions i etiquetes del dia (0-100)
data/watchlist.json            Empreses vigilades i llindars d'alerta
data/alertes.json              Historial d'alertes (l'escriu el bot)
data/alertes-estat.json        Anti-repetició (l'escriu el bot)
data/reports.json              Índex dels informes
scripts/alertes.mjs            Vigilant de preus i notícies
.github/workflows/alertes.yml  Execució automàtica cada 5 min (dies feiners)
assets/style.css               Sistema de disseny Sandclock
assets/app.js                  Cerca, filtres i botó "Copiar resum"
assets/widgets.js              Widgets de TradingView
```

## Etiquetes d'acció

- 🟢 **Comprar** — puntuació ≥75 i preu en zona de compra.
- 🟡 **Esperar** — bona empresa, però estirada o amb massa incertesa.
- 🔴 **Reduir** — puntuació <45, tesi trencada o preu per sobre de l'objectiu.

Puntuació Radar: moment 35% · fonamentals 25% · valoració 20% · analistes 10% · risc/catalitzador 10%.

## Regla de frescor de les notícies

Cada informe només inclou notícies publicades el **mateix dia** o, com a màxim, el **dia anterior**.
Cap notícia més antiga entra a l'informe, encara que sigui útil. Si un dia hi ha poques notícies noves, l'informe és més curt: la frescor té prioritat sobre la quantitat.

## Cartera

La cartera actual és a `data/cartera.json` amb valor, cost, P/L, puntuació, acció i horitzó de cada posició.
Per actualitzar-la, edita el fitxer o demana-ho per xat.

```json
{
  "moneda": "EUR",
  "efectiu": 0,
  "posicions": [
    { "ticker": "ASML", "tv": "AMS:ASML", "nom": "ASML", "cost": 200, "valor_actual": 201.71, "pl_eur": 1.71, "pl_pct": 0.86, "score": 70, "accio": "wait", "horitzo": "24+ mesos" }
  ]
}
```

`accio` pot ser `buy`, `wait` o `reduce`.

## Alertes automàtiques (ntfy.sh)

1. Instal·la l'app **ntfy** (iOS/Android).
2. Subscriu-te al tema: **`radar-8f3k9q2m7z4x`**.
3. Configura empreses i llindars a `data/watchlist.json`.

El vigilant (`scripts/alertes.mjs`) s'executa cada 5 minuts en hores de mercat i avisa si:
- una acció es mou **≥3% amb volum alt** (1,5× la mitjana esperada), o
- surt una **notícia recent** d'aquella empresa.

Cada avís té 3 hores de cooldown per empresa i motiu. L'historial queda a `alertes.html`.

> Els temes de ntfy.sh són públics: qualsevol que sàpiga el nom pot llegir-los. Fes servir un nom difícil d'endevinar i no hi posis dades personals.

## Publicar

```powershell
git add .
git commit -m "informe DD-MM-AAAA"
git push
```

GitHub Pages: **Settings → Pages → Branch `main` / `/ (root)`**.
Web: `https://plusgol.github.io/inversioweb/`

## Avis

Contingut informatiu. **No és assessorament financer.** Els percentatges de potencial provenen de preus objectiu d'analistes citats i poden no complir-se. Les etiquetes d'acció són regles explícites sobre dades públiques, no prediccions.
