// Text helpers ported from Functions.cs.

import { Strings } from './data/strings';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Functions.StringVars: replaces ^1, ^2, ... with the given values, in order. */
export function stringVars(toParse: string, ...vars: string[]): string {
  let parsed = toParse;
  // Sequential replacement, as in the original: a value that itself contains
  // "^2" is substituted by the next pass. A replacer function keeps "$" in
  // values literal.
  vars.forEach((value, i) => {
    parsed = parsed.replaceAll(`^${i + 1}`, () => value);
  });
  return parsed;
}

/** Functions.FormatNumber: "{0:n0}", e.g. 12345 -> "12,345". */
export function formatNumber(num: number): string {
  return numberFormat.format(num);
}

/** Functions.FormatMoney: "{0:n0} cr.", e.g. 12345 -> "12,345 cr.". */
export function formatMoney(num: number): string {
  return `${formatNumber(num)} cr.`;
}

/** Functions.FormatPercent: "{0:n0}%". */
export function formatPercent(num: number): string {
  return `${formatNumber(num)}%`;
}

/** Functions.FormatList: joins items as "a", "a and b", "a, b, and c", ... */
export function formatList(listItems: string[]): string {
  const template = Strings.ListStrings[listItems.length];
  if (template === undefined) throw new RangeError(`Cannot format a list of ${listItems.length}`);
  return stringVars(template, ...listItems);
}

/** Functions.Multiples: "1 unit", "3 units". */
export function multiples(num: number, unit: string): string {
  return `${formatNumber(num)} ${unit}${num === 1 ? '' : 's'}`;
}
