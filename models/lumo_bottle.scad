// Lumo bottle body - parametric OpenSCAD source (units: mm)
H        = 179.29;
R_BODY   = 60.0 / 2;
R_NECK   = 22.00;
BASE_FIL = 8.0;
TOP_FIL  = 2.0;
Z_SH     = 112.0;   // shoulder start
Z_NECK   = 149.29;   // neck start
SH_FULL  = 0.35;    // >0 keeps the shoulder fuller/rounder
$fn = 128;

function arc(cx, cz, r, a0, a1, n) =
    [for (i = [0:n]) let(a = a0 + (a1 - a0) * i / n) [cx + r * cos(a), cz + r * sin(a)]];
function smoother(g) = g*g*g*(g*(6*g - 15) + 10);  // G2 continuous blend
SH_H = Z_NECK - Z_SH;

profile = concat(
    [[0, 0]],
    arc(R_BODY - BASE_FIL, BASE_FIL, BASE_FIL, -90, 0, 16),
    [for (i = [1:64]) let(t = i / 64, u = 1 - t, g = u + SH_FULL * u * (1 - u))
        [R_NECK + (R_BODY - R_NECK) * smoother(g), Z_SH + SH_H * t]],
    arc(R_NECK - TOP_FIL, H - TOP_FIL, TOP_FIL, 0, 90, 10),
    [[0, H]]
);

rotate_extrude() polygon(profile);
