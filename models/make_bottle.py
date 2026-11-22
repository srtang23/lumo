"""Generate the Lumo bottle body as a watertight revolved mesh (STL + OBJ).

All units are millimetres. Edit the parameters below and re-run:
    python3 models/make_bottle.py
"""
import math, os, struct
import numpy as np

# ---- Parameters (from the reference drawing) -------------------------------
H        = 200.0         # overall height
R_BODY   = 60.0 / 2      # body radius
R_NECK   = 22.00        # neck radius (44 mm dia -> 40 mm flat top after fillet)
BASE_FIL = 8.0           # rounded edge at the bottom
TOP_FIL  = 2.0           # soft edge on the cap top
Z_SHOULDER_START = 132.7 # where the body starts curving in
Z_NECK_START     = 170.0 # where the neck becomes straight
SH_FULL  = 0.35          # -1..1, >0 keeps the shoulder fuller/rounder (more palm-filling)
SEGMENTS = 128           # around the axis
# -----------------------------------------------------------------------------

def arc(cx, cz, r, a0, a1, n):
    t = np.linspace(a0, a1, n)
    return [(cx + r * math.cos(a), cz + r * math.sin(a)) for a in t]

def profile():
    pts = [(0.0, 0.0)]
    # base fillet: from bottom-flat to vertical wall
    pts += arc(R_BODY - BASE_FIL, BASE_FIL, BASE_FIL, -math.pi / 2, 0, 16)
    # straight body wall
    pts += [(R_BODY, z) for z in np.linspace(BASE_FIL, Z_SHOULDER_START, 24)[1:]]
    # shoulder: curvature-continuous (G2) blend - quintic smootherstep, so the
    # bend fades in/out with zero curvature at the body and the neck (no visible
    # start/stop line). SH_FULL skews it so the dome stays full near the body.
    h = Z_NECK_START - Z_SHOULDER_START
    for t in np.linspace(0, 1, 64)[1:]:
        u = 1 - t                                   # 1 at body, 0 at neck
        g = u + SH_FULL * u * (1 - u)
        s = g**3 * (g * (6 * g - 15) + 10)
        pts.append((R_NECK + (R_BODY - R_NECK) * s, Z_SHOULDER_START + h * t))
    # straight neck
    pts += [(R_NECK, z) for z in np.linspace(Z_NECK_START, H - TOP_FIL, 8)[1:]]
    # top fillet into flat top
    pts += arc(R_NECK - TOP_FIL, H - TOP_FIL, TOP_FIL, 0, math.pi / 2, 10)[1:]
    pts.append((0.0, H))
    return pts

def revolve(prof, n):
    verts, faces = [], []
    inner = prof[1:-1]                       # ring points (exclude poles)
    verts.append((0, 0, prof[0][1]))         # bottom pole = 0
    for r, z in inner:
        for k in range(n):
            a = 2 * math.pi * k / n
            verts.append((r * math.cos(a), r * math.sin(a), z))
    verts.append((0, 0, prof[-1][1]))        # top pole
    top = len(verts) - 1
    ring = lambda i, k: 1 + i * n + (k % n)
    for k in range(n):                       # bottom cap
        faces.append((0, ring(0, k + 1), ring(0, k)))
    for i in range(len(inner) - 1):
        for k in range(n):
            a, b = ring(i, k), ring(i, k + 1)
            c, d = ring(i + 1, k + 1), ring(i + 1, k)
            faces += [(a, b, c), (a, c, d)]
    last = len(inner) - 1
    for k in range(n):                       # top cap
        faces.append((top, ring(last, k), ring(last, k + 1)))
    return np.array(verts), np.array(faces)

def write_stl(path, V, F):
    with open(path, "wb") as f:
        f.write(b"Lumo bottle".ljust(80, b" "))
        f.write(struct.pack("<I", len(F)))
        for a, b, c in F:
            n = np.cross(V[b] - V[a], V[c] - V[a]); n /= np.linalg.norm(n) or 1
            f.write(struct.pack("<12fH", *n, *V[a], *V[b], *V[c], 0))

def write_obj(path, V, F):
    with open(path, "w") as f:
        f.write("# Lumo bottle, units: mm\no lumo_bottle\n")
        f.writelines(f"v {x:.4f} {y:.4f} {z:.4f}\n" for x, y, z in V)
        f.writelines(f"f {a+1} {b+1} {c+1}\n" for a, b, c in F)

if __name__ == "__main__":
    V, F = revolve(profile(), SEGMENTS)
    here = os.path.dirname(os.path.abspath(__file__))
    write_stl(os.path.join(here, "lumo_bottle.stl"), V, F)
    write_obj(os.path.join(here, "lumo_bottle.obj"), V, F)
    ext = V.max(0) - V.min(0)
    print(f"{len(V)} verts, {len(F)} tris, size {ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f} mm")
