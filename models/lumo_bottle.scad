// Lumo bottle body - parametric OpenSCAD source (units: mm)
H        = 179.29;
R_BODY   = 60.0 / 2;
R_NECK   = 22.00;
BASE_FIL = 8.0;
TOP_FIL  = 2.0;
Z_SH     = 117.0;   // shoulder start
Z_NECK   = 149.29;   // neck start
SH_ROUND = 0.55;    // how domed the shoulder is
NECK_BLEND = 0.40;  // tightness of the curve into the neck
$fn = 128;

function arc(cx, cz, r, a0, a1, n) =
    [for (i = [0:n]) let(a = a0 + (a1 - a0) * i / n) [cx + r * cos(a), cz + r * sin(a)]];
function bez(p0, p1, p2, p3, t) = let(u = 1 - t)
    u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
SH_H = Z_NECK - Z_SH;

profile = concat(
    [[0, 0]],
    arc(R_BODY - BASE_FIL, BASE_FIL, BASE_FIL, -90, 0, 16),
    [for (i = [1:48]) bez([R_BODY, Z_SH], [R_BODY, Z_SH + SH_ROUND * SH_H],
                          [R_NECK, Z_NECK - NECK_BLEND * SH_H], [R_NECK, Z_NECK], i / 48)],
    arc(R_NECK - TOP_FIL, H - TOP_FIL, TOP_FIL, 0, 90, 10),
    [[0, H]]
);

rotate_extrude() polygon(profile);
