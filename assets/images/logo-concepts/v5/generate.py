# Fortia logo round 5: line-art symmetrical symbols. Run: python3 generate.py
import math, base64, os
INK="#262135"; W="#FFFFFF"
# every symbol: 100x100 box, line art only, one stroke weight (matches the wordmark), mirror-symmetric
SW=10
def L(c, d, extra=""): return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{SW}" stroke-linejoin="miter" stroke-miterlimit="10" {extra}/>'
def s_nested(c,bg):      # the Fortia A, doubled
    return L(c,"M6 96L50 6L94 96") + L(c,"M32 96L50 58L68 96")
def s_triple(c,bg):      # three nested peaks: the old concentric rings, redrawn as the A
    return L(c,"M4 96L50 4L96 96") + L(c,"M22 96L50 40L78 96") + L(c,"M40 96L50 76L60 96")
def s_summit(c,bg):      # ring with a peak standing inside it
    return L(c,"M50 5a45 45 0 1 0 0.01 0Z") + L(c,"M20 84L50 24L80 84")
def s_breakout(c,bg):    # peak rising out through a gap in the ring
    import math
    r=40; cy=56; a=math.radians(30); x1=50+r*math.sin(a); y=cy-r*math.cos(a)
    return L(c,f"M{x1:.2f} {y:.2f}A{r} {r} 0 1 1 {100-x1:.2f} {y:.2f}") + L(c,"M22 92L50 4L78 92")
def s_rings(c,bg):       # two concentric rings: the current O, simplified
    return L(c,"M50 5a45 45 0 1 0 0.01 0Z") + L(c,"M50 27a23 23 0 1 0 0.01 0Z")
def s_axis(c,bg):        # ring split by a vertical line: in and out, in balance
    return L(c,"M50 5a45 45 0 1 0 0.01 0Z") + L(c,"M50 0V100")
SYMS=[("a","Nested peaks","The Fortia A drawn twice, one inside the other. Effort, then the next step.",s_nested),
      ("b","Triple peaks","Three nested peaks: the concentric rings of the current O, redrawn as the A.",s_triple),
      ("c","Summit","A ring with a peak standing inside it.",s_summit),
      ("d","Breakout","A peak rising out through a gap in the ring. Going past the goal.",s_breakout),
      ("e","Rings","Two concentric rings: the current O, simplified to its core.",s_rings),
      ("f","Axis","A ring split by one vertical line: calories in and out, in balance.",s_axis)]

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
cards=""
for k,name,note,fn in SYMS:
    icon=svg("0 0 1024 1024",f'<rect width="1024" height="1024" fill="{INK}"/><g transform="translate(232 232) scale(5.6)">{fn(W,INK)}</g>')
    wm,ww=wordmark(INK); lock=svg(f"-30 -30 {ww+200} 160",f'<rect x="-30" y="-30" width="{ww+200}" height="160" fill="{W}"/><g transform="translate(0 6) scale(0.88)">{fn(INK,W)}</g><g transform="translate(130 0)">{wm}</g>')
    open(f"{k}-{name.lower().replace(' ','-')}-icon.svg","w").write(icon)
    open(f"{k}-{name.lower().replace(' ','-')}-lockup.svg","w").write(lock)
    u=lambda t:"data:image/svg+xml;base64,"+base64.b64encode(t.encode()).decode()
    cards+=f'<div class="card"><div class="ics"><img class="i1" src="{u(icon)}"><img class="i2" src="{u(icon)}"><img class="i3" src="{u(icon)}"></div><img class="lk" src="{u(lock)}"><h2>{k.upper()} · {name}</h2><p>{note}</p></div>'
open("preview.html","w").write(f'''<!doctype html><meta charset=utf-8><title>Fortia logo v5</title><style>body{{background:#F1E9DE;font-family:-apple-system,sans-serif;color:#262135;margin:20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}}.card{{background:#fff;border:1px solid #F0EBE6;border-radius:20px;padding:16px}}
.ics{{display:flex;gap:10px;align-items:end;margin-bottom:12px}}.i1{{width:96px;border-radius:22px}}.i2{{width:48px;border-radius:11px}}.i3{{width:24px;border-radius:6px}}
.lk{{width:100%;display:block;margin-bottom:8px}}h2{{font-size:15px;margin:0 0 2px}}p{{font-size:12px;color:#574F47;margin:0}}</style><div class="grid">{cards}</div>''')
