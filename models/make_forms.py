"""Generate a family of Lumo form-factor studies, all within 50 x 50 x 200 mm.

Every shape is built the same way: at each height z the cross-section is a
convex "core" polygon (or a point / segment) Minkowski-summed with a disk of
radius rr(z). Insetting rr gives exact, even edge rounding top and bottom.
Optional extras: twist, flutes (radial ripple), per-height scaling.

    python3 models/make_forms.py      -> models/forms/<name>.stl
"""
import math, os
import numpy as np
from make_bottle import write_stl

W, H = 50.0, 200.0
N = 128                     # samples around the section
HERE = os.path.dirname(os.path.abspath(__file__))

def polygon(n, rot=0.0):
    return np.array([(math.cos(rot + 2 * math.pi * i / n), math.sin(rot + 2 * math.pi * i / n))
                     for i in range(n)])

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

class Form:
    def __init__(self, name, core, R, fb=4.0, ft=6.0, scale=lambda z: 1.0,
                 radius=None, twist=lambda z: 0.0, flutes=0, flute_amp=0.0,
                 step=5.0, dense=(), label="", width=W):
        self.name, self.label = name, label
        self.core0 = np.zeros((1, 2)) if core is None else np.asarray(core, float)
        self.R0, self.fb, self.ft = R, fb, ft
        self.scale, self.twist = scale, twist
        self.radius = radius or (lambda z: self.R0)
        self.flutes, self.flute_amp = flutes, flute_amp
        self.step, self.dense = step, dense
        self.twisting = twist(H) != 0
        self.width = width

    def fit(self):
        """Centre the core and scale it so the shape fills W (max of x/y).
        Twisting shapes are fitted inside a W-diameter circle instead, so they
        stay within W x W at every rotation."""
        if len(self.core0) == 1:
            return
        c = self.core0
        c = c - (c.max(0) + c.min(0)) / 2
        if self.twisting:
            k = (self.width / 2 - self.R0) / np.linalg.norm(c, axis=1).max()
        else:
            k = (self.width - 2 * self.R0) / (c.max(0) - c.min(0)).max()
        self.core0 = c * k

    def z_samples(self):
        zs = set(np.round(np.arange(0, H + 1e-9, self.step), 4))
        for a in np.linspace(0, math.pi / 2, 14):           # fillets sampled by angle
            zs.add(round(self.fb * (1 - math.cos(a)), 4))
            zs.add(round(H - self.ft * (1 - math.cos(a)), 4))
        for z0, z1 in self.dense:
            zs.update(np.round(np.arange(z0, z1 + 1e-9, 0.4), 4))
        return sorted(z for z in zs if 0 <= z <= H)

    def inset(self, z):
        d = 0.0
        if z < self.fb:
            d = self.fb - math.sqrt(max(self.fb ** 2 - (self.fb - z) ** 2, 0))
        if z > H - self.ft:
            u = z - (H - self.ft)
            d = max(d, self.ft - math.sqrt(max(self.ft ** 2 - u ** 2, 0)))
        return d

    def ring(self, z):
        s = self.scale(z)
        core = self.core0 * s
        rr = max(self.radius(z) * s - self.inset(z), 0.4)
        phis = np.linspace(0, 2 * math.pi, N, endpoint=False) + 1e-4
        nrm = np.stack([np.cos(phis), np.sin(phis)], 1)
        sup = core[np.argmax(nrm @ core.T, axis=1)]          # support point per normal
        r = rr
        if self.flutes:
            fade = min(1.0, rr / (self.radius(z) * s))       # flutes fade into the fillets
            r = rr + self.flute_amp * fade * np.cos(self.flutes * phis)[:, None]
        pts = sup + r * nrm
        t = self.twist(z)
        c, si = math.cos(t), math.sin(t)
        pts = pts @ np.array([[c, si], [-si, c]])
        return pts

    def mesh(self):
        zs = self.z_samples()
        V = [(0, 0, zs[0])]
        for z in zs:
            V += [(x, y, z) for x, y in self.ring(z)]
        V.append((0, 0, zs[-1])); top = len(V) - 1
        ring = lambda i, k: 1 + i * N + (k % N)
        F = [(0, ring(0, k + 1), ring(0, k)) for k in range(N)]
        for i in range(len(zs) - 1):
            for k in range(N):
                a, b, c, d = ring(i, k), ring(i, k + 1), ring(i + 1, k + 1), ring(i + 1, k)
                F += [(a, b, c), (a, c, d)]
        F += [(top, ring(len(zs) - 1, k), ring(len(zs) - 1, k + 1)) for k in range(N)]
        return np.array(V, float), np.array(F)

def ellip_end(z, R=27.5, a=11.0, b=20.0):
    """Scale for a cylinder of radius R whose ends round over an elliptical
    quarter (a inward, b tall), leaving a flat end face of radius R - a."""
    u = min(z, H - z)
    if u >= b:
        return 1.0
    return (R - a + a * math.sqrt(max(1 - ((b - u) / b) ** 2, 0))) / R

def stepped(z):
    # three stacked tiers with soft 3 mm transitions
    return 25 - 3 * smoothstep(78, 84, z) - 3 * smoothstep(143, 149, z)

FORMS = [
    Form("01_capsule", None, 25, fb=4, ft=24.6, label="Capsule"),
    Form("02_tapered", None, 25, fb=4, ft=5, radius=lambda z: 25 - 5 * z / H,
         label="Tapered column"),
    Form("03_waisted", None, 25, fb=4, ft=8,
         radius=lambda z: 25 - 3.0 * math.exp(-((z - 100) / 42) ** 2), step=3,
         label="Waisted"),
    Form("04_fluted", None, 24, fb=4, ft=6, flutes=16, flute_amp=1.0, label="Fluted"),
    Form("05_hexagon", polygon(6, math.pi / 2), 6, fb=4, ft=6, label="Hexagon"),
    Form("06_octagon", polygon(8, math.pi / 8), 5, fb=4, ft=6, label="Octagon"),
    Form("07_soft_triangle", polygon(3, math.pi / 2), 11, fb=4, ft=8,
         label="Soft triangle"),
    Form("08_twisted_square", polygon(4, math.pi / 4), 10, fb=4, ft=6,
         twist=lambda z: math.radians(60) * z / H, step=2.5, label="Twisted square"),
    Form("09_pebble", [(-7.5, 0), (7.5, 0)], 17.5, fb=6, ft=17, label="Pebble"),
    Form("10_obelisk", polygon(4, math.pi / 4), 8, fb=4, ft=3,
         scale=lambda z: 1 - 0.28 * z / H, label="Obelisk"),
    Form("11_lantern", None, 25, fb=4, ft=6,
         radius=lambda z: 25 - 2.0 * (smoothstep(55, 60, z) - smoothstep(145, 150, z)),
         dense=((54, 61), (144, 151)), label="Lantern"),
    Form("12_stacked", None, 25, fb=4, ft=6, radius=stepped,
         dense=((77, 85), (142, 150)), label="Stacked"),
    # faceted cylinder: 24 crisp facets, full-width ends with a 3 mm soft edge
    Form("15_faceted_cylinder_55", polygon(24, math.pi / 24), 0.8, fb=0, ft=0,
         width=55.0, scale=lambda z: ellip_end(z, a=3.0, b=3.0),
         dense=((0, 3), (197, 200)), label="Faceted cylinder"),
    # 55 mm versions
    Form("13_hexagon_55", polygon(6, math.pi / 2), 6, fb=4, ft=6, width=55.0,
         label="Hexagon 55"),
    Form("14_twisted_square_55", polygon(4, math.pi / 4), 10, fb=4, ft=6, width=55.0,
         twist=lambda z: math.radians(60) * z / H, step=2.5, label="Twisted square 55"),
]

if __name__ == "__main__":
    out = os.path.join(HERE, "forms"); os.makedirs(out, exist_ok=True)
    for f in FORMS:
        f.fit()
        V, F = f.mesh()
        write_stl(os.path.join(out, f.name + ".stl"), V, F)
        ext = V.max(0) - V.min(0)
        print(f"{f.name:20s} {ext[0]:6.2f} x {ext[1]:6.2f} x {ext[2]:6.2f} mm  {len(F)} tris")
