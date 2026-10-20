# Product lens
Score: 4/10 | Vote: FUND IF

## What is strong
- **Experience can be walked end-to-end (own more of it than the free patchwork):** visitar → buscar por bairro/categoria/QuickSearch → mini-site with galeria/WhatsApp → lead captado no CRM → vaga anunciada → evento/turismo as context. That is more of one journey in one login than Google+Instagram+WhatsApp stitched together.
- **Craft is visible where it matters:** `itapoa.online` cantois canonical + sitemap 22 + QuickSearch debounced + distro local (Traefik/LE, 37 tables, verified schema 37/37, images externos mas falhados foram trocados com fallback), and the app's server never creates tables — single source of truth in `MYSQL_SCHEMA.sql`.
- **Constraint is known (80k city, 16 empresas hoje) so focus can be forced:** the hiperlocal wedge is the kind of constraint that, if respected, can make a simple product win by being the only one that covers two bairros well, not all 22 badly.

## What would kill it (the top 3, most dangerous first)
1. **Tries to do everything, so does nothing brilliantly — pitch needs a paragraph.** diretório + mini-site + CRM + vagas + turismo/eventos + lead scoring across 37 tables and 3 plans for ~80k seasonal city. The Product lens asks "what is the one thing?" and this answer is not clear. Until one hero job (ex.: "lead de WhatsApp qualificado em 7 dias") is chosen and the rest is cut or hidden, the first five minutes for both sides will feel generic.
2. **First five minutes are hollow on both sides with 16 listings across 10 categorias/22 bairros.** Visitor sees a thin directory (empty cards in sparse categories); comerciante on bronze sees a listing with no traffic and no feedback loop. Uma estética vazia + sem dados destrói likelihood faster than any copy. Density threshold is unmet and the seams (foto, lead, ranking) are not owned.
3. **Seams are not owned — handoff breaks the experience where it matters.** Foto seam: 3 Unsplash 404 antes do fallback (perda de confiança visual). Lead seam: WhatsApp handoff without confirmation/receipt in product. Search seam: ranking weight (diamond 3/gold 2/bronze 1) is invisible to buyer. Sazonalidade seam: summer vs winter experience is same UI with thinner demand, so delight collapses when the city empties.

## The questions I would ask the founder
- What is the one-sentence pitch at taste level (not a feature list)? Which single hero job must feel delightful in the first five minutes — and which 2–3 bairros/1–2 categorias will you saturate first to make it feel alive?
- Walk me through the first five minutes for a visitor and for a bronze merchant on day 1 — screen by screen. Where do they feel "done" and where do they feel "now what?"
- What will you cut for the next 90 days to make the hero job brilliant (CRM? vagas? turismo?) and what is the single metric that proves the cut was worth it?
- Density: what is the minimum density to feel alive (companies per category per bairro, leads per week) and how will you reach it in the wedge before expanding?
- Seams: who owns the photo gate (local photo vs Unsplash), the lead receipt (in-product confirmation + follow-up), and the ranking transparency (why this company is on top) — and what breaks there on a rainy Tuesday in July?
- Craft: what detail that nobody sees are you proud of (schema single source, SEO canonical, QuickSearch debounce), and what corner are you still cutting visibly?

## If FUND IF: the conditions
- Freeze to one hero job and one-sentence pitch; hide or remove tudo que não serve o hero job for 90 days. No new surface (37 tables is the ceiling, not the floor) until retention on the hero job with real payers.
- Prove first five minutes with density in 2–3 bairros / 1–2 categorias: fill the wedge so every visitor sees at least 4–6 live companies and every new payer gets a tangible result in 7 days (not SEO-later).
- Own or remove seams: photo gate (local fotos or verified shoot), in-product lead receipt and ranking explainer, and a winter-mode experience — or do not ship the seam.
- Hit simplicity/taste bar: one sentence pitch, one hero flow, no paragraph needed. If you cannot say it in one breath, keep cutting.
- Open number for others: simplicity bar proxy is CAC/LTV (`cfo` + `consumer` + `competitors`), but the Product lens judges it by whether the pitch needed a paragraph — pass is when the hero job is so clear that payers can repeat it back.
