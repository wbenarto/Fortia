# Fortia logo round 6: Triple peaks variations. Run: python3 generate.py
import math, base64, os
INK="#262135"; W="#FFFFFF"
# Triple peaks family: 100x100 box, line art, one stroke weight, mirror-symmetric
SW=8
def L(c, d, cap="butt", join="miter"): return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{SW}" stroke-linecap="{cap}" stroke-linejoin="{join}" stroke-miterlimit="10"/>'
def peak(top, base=96, half=None, slope=0.6):
    h = (base-top)*slope if half is None else half
    return f"M{50-h:.2f} {base}L50 {top}L{50+h:.2f} {base}"
def s_triple(c,bg):      # refined: parallel legs, equal gaps
    return "".join(L(c,peak(t)) for t in (4,36,68))
def s_triple_round(c,bg):# same, rounded ends and joins: softer
    return "".join(L(c,peak(t,94),"round","round") for t in (6,37,68))
def s_core(c,bg):        # two lines around a solid peak
    return L(c,peak(4)) + L(c,peak(36)) + f'<path d="{peak(66)}Z" fill="{c}"/>'
def s_stacked(c,bg):     # three equal chevrons stacked: rising
    return "".join(L(c,f"M14 {y+30}L50 {y}L86 {y+30}") for y in (8,36,64))
def s_range(c,bg):       # three peaks side by side, centre tallest
    return L(c,"M2 92L24 48L46 92") + L(c,"M54 92L76 48L98 92") + L(c,"M22 92L50 8L78 92")
def s_horizon(c,bg):     # triple peaks standing on a horizon line
    return "".join(L(c,peak(t,84)) for t in (6,32,58)) + L(c,"M2 95H98")
def s_fan(c,bg):         # three peaks sharing one apex, legs fanning out
    return "".join(L(c,f"M{50-h} 96L50 6L{50+h} 96") for h in (10,28,46))
def s_ring(c,bg):        # triple peaks inside a ring; feet cut flat on one baseline
    w=5.5
    def ln(d): return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="miter" stroke-miterlimit="10"/>'
    peaks="".join(ln(peak(t,84,slope=0.55)) for t in (20,42,64))
    return (ln("M50 5a45 45 0 1 0 0.01 0Z")
            + f'<clipPath id="base"><rect x="0" y="0" width="100" height="74"/></clipPath><g clip-path="url(#base)">{peaks}</g>')
SYMS=[("a","Triple peaks","Refined: legs parallel, gaps equal. The concentric rings of the current O, redrawn as the A.",s_triple),
      ("b","Soft peaks","Same mark with rounded ends and corners. Friendlier, less technical.",s_triple_round),
      ("c","Core peak","Two lines around a solid inner peak. Reads better at tiny sizes.",s_core),
      ("d","Rising","Three equal chevrons stacked upward: progress, levelling up.",s_stacked),
      ("e","Range","Three peaks side by side, the middle one tallest. A mountain range.",s_range),
      ("f","Horizon","The triple peaks standing on a horizon line.",s_horizon),
      ("g","Fan","Three peaks sharing one tip, legs spreading out. Like a tent, or light rays.",s_fan),
      ("h","Ringed peaks","Triple peaks inside a ring, tying back to the current ringed O.",s_ring)]

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
open("preview.html","w").write(f'''<!doctype html><meta charset=utf-8><title>Fortia logo v6</title><style>body{{background:#F1E9DE;font-family:-apple-system,sans-serif;color:#262135;margin:20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}}.card{{background:#fff;border:1px solid #F0EBE6;border-radius:20px;padding:16px}}
.ics{{display:flex;gap:10px;align-items:end;margin-bottom:12px}}.i1{{width:96px;border-radius:22px}}.i2{{width:48px;border-radius:11px}}.i3{{width:24px;border-radius:6px}}
.lk{{width:100%;display:block;margin-bottom:8px}}h2{{font-size:15px;margin:0 0 2px}}p{{font-size:12px;color:#574F47;margin:0}}</style><div class="grid">{cards}</div>''')
