# Fortia logo round 8: curved monograms holding all six letters F O R T I A.
# Run: python3 generate.py  (writes icon + lockup SVGs and preview.html)
import math, base64
INK="#262135"; W="#FFFFFF"; ACCENT="#D4A07E"
SW=6
def pt(deg, r=45, c=50):  # point on the ring, 0deg = bottom, positive = right
    a=math.radians(deg); return (c+r*math.sin(a), c+r*math.cos(a))
def P(p): return f"{p[0]:.2f} {p[1]:.2f}"

def ring():
    return {"ring":"M50 5a45 45 0 1 0 0.01 0Z", "arcUR":"M50 5A45 45 0 0 1 95 50"}

# Each monogram: dict of named strokes + which strokes spell each letter. Round 8 adds curves.
LET=lambda: None
def m_eiffel():   # peak frame, sides curving inward
    s={"ring":"M50 46a14 14 0 1 0 0.01 0Z","arcUR":"M50 46A14 14 0 0 1 50 74","stem":"M50 4V96",
       "topL":"M34 4H50","topR":"M50 4H66","mid":"M50 60H64",
       "legL":"M50 4Q34 66 8 96","legR":"M50 4Q66 66 92 96"}
    return s,{"F":["stem","topR","mid"],"O":["ring"],"R":["stem","arcUR","legR"],"T":["topL","topR","stem"],"I":["stem"],"A":["legL","legR"]}
def m_gothic():   # peak frame, sides bowing outward like a pointed arch
    s={"ring":"M50 27a16 16 0 1 0 0.01 0Z","arcUR":"M50 27A16 16 0 0 1 50 59","stem":"M50 4V96",
       "topL":"M36 4H50","topR":"M50 4H64","mid":"M50 43H66",
       "legL":"M50 4Q10 30 10 96","legR":"M50 4Q90 30 90 96"}
    return s,{"F":["stem","topR","mid"],"O":["ring"],"R":["stem","arcUR","legR"],"T":["topL","topR","stem"],"I":["stem"],"A":["legL","legR"]}
def m_flow():     # compact, the R bowl sweeps into a flared leg; A legs flare to match
    s={"stem":"M50 5V95","topL":"M24 5H50","topR":"M50 5H76","ring":"M50 5a22.5 22.5 0 1 0 0.01 0Z",
       "arcUR":"M50 5A22.5 22.5 0 0 1 50 50","mid":"M50 27.5H72.5",
       "legL":"M50 50C36 52 26 70 22 95","legR":"M50 50C64 52 74 70 78 95"}
    return s,{"F":["stem","topR","mid"],"O":["ring"],"R":["stem","arcUR","legR"],"T":["topL","topR","stem"],"I":["stem"],"A":["legL","legR"]}
def m_ringflow(): # ring with a peak whose sides curve inward
    s={"ring":"M50 5a45 45 0 1 0 0.01 0Z","arcUR":"M50 5A45 45 0 0 1 95 50","stem":"M50 5V95",
       "topL":"M26 5H50","topR":"M50 5H74","mid":"M50 50H95",
       "legL":"M50 5Q44 64 24.8 87.3","legR":"M50 5Q56 64 75.2 87.3"}
    return s,{"F":["stem","topR","mid"],"O":["ring"],"R":["stem","arcUR","mid","legR"],"T":["topL","topR","stem"],"I":["stem"],"A":["legL","legR"]}
MONOS=[("a","Gothic","Peak frame with sides bowing outward, like a pointed arch. Soft but still strong.",m_gothic),
       ("b","Eiffel","Peak frame with sides curving inward, so it rises like a tower. Most dynamic.",m_eiffel),
       ("c","Flow","Compact mark: the R's leg sweeps out of the bowl, and the A's legs flare to match.",m_flow)]

def draw(strokes, color, hi=None, hicolor=ACCENT, fade=None, cap="round"):
    out=[]
    names=[k for k in strokes if k not in ("arcUR",)] if not hi else [k for k in strokes]
    base=[k for k in strokes if k!="arcUR" and not (k=="ring" and "arcUR" in strokes and False)]
    for k in base:
        out.append(f'<path d="{strokes[k]}" fill="none" stroke="{fade or color}" stroke-width="{SW}" stroke-linecap="{cap}" stroke-linejoin="round"/>')
    if hi:
        for k in hi:
            out.append(f'<path d="{strokes[k]}" fill="none" stroke="{hicolor}" stroke-width="{SW+1}" stroke-linecap="{cap}" stroke-linejoin="round"/>')
    return "".join(out)

def wordmark(color, s=10):
    h=s/2; x=0; d=[]
    w=54; d.append(f"M{x+h} 100V{h}H{x+w}M{x+h} 52H{x+w-6}"); x+=w+24
    d.append(f"M{x+50} {h}a{50-h} {50-h} 0 1 0 0.01 0Z"); x+=100+24
    w=64; d.append(f"M{x+h} 100V{h}H{x+w-26}A{26-h/2} {26-h/2} 0 0 1 {x+w-26} {54-h}H{x+h}M{x+w-32} {54-h}L{x+w} 100"); x+=w+20
    w=68; d.append(f"M{x} {h}H{x+w}M{x+w/2} {h}V100"); x+=w+24
    d.append(f"M{x+h} {h}V100"); x+=s+24
    w=84; d.append(f"M{x} 100L{x+w/2} {h}L{x+w} 100"); x+=w
    return f'<g fill="none" stroke="{color}" stroke-width="{s}" stroke-linejoin="miter">'+"".join(f'<path d="{p}"/>' for p in d)+'</g>', x

def svg(vb,b): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{b}</svg>\n'
u=lambda t:"data:image/svg+xml;base64,"+base64.b64encode(t.encode()).decode()
cards=""
for k,name,note,fn in MONOS:
    st,letters=fn()
    icon=svg("0 0 1024 1024",f'<rect width="1024" height="1024" fill="{INK}"/><g transform="translate(232 232) scale(5.6)">{draw(st,W)}</g>')
    wm,ww=wordmark(INK); lock=svg(f"-30 -30 {ww+200} 160",f'<rect x="-30" y="-30" width="{ww+200}" height="160" fill="{W}"/><g transform="translate(0 0)">{draw(st,INK)}</g><g transform="translate(140 0)">{wm}</g>')
    slug=f"{k}-{name.lower().replace(' ','-')}"
    open(f"{slug}-icon.svg","w").write(icon); open(f"{slug}-lockup.svg","w").write(lock)
    parts="".join(f'<figure><img src="{u(svg("-6 -6 112 112", draw(st,INK,hi=letters[L],fade="#E4DDD3")))}"><figcaption>{L}</figcaption></figure>' for L in "FORTIA")
    cards+=f'<div class="card"><div class="ics"><img class="i1" src="{u(icon)}"><img class="i2" src="{u(icon)}"><img class="i3" src="{u(icon)}"></div><img class="lk" src="{u(lock)}"><h2>{k.upper()} · {name}</h2><p>{note}</p><div class="parts">{parts}</div></div>'
open("preview.html","w").write(f'''<!doctype html><meta charset=utf-8><title>Fortia logo v8</title><style>body{{background:#F1E9DE;font-family:-apple-system,sans-serif;color:#262135;margin:20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}}.card{{background:#fff;border:1px solid #F0EBE6;border-radius:20px;padding:16px}}
.ics{{display:flex;gap:10px;align-items:end;margin-bottom:12px}}.i1{{width:96px;border-radius:22px}}.i2{{width:48px;border-radius:11px}}.i3{{width:24px;border-radius:6px}}
.lk{{width:100%;display:block;margin-bottom:8px}}h2{{font-size:15px;margin:0 0 2px}}p{{font-size:12px;color:#574F47;margin:0 0 10px}}
.parts{{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}}figure{{margin:0;text-align:center}}figure img{{width:100%;display:block}}figcaption{{font-size:11px;font-weight:600;color:#574F47;margin-top:2px}}</style><div class="grid">{cards}</div>''')
