---
name: cutting-stock-packing
description: Rules and algorithm guidance for 1D cutting-stock and 2D guillotine/MaxRects packing (pipes, bars, lumber, plywood, fabric, tiles). Use when designing, planning or reviewing any layout or optimization logic, including kerf, grain direction, rotation and offcuts.
---

# Cutting stock and packing

References:
- https://en.wikipedia.org/wiki/Cutting_stock_problem
- https://github.com/juj/RectangleBinPack (Jukka Jylanki, "A Thousand Ways to Pack the Bin": MaxRects, Guillotine, Skyline)

## Core principles
- Optimal packing is NP-hard. Use heuristics. Never promise "zero waste". UI copy says "efficient layout" and always carries "Verify before cutting".
- All math runs client-side and is deterministic: same input gives same output. No unseeded randomness.
- Use integer units internally: 0.1 mm when the job is metric, 1/64 in when imperial. Fix the unit system per job (the toggle converts the displayed values, it never mixes systems inside one calculation). Convert only at input and output. This avoids float drift.
- Validate inputs. A piece larger than every stock piece is reported as "cannot fit", never a crash. No zero or negative sizes. Kerf >= 0.

## 1D (pipes, bars, lumber) - MVP
- Expand pieces by quantity, then sort descending.
- Heuristics: First Fit Decreasing as baseline, Best Fit Decreasing preferred. Run both, keep the result with fewer stock pieces, then less waste.
- Kerf: a bar holding n pieces consumes sum(lengths) + kerf*(n-1). Make "kerf after the last piece" an explicit option and state the chosen rule in the UI.
- Support multiple stock lengths, limited stock quantities, and a list of reusable offcuts treated as extra stock.
- Output per bar: pieces in cut order, waste, plus totals: stock used, waste %, and a list of unplaced pieces.

## 2D sheet goods (plywood, MDF) - Phase 2
- Default to GUILLOTINE layouts: every cut runs edge to edge, which is what panel saws and hand saws can do. MaxRects layouts are usually not guillotine-compatible, so offer them only as an "advanced / CNC" mode, clearly labelled.
- Guillotine: keep a free-rectangle list. Use split rules (shorter-axis, longer-axis, shorter-leftover-axis) and choice rules (best short side fit, best area fit). Sort pieces by area or longest side descending. Try several rule combinations and keep the best.
- Kerf: subtract at every split. Edge trim is a separate user option.
- Grain: each piece has "rotation allowed". Grain-locked pieces never rotate.
- Offcuts: leftovers above a user-set minimum size are reported as reusable, with dimensions.
- Output includes the ordered cut sequence (rip cuts, then crosscuts), not only a picture.

## Fabric and tiles - Phase 3
- Fabric: 2D strip packing with fixed roll width. Handle nap/pattern direction (no rotation, optional pattern-repeat padding) and seam allowance added to each piece.
- Tiles: layout and wastage, not packing. Area plus waste %, with editable defaults (straight lay about 10%, diagonal about 15%), box rounding and grout width.

## Definition of done for any algorithm
- Pure functions in their own module with no DOM access.
- No overlaps. Every placement lies inside its stock. Every input piece is either placed or listed as unplaced. Total area is conserved.
- Covered by the tests described in the algorithm-testing skill.
