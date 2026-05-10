---
title: 
subtitle: 
date: <% tp.date.now("YYYY-MM-DD") %>
category: Meaning
minutes: 
kind: Short Essay
featured: false
gated: false
series: 
series_order: 
series_subtitle: 
series_description: 
pathway_for: 
pathway_intro: 
is_welcome: false
cover: posts/covers/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") %>.png
excerpt: 
---

> **Quick reference (delete this block before publishing)**
>
> **Required:** `title`, `date`, `excerpt`
>
> **Categorization:** `category` (Meaning · Stuckness · Practice · Self), `minutes`, `kind` (Short Essay · Essay · Letter), `featured` (only one true at a time)
>
> **Series — fill on every essay in the series:**
> - `series:` the series name (e.g. "Begin Here")
> - `series_order:` 1, 2, 3...
>
> **Series metadata — fill on the FIRST essay of the series only (or any one essay):**
> - `series_subtitle:` italic line shown under series name (e.g. "If you're new")
> - `series_description:` paragraph shown on the series page
> - `pathway_for:` if filled, becomes a Pathway with the ribbon "For [value]" (e.g. "the grieving"). Leave blank for plain series.
> - `pathway_intro:` instructions shown at the top of the pathway page (e.g. "Read these in order. Take a day between each.")
> - `is_welcome:` true makes this the "Start here" pathway
>
> **Gating:** `gated: true` shows a signup form after the 3rd paragraph (configurable via `gate_after_paragraph`)

Open with the hook.

Then the body.

End with the line that lands.
