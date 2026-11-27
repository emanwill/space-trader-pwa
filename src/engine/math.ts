// Helpers that reproduce C# numeric semantics. Use these everywhere the
// original code does integer arithmetic; see CLAUDE.md "Porting rules".

/** C# `int / int`: divides and truncates toward zero. Throws on division by zero, like C#. */
export function idiv(a: number, b: number): number {
  if (b === 0) throw new RangeError('Integer division by zero');
  return Math.trunc(a / b);
}

/** C# `int % int`: the result has the sign of the dividend (same as JS `%`). */
export function imod(a: number, b: number): number {
  if (b === 0) throw new RangeError('Integer modulo by zero');
  return a % b;
}

/** C# `(int)x` for a double: truncates toward zero. */
export function toInt(x: number): number {
  return Math.trunc(x);
}

/**
 * C# `Math.Round(x)` with its default MidpointRounding.ToEven ("banker's rounding"):
 * 0.5 -> 0, 1.5 -> 2, 2.5 -> 2, -1.5 -> -2.
 */
export function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}
