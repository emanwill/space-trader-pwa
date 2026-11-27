#!/usr/bin/env node
// Generates src/engine/data/{enums,strings,alerts}.ts from the original C#
// Enums.cs, Strings.cs and Form_Alert.cs in reference/.
//
// The output is committed. Re-run with `npm run data` only when changing this
// script; edit the generated files only through it.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const refDir = join(root, 'reference');
const outDir = join(root, 'src', 'engine', 'data');
const read = (f) => readFileSync(join(refDir, f), 'utf8').replace(/\r\n/g, '\n');

const HEADER = (src) =>
  `// Generated from reference/${src} by scripts/convert-data.mjs. Do not edit.\n` +
  `// Space Trader for Windows 2.00 (C) 2005 Jay French et al., GPL-2.0-or-later.\n\n`;

// ---------------------------------------------------------------------------
// Tokenizer for the small C# subset used in these files.
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      tokens.push({ t: 'ws', v: src.slice(i, j) });
      i = j;
    } else if (c === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i);
      if (j < 0) j = src.length;
      tokens.push({ t: 'comment', v: src.slice(i, j) });
      i = j;
    } else if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i) + 2;
      tokens.push({ t: 'comment', v: src.slice(i, j) });
      i = j;
    } else if (c === '"') {
      let j = i + 1;
      while (src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      tokens.push({ t: 'str', v: src.slice(i, j + 1) });
      i = j + 1;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[\w.]/.test(src[j])) j++;
      tokens.push({ t: 'id', v: src.slice(i, j) });
      i = j;
    } else if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: src.slice(i, j) });
      i = j;
    } else {
      tokens.push({ t: 'punct', v: c });
      i++;
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Enums
function convertEnums() {
  const src = read('Enums.cs');
  const out = [HEADER('Enums.cs')];
  const enumRe = /public enum (\w+)\s*:\s*int\s*\{([^}]*)\}/g;
  let m;
  let count = 0;
  while ((m = enumRe.exec(src))) {
    const [, name, body] = m;
    out.push(`export enum ${name} {\n`);
    let next = 0;
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const mm = /^(\w+)\s*(?:=\s*(-?\d+))?\s*,?\s*(\/\/.*)?$/.exec(line);
      if (!mm) throw new Error(`Unparsed enum line in ${name}: ${line}`);
      const [, member, value, comment] = mm;
      const v = value !== undefined ? Number(value) : next;
      next = v + 1;
      out.push(`  ${member} = ${v},${comment ? ' ' + comment : ''}\n`);
    }
    out.push(`}\n\n`);
    count++;
  }
  writeFileSync(join(outDir, 'enums.ts'), out.join('').trimEnd() + '\n');
  console.log(`enums: ${count}`);
}

// ---------------------------------------------------------------------------
// Strings
function convertStrings() {
  let src = read('Strings.cs');
  // Body of the class only.
  src = src.slice(src.indexOf('{', src.indexOf('public class Strings')) + 1);
  src = src.slice(0, src.lastIndexOf('}', src.lastIndexOf('}') - 1));
  src = src.replaceAll('char.ToString((char)169)', '"\\u00a9"');

  const tokens = tokenize(src);
  const decls = [];
  const names = new Set();
  let i = 0;
  let pendingComments = [];
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.t === 'comment') {
      if (!tok.v.startsWith('#')) pendingComments.push(tok.v);
      i++;
      continue;
    }
    if (tok.t === 'punct' && tok.v === '#') {
      // #region / #endregion line
      while (i < tokens.length && !(tokens[i].t === 'ws' && tokens[i].v.includes('\n'))) i++;
      continue;
    }
    if (tok.t === 'ws') {
      if ((tok.v.match(/\n/g) ?? []).length > 1 && pendingComments.length === 0) {
        decls.push({ blank: true });
      }
      i++;
      continue;
    }
    if (tok.t === 'id' && tok.v === 'public') {
      // public static <type> Name = expr ;
      let j = i + 1;
      const sig = [];
      while (!(tokens[j].t === 'punct' && tokens[j].v === '=')) {
        if (tokens[j].t !== 'ws') sig.push(tokens[j].v);
        j++;
      }
      const name = sig[sig.length - 1];
      const type = sig.slice(1, -1).join(''); // drop "static"
      j++;
      const expr = [];
      let depth = 0;
      while (!(depth === 0 && tokens[j].t === 'punct' && tokens[j].v === ';')) {
        const t = tokens[j];
        if (t.t === 'punct' && t.v === '{') depth++;
        if (t.t === 'punct' && t.v === '}') depth--;
        expr.push(t);
        j++;
      }
      decls.push({ name, type, expr, comments: pendingComments });
      names.add(name);
      pendingComments = [];
      i = j + 1;
      continue;
    }
    throw new Error(`Unexpected token in Strings.cs: ${JSON.stringify(tok)}`);
  }

  // The Palm OS help text at the end of the file is inside a /* */ block and is
  // skipped as a comment. Comments with no following declaration are dropped.
  const kept = decls;

  const exprToTs = (expr) => {
    let s = '';
    for (let k = 0; k < expr.length; k++) {
      const t = expr[k];
      if (t.t === 'id' && t.v === 'new') {
        // new string[] / new string[][] -> drop
        k++;
        while (!(expr[k].t === 'punct' && expr[k].v === '{')) k++;
        k--;
        continue;
      }
      if (t.t === 'punct' && t.v === '{') s += '[';
      else if (t.t === 'punct' && t.v === '}') s += ']';
      else if (t.t === 'id' && t.v === 'Environment.NewLine') s += "'\\n'";
      else if (t.t === 'id') {
        if (!names.has(t.v)) throw new Error(`Unknown identifier in Strings.cs: ${t.v}`);
        s += `Strings.${t.v}`;
      } else s += t.v;
    }
    return s.trim();
  };

  const out = [HEADER('Strings.cs')];
  out.push(
    '// Static text. Names match the original so ported code reads the same\n' +
      '// (Strings.X). Arrays are mutable on purpose: the game renames the commander\n' +
      '// (CrewMemberNames[0]) and custom ship (ShipNames[Custom]) at runtime.\n' +
      '//\n' +
      '// The Palm OS help strings commented out at the end of Strings.cs are not ported.\n\n',
  );
  out.push('export class Strings {\n');
  let lastBlank = true;
  for (const d of kept) {
    if (d.blank) {
      if (!lastBlank) out.push('\n');
      lastBlank = true;
      continue;
    }
    lastBlank = false;
    for (const c of d.comments) out.push(`  ${c}\n`);
    const tsType = d.type === 'string' ? '' : `: ${d.type}`;
    out.push(`  static ${d.name}${tsType} = ${exprToTs(d.expr)};\n`);
  }
  out.push('}\n');
  writeFileSync(join(outDir, 'strings.ts'), out.join(''));
  console.log(`strings: ${kept.filter((d) => !d.blank).length}`);
}

// ---------------------------------------------------------------------------
// Alerts
function convertAlerts() {
  let src = read('Form_Alert.cs');
  const start = src.indexOf('switch (type)', src.indexOf('string[] args)'));
  src = src.slice(start, src.indexOf('return result;', start));

  const caseRe = /case AlertType\.(\w+):\s*([\s\S]*?)break;/g;
  const entries = [];
  let m;
  while ((m = caseRe.exec(src))) {
    const [, name, body] = m;
    const notes = [];
    if (body.includes('LitterWarning')) {
      notes.push(
        'PORT: the original set Game.LitterWarning = true when showing this alert.\n' +
          '    // The engine must do that itself (Phase 3, CargoSell/Jettison).',
      );
    }
    const call = /new FormAlert\(([\s\S]*)\)\)\.ShowDialog/.exec(body);
    if (!call) throw new Error(`No FormAlert in ${name}`);
    const args = splitArgs(call[1]);
    if (args.length === 2) {
      // Image alert: (title, imageIndex)
      const image = {
        SPLASH_INDEX: 'Splash',
        '(int)GameEndType.BoughtMoon': 'GameEndBoughtMoon',
        '(int)GameEndType.BoughtMoonGirl': 'GameEndBoughtMoonGirl',
        '(int)GameEndType.Killed': 'GameEndKilled',
        '(int)GameEndType.Retired': 'GameEndRetired',
      }[args[1]];
      if (!image) throw new Error(`Unknown image alert ${name}: ${args[1]}`);
      entries.push({ name, notes, def: `{ title: ${args[0]}, image: AlertImage.${image} }` });
      continue;
    }
    if (args.length !== 7) throw new Error(`Unexpected arg count in ${name}: ${args.length}`);
    const [title, message, b1, r1, b2, r2, rest] = args;
    if (rest !== 'args') throw new Error(`Unexpected args in ${name}`);
    const result = (r) => r.replace('DialogResult.', 'DialogResult.');
    const buttons =
      b2 === 'null'
        ? `[{ text: ${b1}, result: ${result(r1)} }]`
        : `[{ text: ${b1}, result: ${result(r1)} }, { text: ${b2}, result: ${result(r2)} }]`;
    entries.push({
      name,
      notes,
      def: `{ title: ${title}, message: ${message}, buttons: ${buttons} }`,
    });
  }

  const out = [HEADER('Form_Alert.cs (FormAlert.Alert)')];
  out.push(
    "import { AlertType } from './enums';\n\n" +
      '// Result of a dialog button, as in WinForms DialogResult.\n' +
      'export enum DialogResult {\n  None = 0,\n  OK = 1,\n  Cancel = 2,\n  Yes = 6,\n  No = 7,\n}\n\n' +
      '// Full-screen images some alerts show instead of text and buttons.\n' +
      'export enum AlertImage {\n  Splash,\n  GameEndKilled,\n  GameEndRetired,\n  GameEndBoughtMoon,\n  GameEndBoughtMoonGirl,\n}\n\n' +
      'export interface AlertButton {\n  text: string;\n  result: DialogResult;\n}\n\n' +
      '// Title and message may contain ^1, ^2, ^3 placeholders (see stringVars).\n' +
      'export type AlertDef =\n' +
      '  | { title: string; message: string; buttons: [AlertButton] | [AlertButton, AlertButton] }\n' +
      '  | { title: string; image: AlertImage };\n\n' +
      'export const Alerts: Record<AlertType, AlertDef> = {\n',
  );
  for (const e of entries) {
    for (const n of e.notes) out.push(`  // ${n}\n`);
    out.push(`  [AlertType.${e.name}]: ${e.def},\n`);
  }
  out.push('};\n');
  writeFileSync(join(outDir, 'alerts.ts'), out.join(''));
  console.log(`alerts: ${entries.length}`);
}

// Splits a C# argument list on top-level commas.
function splitArgs(s) {
  const tokens = tokenize(s);
  const args = [];
  let cur = '';
  let depth = 0;
  for (const t of tokens) {
    if (t.t === 'punct' && t.v === '(') depth++;
    if (t.t === 'punct' && t.v === ')') depth--;
    if (depth === 0 && t.t === 'punct' && t.v === ',') {
      args.push(cur.trim());
      cur = '';
    } else if (t.t === 'id' && t.v === 'Environment.NewLine') cur += "'\\n'";
    else cur += t.v;
  }
  args.push(cur.trim());
  return args;
}

convertEnums();
convertStrings();
convertAlerts();
