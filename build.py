#!/usr/bin/env python3
"""Static build: rewrite root-absolute URLs for a project-page base path."""
import re, shutil, pathlib, sys

BASE = sys.argv[1] if len(sys.argv) > 1 else "/equationmotion/"
SITE = "https://xiaoqiangch.github.io/equationmotion/"
SRC = pathlib.Path(__file__).parent
DST = SRC / "dist"

if DST.exists():
    shutil.rmtree(DST)
shutil.copytree(SRC / "assets", DST / "assets")
shutil.copytree(SRC / "guides", DST / "guides")
for name in ("index.html", "404.html", "robots.txt", "sitemap.xml", "_headers"):
    shutil.copy(SRC / name, DST / name)

for html in DST.rglob("*.html"):
    s = html.read_text(encoding="utf-8")
    s = s.replace('href="/#', 'href="./#')          # cross-page anchors stay inside the base
    s = s.replace('href="/', 'href="').replace('src="/', 'src="')
    s = s.replace('href=""', 'href="./"')
    s = re.sub(r'(?<!\.)href="(#)', r'href="\1', s)
    s = s.replace("https://equationmotion.pages.dev/", SITE)
    if "<base " not in s:
        s = s.replace("<head>", f'<head>\n<base href="{BASE}">', 1)
    html.write_text(s, encoding="utf-8")

# sitemap + robots
sm = (DST / "sitemap.xml").read_text(encoding="utf-8").replace("https://equationmotion.pages.dev/", SITE)
(DST / "sitemap.xml").write_text(sm, encoding="utf-8")
rb = (DST / "robots.txt").read_text(encoding="utf-8").replace("https://equationmotion.pages.dev/sitemap.xml", SITE + "sitemap.xml")
(DST / "robots.txt").write_text(rb, encoding="utf-8")
print("built ->", DST, "base:", BASE)
