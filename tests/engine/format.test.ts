import { describe, expect, it } from 'vitest';
import {
  formatList,
  formatMoney,
  formatNumber,
  formatPercent,
  multiples,
  stringVars,
} from '../../src/engine/format';

describe('stringVars', () => {
  it('replaces every occurrence of each placeholder', () => {
    expect(stringVars('^1 to ^2, then ^1.', 'Sol', 'Lave')).toBe('Sol to Lave, then Sol.');
  });

  it('replaces in sequence, like the original', () => {
    // The first value contains "^2", which the second pass then substitutes.
    expect(stringVars('^1', 'x^2', 'y')).toBe('xy');
  });

  it('keeps "$" in values literal', () => {
    expect(stringVars('cost: ^1', '$& $1')).toBe('cost: $& $1');
  });
});

describe('number formatting', () => {
  it('groups thousands with no decimals', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(-1500)).toBe('-1,500');
    expect(formatMoney(12345)).toBe('12,345 cr.');
    expect(formatPercent(75)).toBe('75%');
  });

  it('pluralizes units', () => {
    expect(multiples(1, 'day')).toBe('1 day');
    expect(multiples(2000, 'parsec')).toBe('2,000 parsecs');
  });

  it('joins lists in English', () => {
    expect(formatList(['a'])).toBe('a');
    expect(formatList(['a', 'b'])).toBe('a and b');
    expect(formatList(['a', 'b', 'c'])).toBe('a, b, and c');
    expect(() => formatList(['a', 'b', 'c', 'd', 'e'])).toThrow(RangeError);
  });
});
