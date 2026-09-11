# Radar d'inversió

Web estàtica amb un **informe diari d'inversió**: oportunitats potencials i resum de mercats, amb la font de cada punt.

- **Prototip sense API**: l'informe es genera manualment (l'assistent busca les notícies i escriu els fitxers).
- **Cost**: 0 €. Només cal allotjament estàtic gratuït (GitHub Pages).

## Estructura

```
index.html                 Portada + arxiu
reports/AAAA-MM-DD.html    Un informe per dia
data/reports.json          Índex dels informes (metadades)
assets/style.css           estil
assets/app.js              cerca, filtre i botó "Copiar resum WhatsApp"
```

## Com generar l'informe d'un dia

1. Demana a l'assistent: **«actualitza»** (opcionalment passa-li enllaços concrets).
2. L'assistent cerca a les fonts, redacta `reports/AAAA-MM-DD.html` i actualitza l'arxiu.
3. Afegeix l'entrada nova a `index.html` (bloc `#archive`) i a `data/reports.json`.

## Com publicar

Primer cop:

```powershell
git init
git add .
git commit -m "primer informe"
git branch -M main
git remote add origin https://github.com/plusgol/inversioweb.git
git push -u origin main
```

A GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.
La web queda a `https://plusgol.github.io/inversioweb/`.

Cada dia:

```powershell
git add .
git commit -m "informe DD-MM-AAAA"
git push
```

## Veure-ho en local

Obre `index.html` al navegador. Si el navegador bloqueja alguna cosa, arrenca un servidor local:

```powershell
python -m http.server 8000
```

I visita `http://localhost:8000`.

## Categories per àrea geogràfica

Cada informe agrupa les empreses en quatre blocs, segons la seu social principal:

- **Empreses catalanes** (groc)
- **Empreses espanyoles**, fora de Catalunya (vermell)
- **Empreses europees**, fora d'Espanya (blau)
- **Empreses mundials**, fora d'Europa (verd)

## Etiquetes dels informes

- **notícia**: fet publicat per un mitjà.
- **estimació**: opinió, preu objectiu o previsió d'un analista o mitjà.
- **rumor**: informació no confirmada.

## Avis

Contingut informatiu. No és assessorament financer. Les dades provenen de les fonts citades i poden no ser en temps real.
