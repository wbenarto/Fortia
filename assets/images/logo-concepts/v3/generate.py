# Fortia logo round 3: minimal single symbols. Run: python3 generate.py
import math, base64, os
INK="#262135"; W="#FFFFFF"
# every symbol is drawn in a 100x100 box, filled with `c`, cut-outs use `bg`
def s_disc_slit(c,bg):   # solid disc, one diagonal cut
    return f'<circle cx="50" cy="50" r="48" fill="{c}"/><path d="M20 80L80 20" stroke="{bg}" stroke-width="9" stroke-linecap="butt"/>'
def s_bars(c,bg):        # F reduced to two bars, no stem
    return f'<rect x="8" y="22" width="84" height="20" rx="2" fill="{c}"/><rect x="8" y="58" width="56" height="20" rx="2" fill="{c}"/>'
def s_peak(c,bg):        # the Fortia crossbar-less A as one solid peak
    return f'<path d="M50 6L94 94H72L50 48L28 94H6Z" fill="{c}"/>'
def s_half(c,bg):        # ring, half filled: balance in / out
    return f'<circle cx="50" cy="50" r="43" fill="none" stroke="{c}" stroke-width="10"/><path d="M50 7A43 43 0 0 1 50 93Z" fill="{c}"/>'
def s_arc(c,bg):         # progress ring, almost closed
    a=math.radians(300); x=50+42*math.sin(a); y=50-42*math.cos(a)
    return f'<path d="M50 8A42 42 0 1 1 {x:.2f} {y:.2f}" fill="none" stroke="{c}" stroke-width="14" stroke-linecap="butt"/>'
def s_squareF(c,bg):     # square with an F carved out as negative space
    return f'<rect x="6" y="6" width="88" height="88" rx="4" fill="{c}"/><path d="M34 76V24H70M34 50H60" fill="none" stroke="{bg}" stroke-width="11"/>'
SYMS=[("a","Slit","A solid disc with one diagonal cut. Calm, almost silent, like the X mark.",s_disc_slit),
      ("b","Bars","The F with its stem removed: just two bars. Also reads as progress, or as a plate and a bar.",s_bars),
      ("c","Peak","The current Fortia A as one solid peak. Up, effort, summit.",s_peak),
      ("d","Balance","A ring that is half filled: calories in vs out, the core idea of the app.",s_half),
      ("e","Ring","A progress ring that's about 85% closed. Never finished, always moving.",s_arc),
      ("f","Block F","A solid square with an F cut out of it.",s_squareF)]

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
open("preview.html","w").write(f'''<!doctype html><meta charset=utf-8><title>Fortia logo v3</title><style>body{{background:#F1E9DE;font-family:-apple-system,sans-serif;color:#262135;margin:20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}}.card{{background:#fff;border:1px solid #F0EBE6;border-radius:20px;padding:16px}}
.ics{{display:flex;gap:10px;align-items:end;margin-bottom:12px}}.i1{{width:96px;border-radius:22px}}.i2{{width:48px;border-radius:11px}}.i3{{width:24px;border-radius:6px}}
.lk{{width:100%;display:block;margin-bottom:8px}}h2{{font-size:15px;margin:0 0 2px}}p{{font-size:12px;color:#574F47;margin:0}}</style><div class="grid">{cards}</div>''')
