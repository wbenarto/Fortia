# Fortia icon round 9: the ringed-O FORTIA wordmark, made bigger for the iPhone icon.
# Run: python3 generate.py  (writes icon SVGs and preview.html)
BG = "#E3BBA1"; INK = "#262135"
CAP = 108

# Each letter: (width, svg body drawn from x=0, cap height 0..108). sw = stroke width.
def F(sw, c):  h = sw/2; return 67, [f"M{h} 0V{CAP}", f"M0 {h}H67", "M0 54H50"]
def R(sw, c):  h = sw/2; r = 25.5 - h/2; return 62.5, [f"M0 {h}H37A{r} {r} 0 0 1 37 54H0", "M25 54L60 108"]
def T(sw, c):  return 73, ["M0 {0}H73".format(sw/2), "M36.5 0V108"]
def I(sw, c):  return sw, [f"M{sw/2} 0V108"]
def A(sw, c):  return 86, ["M0 108L43 0L86 108"]
def O(sw, c):  return 114, None   # rings, drawn separately
LETTERS = {"F": F, "O": O, "R": R, "T": T, "I": I, "A": A}
GAP = {("F", "O"): 14}  # F's open arms need less room

def rings(cx, cy, sw, c, k=1.0):
    return "".join(f'<circle cx="{cx}" cy="{cy}" r="{r*k}" fill="none" stroke="{c}" stroke-width="{sw}"/>'
                   for r in (57, 45, 33, 21))

def row(word, sw, c, width=None):
    """One line of letters. With width, the gaps stretch so the row fills it exactly."""
    parts = [(ch, *LETTERS[ch](sw, c)) for ch in word]
    gaps = [GAP.get((a, b), 28) for a, b in zip(word, word[1:])]
    natural = sum(w for _, w, _ in parts) + sum(gaps)
    if width: gaps = [g + (width - natural) / len(gaps) for g in gaps]
    x, out = 0, []
    for i, (ch, w, paths) in enumerate(parts):
        if paths is None: out.append(rings(x + 57, 54, sw, c))
        else: out.append(f'<g transform="translate({x} 0)">' + "".join(f'<path d="{d}"/>' for d in paths) + "</g>")
        x += w + (gaps[i] if i < len(gaps) else 0)
    body = f'<g fill="none" stroke="{c}" stroke-width="{sw}" stroke-linejoin="miter" stroke-miterlimit="10">{"".join(out)}</g>'
    return body, x

def block(lines, sw, c, align="center", justify=False, lead=52):
    """Stack lines; returns body in a local box and its (w, h)."""
    rows = [row(l, sw, c) for l in lines]
    W = max(w for _, w in rows)
    if justify: rows = [row(l, sw, c, W) for l in lines]
    out = []
    for i, (b, w) in enumerate(rows):
        x = (W - w) / 2 if align == "center" else 0
        out.append(f'<g transform="translate({x} {i * (CAP + lead)})">{b}</g>')
    return "".join(out), W, CAP * len(lines) + lead * (len(lines) - 1)

def place(lines, width, sw, c=INK, **kw):
    body, W, H = block(lines, sw, c, **kw)
    s = width / W
    return f'<g transform="translate({(1024 - width)/2} {512 - H*s/2}) scale({s})">{body}</g>'

def svg(body, bg=BG): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="{bg}"/>{body}</svg>\n'

TAN = "#E3BBA1"; TAN_DEEP = "#D4A07E"
VARIANTS = [
    ("a-big-wordmark", "A · Original colors", "For comparison.", svg(place(["FORTIA"], 900, 7.5)), "dark"),
    ("h-light", "Light · tan on white", "Brand tan (#E3BBA1) on white. Soft, but low contrast.",
        svg(place(["FORTIA"], 900, 7.5, c=TAN), bg="#FFFFFF"), "light"),
    ("h-light-deep", "Light · deeper tan on white", "Slightly darker tan (#D4A07E) so it reads better on white.",
        svg(place(["FORTIA"], 900, 7.5, c=TAN_DEEP), bg="#FFFFFF"), "light"),
    ("h-dark", "Dark · tan on black", "Brand tan on black, for dark mode.",
        svg(place(["FORTIA"], 900, 7.5, c=TAN), bg="#000000"), "dark"),
]
for key, _, _, s, _ in VARIANTS:
    open(f"{key}-icon.svg", "w").write(s)

tiles = "".join(f'<figure><img src="{k}-icon.svg" class="big"><figcaption><b>{t}</b><br>{d}</figcaption></figure>' for k, t, d, _, _ in VARIANTS)
apps = ["#4CD964", "#5AC8FA", "#FF9500"]
def home(k):
    cells = [f'<div class="app"><div class="ic" style="background:{c}"></div><span>App</span></div>' for c in apps]
    cells.insert(1, f'<div class="app"><img class="ic" src="{k}-icon.svg"><span>Fortia</span></div>')
    return "".join(cells)
phones = "".join(f'<div class="phone {m}"><div class="label">{t}</div><div class="grid">{home(k)}</div></div>' for k, t, _, _, m in VARIANTS)

open("preview.html", "w").write(f'''<!doctype html><meta charset="utf-8"><title>Fortia icon v9</title>
<style>
body{{font-family:-apple-system,sans-serif;background:#F1E9DE;color:#262135;margin:24px}}
h2{{font-size:15px;margin:24px 0 12px}}
.row{{display:flex;gap:20px;flex-wrap:wrap}}
figure{{margin:0;width:200px;font-size:12px;line-height:1.4}}
.big{{width:200px;height:200px;border-radius:45px;display:block;margin-bottom:8px;box-shadow:0 0 0 1px #0001}}
.phone{{background:linear-gradient(160deg,#2b3a55,#6b4f6e);border-radius:28px;padding:18px 14px 22px;width:300px}}
.phone.light{{background:linear-gradient(160deg,#dfe7f2,#f3e6ee)}}.phone.light .label,.phone.light .app{{color:#262135}}
.label{{color:#fff;font-size:12px;opacity:.8;margin-bottom:12px}}
.grid{{display:flex;justify-content:space-between}}
.app{{display:flex;flex-direction:column;align-items:center;gap:5px;color:#fff;font-size:11px}}
.ic{{width:60px;height:60px;border-radius:14px;display:block}}
</style>
<h2>Icons</h2><div class="row">{tiles}</div>
<h2>On the home screen (60pt, real size)</h2><div class="row">{phones}</div>
''')
print("ok")
