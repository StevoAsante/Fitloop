// ------------------------------------------------------
// plates.ts — Plate Maths
// ------------------------------------------------------
// Works out what to load on each side of a barbell. Pure
// and offline on purpose, it's the thing you want to work
// in a basement gym with no signal
// ------------------------------------------------------

const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export type PlateResult = {
  perSide: number[];
  // Anything that couldn't be made with the plates available, usually
  // a fraction of a kilo. Shown so the number on screen is honest.
  leftover: number;
};

// Greedy works here because every plate divides evenly into the larger
// ones, so taking the biggest that fits never paints you into a corner.
export function plateBreakdown(targetKg: number, barKg = 20, plates = DEFAULT_PLATES): PlateResult | null {
  if (targetKg < barKg) return null;

  let remaining = (targetKg - barKg) / 2;
  const perSide: number[] = [];

  for (const plate of plates) {
    while (remaining + 1e-9 >= plate) {
      perSide.push(plate);
      remaining -= plate;
    }
  }

  return { perSide, leftover: Math.round(remaining * 2 * 100) / 100 };
}
