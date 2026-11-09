import math, os, sys, re, base64
OUT = sys.argv[1]
INK = "#262135"; PAPER = "#F1E9DE"; ACCENT = "#E3BBA1"; BTN = "#D4A07E"

def svg(vb, body, w=None):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>\n'

# ---------- D: Trajectory (SpaceX) — extended, heavy, square-cut ----------
def wordmark_extended(s=17, color=INK):
    h = s/2; x = 0; parts = []
    def g(d): parts.append(d)
    # F (width 78)
    w=78; g(f"M{x+h} 100V{h}H{x+w} M{x+h} 50H{x+w-8}"); x += w + 30
    # O stadium (width 150)
    w=150; r=50-h; g(f"M{x+50} {h}H{x+w-50}A{r} {r} 0 0 1 {x+w-50} {100-h}H{x+50}A{r} {r} 0 0 1 {x+50} {h}Z"); x += w + 30
    # R (width 112)
    w=112; br=27.5-h/2
    g(f"M{x+h} 100V{h}H{x+w-30}A{25.5-h/2+2} {25.5-h/2+2} 0 0 1 {x+w-30} {55-h}H{x+h} M{x+w-46} {55-h}L{x+w} 100")
    x += w + 26
    # T (width 104)
    w=104; g(f"M{x} {h}H{x+w} M{x+w/2} {h}V100"); x += w + 30
    # I
    g(f"M{x+h} 0V100"); x += s + 30
    # A (Λ, width 122)
    w=122; g(f"M{x} 100L{x+w/2} 0L{x+w} 100"); x += w
    paths = "".join(f'<path d="{d}"/>' for d in parts)
    return f'<g fill="none" stroke="{color}" stroke-width="{s}" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="butt">{paths}</g>', x

def swoosh(x0, y0, x1, y1, bulge, thick, color):
    # tapered arc: outer and inner quadratic curves meeting at the ends
    cx, cy = (x0+x1)/2, (y0+y1)/2 + bulge
    return (f'<path fill="{color}" d="M{x0} {y0}Q{cx} {cy+thick} {x1} {y1}Q{cx} {cy-thick*0.2} {x0} {y0}Z"/>')

def concept_d():
    wm, W = wordmark_extended()
    sw = swoosh(-50, 110, W+40, -40, 150, 40, ACCENT)
    word = svg(f"-60 -60 {W+120} 230", sw + wm)
    word_dark = svg(f"-60 -60 {W+120} 230", f'<rect x="-60" y="-60" width="{W+120}" height="230" fill="{INK}"/>' + swoosh(-50, 110, W+40, -40, 150, 40, ACCENT) + wordmark_extended(color="#FFFFFF")[0])
    # icon: heavy F + trajectory
    s=15; h=s/2
    f = f'<path fill="none" stroke="#FFFFFF" stroke-width="{s}" d="M{h} 100V{h}H78M{h} 50H70"/>'
    arc = swoosh(-38, 112, 112, -22, 70, 16, ACCENT)
    icon = svg("0 0 1024 1024", f'<rect width="1024" height="1024" fill="{INK}"/><g transform="translate(512 512) scale(5.2) translate(-39 -50)">{arc}{f}</g>')
    return word, word_dark, icon

# ---------- E: Knot (OpenAI) — rotational rosette ----------
def rosette(color, sw=7, bg="#FFFFFF", R=27, d=17):
    import math
    C=[(d*math.cos(math.radians(-90+k*120)), d*math.sin(math.radians(-90+k*120))) for k in range(3)]
    out=[f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{R}" fill="none" stroke="{color}" stroke-width="{sw}"/>' for x,y in C]
    def inter(a,b):
        (x0,y0),(x1,y1)=a,b; dx,dy=x1-x0,y1-y0; D=math.hypot(dx,dy); h=math.sqrt(R*R-(D/2)**2)
        mx,my=x0+dx/2,y0+dy/2
        return [(mx-dy/D*h,my+dx/D*h),(mx+dy/D*h,my-dx/D*h)]
    def piece(c,pt):
        ang=math.atan2(pt[1]-c[1],pt[0]-c[0]); da=math.radians(16)
        p1=(c[0]+R*math.cos(ang-da),c[1]+R*math.sin(ang-da)); p2=(c[0]+R*math.cos(ang+da),c[1]+R*math.sin(ang+da))
        dd=f"M{p1[0]:.2f} {p1[1]:.2f}A{R} {R} 0 0 1 {p2[0]:.2f} {p2[1]:.2f}"
        return f'<path d="{dd}" fill="none" stroke="{bg}" stroke-width="{sw+5}"/><path d="{dd}" fill="none" stroke="{color}" stroke-width="{sw}"/>'
    # order drawn: 0,1,2 (2 on top). Cyclic: 1 over 2, 0 over 1.
    for pt in inter(C[1],C[2]): out.append(piece(C[1],pt))
    for pt in inter(C[0],C[1]): out.append(piece(C[0],pt))
    return "".join(out)

def wordmark_geo(s=9, color=INK, cap="round"):
    h=s/2; x=0; parts=[]
    def g(d): parts.append(d)
    w=56; g(f"M{x+h} 100V{h}H{x+w} M{x+h} 50H{x+w-8}"); x+=w+22
    g(f'M{x+50} 50m-{50-h} 0a{50-h} {50-h} 0 1 0 {100-s} 0a{50-h} {50-h} 0 1 0 -{100-s} 0'); x+=100+22
    w=66; g(f"M{x+h} 100V{h}H{x+w-26}A{26-h/2} {26-h/2} 0 0 1 {x+w-26} {52-h}H{x+h} M{x+w-34} {52-h}L{x+w} 100"); x+=w+20
    w=70; g(f"M{x} {h}H{x+w} M{x+w/2} {h}V100"); x+=w+22
    g(f"M{x+h} {h}V100"); x+=s+22
    w=86; g(f"M{x} 100L{x+w/2} {h}L{x+w} 100"); x+=w
    paths="".join(f'<path d="{d}"/>' for d in parts)
    return f'<g fill="none" stroke="{color}" stroke-width="{s}" stroke-linecap="{cap}" stroke-linejoin="round">{paths}</g>', x

def concept_e():
    wm, W = wordmark_geo()
    mark = f'<g transform="translate(55 50) scale(0.95)">{rosette(INK)}</g>'
    word = svg(f"-20 -20 {W+190} 140", mark + f'<g transform="translate(150 0)">{wm}</g>')
    word_dark = svg(f"-20 -20 {W+190} 140", f'<rect x="-20" y="-20" width="{W+190}" height="140" fill="{INK}"/>' + f'<g transform="translate(55 50) scale(0.95)">{rosette("#FFFFFF", bg=INK)}</g>' + f'<g transform="translate(150 0)">{wordmark_geo(color="#FFFFFF")[0]}</g>')
    icon = svg("0 0 1024 1024", f'<rect width="1024" height="1024" fill="{PAPER}"/><g transform="translate(512 512) scale(6.6)">{rosette(INK, 6, bg=PAPER)}</g>')
    return word, word_dark, icon

# ---------- F: Monolith (X) — thick/thin contrast ----------
def wordmark_contrast(color=INK, bg="#FFFFFF"):
    T=22; t=6; x=0; p=[]
    def r(x0,y0,w,h): p.append(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="{color}"/>')
    def poly(pts): p.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in pts)}" fill="{color}"/>')
    # F: thick stem, thin bars
    r(x,0,T,100); r(x,0,70,t); r(x,46,58,t); x+=70+26
    # O: thick sides thin top/bottom (ellipse contrast)
    cx=x+52; p.append(f'<path fill-rule="evenodd" fill="{color}" d="M{cx} 0a52 50 0 1 0 0.01 0Z M{cx} {t}a{52-T} {50-t} 0 1 0 0.01 0Z"/>'); x+=104+26
    # R
    r(x,0,T,100); r(x,0,46,t); r(x,50-t/2,46,t)
    p.append(f'<path fill="{color}" fill-rule="evenodd" d="M{x+46} 0a26 26 0 0 1 0 {50+t/2}V{50-t/2}a{26-T+t} {(50-t)/2-t/2} 0 0 0 0 -{50-t-t/2+0}V0Z"/>')
    poly([(x+40,50),(x+40+T*1.15,50),(x+92,100),(x+92-T*1.15,100)]); x+=92+26
    # T: thin bar, thick stem
    r(x,0,84,t); r(x+42-T/2,0,T,100); x+=84+26
    # I
    r(x,0,T,100); x+=T+26
    # A: thin left leg, thick right leg (X-like contrast)
    w=104; poly([(x,100),(x+w/2-3,0),(x+w/2+3,0),(x+t,100)]); poly([(x+w/2-3,0),(x+w/2-3+T*1.1,0),(x+w,100),(x+w-T*1.1,100)]); x+=w
    return "".join(p), x

def concept_f():
    wm, W = wordmark_contrast()
    word = svg(f"-30 -30 {W+60} 160", wm)
    word_dark = svg(f"-30 -30 {W+60} 160", f'<rect x="-30" y="-30" width="{W+60}" height="160" fill="#000"/>' + wordmark_contrast(color="#FFFFFF")[0])
    # icon: big contrast F, with the top bar as a hollow (outlined) slab like X's stroke
    T=26
    f = (f'<rect x="0" y="0" width="{T}" height="120" fill="#fff"/>'
         f'<rect x="{T+2}" y="2" width="58" height="18" fill="none" stroke="#fff" stroke-width="4"/>'
         f'<rect x="0" y="54" width="70" height="7" fill="#fff"/>'
         f'<rect x="{T+8}" y="54" width="7" height="7" fill="{ACCENT}"/>')
    icon = svg("0 0 1024 1024", f'<rect width="1024" height="1024" fill="#000"/><g transform="translate(512 512) scale(6.2) translate(-44 -60)">{f}</g>')
    return word, word_dark, icon

for name, fn in [("d-trajectory", concept_d), ("e-knot", concept_e), ("f-monolith", concept_f)]:
    w, wd, ic = fn()
    open(os.path.join(OUT, f"{name}-wordmark.svg"), "w").write(w)
    open(os.path.join(OUT, f"{name}-wordmark-dark.svg"), "w").write(wd)
    open(os.path.join(OUT, f"{name}-icon.svg"), "w").write(ic)

rows = ""
for name, title, note in [("d-trajectory","D · Trajectory","SpaceX: extended heavy wordmark, crossbar-less A as a launch peak, tapered orbit arc in brand accent."),
                          ("e-knot","E · Knot","OpenAI: three interlaced rings (food · training · recovery), rotational symmetry; evolves the current concentric O."),
                          ("f-monolith","F · Monolith","X: stark black, thick/thin stroke contrast; hollow top bar on the F icon.")]:
    rows += f'''<section><h2>{title}</h2><p>{note}</p><div class="row">
<div class="tile light"><img src="{name}-wordmark.svg"></div>
<div class="tile"><img src="{name}-wordmark-dark.svg"></div>
<div class="icons"><img class="ic" src="{name}-icon.svg"><img class="ic sm" src="{name}-icon.svg"><img class="ic xs" src="{name}-icon.svg"></div></div></section>'''
rows = re.sub(r'src="([^"]+\.svg)"', lambda m: 'src="data:image/svg+xml;base64,'+base64.b64encode(open(os.path.join(OUT,m.group(1)),"rb").read()).decode()+'"', rows)
open(os.path.join(OUT, "preview.html"), "w").write(f'''<!doctype html><meta charset=utf-8><title>Fortia logo v2</title>
<style>body{{background:#F1E9DE;font-family:-apple-system,sans-serif;color:#262135;margin:24px}}h2{{margin:0 0 4px;font-size:16px}}p{{margin:0 0 10px;font-size:12px;color:#574F47}}
section{{margin-bottom:28px}}.row{{display:flex;gap:14px;align-items:center;flex-wrap:wrap}}.tile{{width:360px}}.tile img{{width:100%;display:block;border-radius:12px}}.light img{{background:#fff}}
.icons{{display:flex;gap:12px;align-items:end}}.ic{{width:120px;border-radius:27px;box-shadow:0 0 0 1px #E2D6C6}}.ic.sm{{width:60px;border-radius:13px}}.ic.xs{{width:30px;border-radius:7px}}</style>{rows}''')
