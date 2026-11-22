# Lumo bottle — 3D model

Solid body, 200 mm tall × 60 mm diameter; neck 44 mm dia × 30 mm tall with a 40 mm flat top (units: mm, Z-up, base at Z=0).

| File | Use |
|---|---|
| `lumo_bottle.stl` | 3D printing / slicers (watertight) |
| `lumo_bottle.obj` | Blender, Fusion, three.js, etc. |
| `lumo_bottle.scad` | Parametric OpenSCAD source |
| `make_bottle.py` | Regenerates STL + OBJ (numpy only): `python3 models/make_bottle.py` |
| `preview.png` | Render |

Tweak the parameters at the top of `make_bottle.py` / `lumo_bottle.scad`
(neck radius, shoulder height, fillets, shoulder roundness) to adjust the shape.

## Square variant

One-piece rounded-square body, 50 × 50 × 200 mm. Corner radius 12 mm,
10 mm top rounding, 5 mm base rounding.

| File | Use |
|---|---|
| `lumo_square.stl` | 3D printing / slicers (watertight) |
| `lumo_square.obj` | Rendering / CAD |
| `make_square.py` | Regenerates the above: `python3 models/make_square.py` |
| `preview_square.png` | Render |
