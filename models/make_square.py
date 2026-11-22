"""Generate the Lumo square-form bottle: one-piece rounded-square body.

All units mm, Z-up, base at Z=0. Edit parameters and re-run:
    python3 models/make_square.py
Outputs lumo_square.stl and lumo_square.obj.
"""
import math, os
import numpy as np
from make_bottle import write_stl, write_obj

# ---- Parameters --------------------------------------------------------------
H        = 200.0   # overall height
W        = 50.0    # width (square footprint W x W)
R_CORNER = 12.0    # vertical corner radius of the rounded square
TOP_FIL  = 10.0    # big soft rounding on the top edges (< R_CORNER)
BASE_FIL = 5.0     # rounding on the bottom edge
N_CORNER = 24      # segments per corner
# -----------------------------------------------------------------------------

A = W / 2

def arc(cx, cz, r, a0, a1, n):
    return [(cx + r * math.cos(a), cz + r * math.sin(a)) for a in np.linspace(a0, a1, n)]

def profile():
    """(r, z) where r is the local radius around the corner centres."""
    p  = arc(R_CORNER - BASE_FIL, BASE_FIL, BASE_FIL, -math.pi / 2, 0, 12)
    p += arc(R_CORNER - TOP_FIL, H - TOP_FIL, TOP_FIL, 0, math.pi / 2, 24)
    return p

def sweep(prof):
    """Sweep an (r, z) profile around a rounded-square path; flat ends are fanned."""
    c = A - R_CORNER
    centres = [(c, c), (-c, c), (-c, -c), (c, -c)]
    ring_dirs = []                      # (centre, outward normal) around the loop
    for k, (cx, cy) in enumerate(centres):
        for a in np.linspace(k * math.pi / 2, (k + 1) * math.pi / 2, N_CORNER + 1):
            ring_dirs.append((cx, cy, math.cos(a), math.sin(a)))
    n = len(ring_dirs)
    V = [(0.0, 0.0, prof[0][1])]
    for r, z in prof:
        V += [(cx + r * nx, cy + r * ny, z) for cx, cy, nx, ny in ring_dirs]
    V.append((0.0, 0.0, prof[-1][1]))
    top = len(V) - 1
    ring = lambda i, k: 1 + i * n + (k % n)
    F = [(0, ring(0, k + 1), ring(0, k)) for k in range(n)]
    for i in range(len(prof) - 1):
        for k in range(n):
            a, b, cc, d = ring(i, k), ring(i, k + 1), ring(i + 1, k + 1), ring(i + 1, k)
            F += [(a, b, cc), (a, cc, d)]
    F += [(top, ring(len(prof) - 1, k), ring(len(prof) - 1, k + 1)) for k in range(n)]
    return np.array(V), np.array(F)

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    V, F = sweep(profile())
    write_stl(os.path.join(here, "lumo_square.stl"), V, F)
    write_obj(os.path.join(here, "lumo_square.obj"), V, F)
    ext = V.max(0) - V.min(0)
    print(f"size {ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f} mm")
