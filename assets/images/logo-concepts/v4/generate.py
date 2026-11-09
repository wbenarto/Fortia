# Fortia logo round 4: minimal symmetrical symbols. Run: python3 generate.py
import math, base64, os
INK="#262135"; W="#FFFFFF"
# every symbol is drawn in a 100x100 box, filled with `c`, cut-outs use `bg`; all mirror-symmetric on the vertical axis
def s_twinF(c,bg):       # an F and its mirror sharing one stem
    return f'<rect x="41" y="6" width="18" height="88" fill="{c}"/><rect x="8" y="6" width="84" height="18" fill="{c}"/><rect x="20" y="44" width="60" height="16" fill="{c}"/>'
def s_stack(c,bg):       # three centered bars, narrowing: plate, progress, pyramid
    return f'<rect x="6" y="14" width="88" height="18" rx="2" fill="{c}"/><rect x="20" y="41" width="60" height="18" rx="2" fill="{c}"/><rect x="34" y="68" width="32" height="18" rx="2" fill="{c}"/>'
def s_openring(c,bg):    # thick ring, opening at the top
    import math
    a=math.radians(28); x1=50+42*math.sin(a); y=50-42*math.cos(a); x0=100-x1
    return f'<path d="M{x1:.2f} {y:.2f}A42 42 0 1 1 {x0:.2f} {y:.2f}" fill="none" stroke="{c}" stroke-width="14"/>'
def s_split(c,bg):       # disc split down the middle
    return f'<circle cx="50" cy="50" r="46" fill="{c}"/><rect x="45" y="0" width="10" height="100" fill="{bg}"/>'
def s_chevron(c,bg):     # solid peak with a chevron step inside
    return f'<path d="M50 6L94 94H72L50 50L28 94H6Z" fill="{c}"/><path d="M50 62L64 90H36Z" fill="{c}"/>'
def s_summit(c,bg):      # disc with a peak carved out of its base
    return f'<circle cx="50" cy="50" r="46" fill="{c}"/><path d="M50 34L80 96H20Z" fill="{bg}"/>'
SYMS=[("a","Twin F","An F and its mirror sharing one stem. Reads as a figure, or a dumbbell standing upright.",s_twinF),
      ("b","Stack","Three centered bars that narrow toward the bottom. Simplest of the set.",s_stack),
      ("c","Open ring","A thick ring that opens at the top. A progress ring, and a C-less O.",s_openring),
      ("d","Split","A disc split down the middle: in and out, two halves in balance.",s_split),
      ("e","Chevron peak","The Fortia A as a solid peak with a small second peak inside. Effort, then the next step.",s_chevron),
      ("f","Summit","A solid disc with a mountain peak cut out of its base.",s_summit)]

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
open("preview.html","w").write(f'''<!doctype html><meta charset=utf-8><title>Fortia logo v4</title><style>body{{background:#F1E9DE;font-family:-apple-system,sans-serif;color:#262135;margin:20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}}.card{{background:#fff;border:1px solid #F0EBE6;border-radius:20px;padding:16px}}
.ics{{display:flex;gap:10px;align-items:end;margin-bottom:12px}}.i1{{width:96px;border-radius:22px}}.i2{{width:48px;border-radius:11px}}.i3{{width:24px;border-radius:6px}}
.lk{{width:100%;display:block;margin-bottom:8px}}h2{{font-size:15px;margin:0 0 2px}}p{{font-size:12px;color:#574F47;margin:0}}</style><div class="grid">{cards}</div>''')
