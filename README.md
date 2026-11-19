# EquationMotion

Browser-only renderer that turns a list of LaTeX lines into a step-by-step animated
equation sequence, exported as a transparent PNG frame sequence (plus WebM / GIF / still).

Everything runs client-side: MathJax typesets each line to SVG paths, a canvas reveals the
glyphs in reading order, and the export path re-renders at the exact canvas size so the frames
carry real alpha.

## Why this niche

Derived from the workflow in a Douyin video by *knit网站出海* ("找需求 → 上站"):

1. **拆功能** — the niche is AI explainer-video tools; the crowded part is "PDF → talking-head
   video" (DistilBook, Atlabs, Leadde, Halomind). The underserved slice is the *equation
   overlay* a hard-science creator needs inside their own editor.
2. **看竞争度** — SERP for `manim ai generator` / `latex equation animation` is thin and
   developer-flavoured (GitHub repos, PyPI packages), while `pdf to video` is saturated with
   funded SaaS. Autocomplete confirms tool-intent demand around `math video overlay`,
   `formula animation`, `math overlay transparent video`.
3. **敲定可行** — a single static page, no backend, no API keys, no rendering queue. Ships in a
   day; the only server cost is static hosting.

## Structure

```
index.html                      landing page + studio
assets/app.js                   renderer, timeline, exporters
assets/style.css                design tokens
guides/                         3 SEO write-ups (long-tail intent)
build.py                        rewrites root-absolute URLs for a GitHub Pages base path
```

## Develop

```bash
python3 -m http.server 8899          # http://127.0.0.1:8899/
python3 build.py /equationmotion/    # -> dist/ for a project page at /equationmotion/
```

`build.py` injects `<base href="/equationmotion/">`, strips the leading slash from internal
links, and rewrites canonical/sitemap URLs. For a root-domain deploy pass `/`.

## Export facts (verified, not assumed)

| Format | Alpha | Notes |
| --- | --- | --- |
| PNG sequence (ZIP) | yes, 8-bit | rendered at canvas size; verified RGBA, 98.9% transparent background |
| WebM (VP9) | **no** | `MediaRecorder` output is `yuv420p`; background is baked in |
| GIF | 1-bit | matte colour used instead of a真 alpha channel |
| Poster PNG | yes | single frame, full resolution |
