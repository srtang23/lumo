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

## Form-factor studies (`forms/`)

Twelve alternative shapes, each within 50 × 50 × 200 mm, watertight STLs.
Regenerate with `python3 models/make_forms.py`; see `forms/preview_forms.png`.

| File | Shape | Footprint (mm) |
|---|---|---|
| `01_capsule.stl` | Cylinder with a full dome top | Ø50 |
| `02_tapered.stl` | Cylinder narrowing Ø50 → Ø40 | Ø50 |
| `03_waisted.stl` | 3 mm grip waist at mid-height | Ø50 |
| `04_fluted.stl` | 16 shallow vertical flutes | Ø50 |
| `05_hexagon.stl` | Soft-edged hexagonal prism | 45 × 50 |
| `06_octagon.stl` | Soft-edged octagonal prism | 50 × 50 |
| `07_soft_triangle.stl` | Rounded triangular prism | 50 × 46 |
| `08_twisted_square.stl` | Rounded square, 60° twist (fits a Ø50 circle) | 50 × 50 |
| `09_pebble.stl` | Oval/stadium section, rounded top | 50 × 35 |
| `10_obelisk.stl` | Rounded square tapering to 72% at top | 50 × 50 |
| `11_lantern.stl` | Cylinder with a 2 mm recessed light band (60–145 mm) | Ø50 |
| `12_stacked.stl` | Three tiers: Ø50 / Ø44 / Ø38 | Ø50 |
| `13_hexagon_55.stl` | Hexagon, 55 mm corner-to-corner | 49 × 55 |
| `14_twisted_square_55.stl` | Twisted square, stays within 55 × 55 at every height | 55 × 55 |
