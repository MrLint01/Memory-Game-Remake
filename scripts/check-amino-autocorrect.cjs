const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'app-core.js'), 'utf8');
const context = { normalize: value => value.trim().toLowerCase(), phase: 'recall', swapMap: null, roundItems: [] };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
vm.runInContext(core.slice(core.indexOf('      function autocorrectAminoAcidName('), core.indexOf('      function isCorrectAnswer(')), context);
const aminoAcids = vm.runInContext('dataSets.aminoAcids', context);
let checks = 0;
const check = (actual, expected) => { assert.equal(actual, expected); checks++; };
for (const entry of aminoAcids) {
  for (const value of [entry.label, entry.oneLetterCode, entry.threeLetterCode, ...entry.nameAliases]) {
    check(context.autocorrectAminoAcidName(value), value);
    check(context.autocorrectAminoAcidName(`  ${value.toLowerCase()}  `), `  ${value.toLowerCase()}  `);
  }
  check(context.autocorrectAminoAcidName(entry.label + 'e'), entry.label);
}
for (const [typed, expected] of [
  ['lyisne', 'Lysine'], ['aspargine', 'Asparagine'], ['phenylalanin', 'Phenylalanine'],
  ['asparticacid', 'Aspartic acid'], ['glutamic-acid', 'Glutamic acid'],
  ['', ''], ['x', 'x'], ['al', 'Alanine'], ['ph', 'Phenylalanine'], ['ly', 'Lysine'],
  ['is', 'Isoleucine'], ['tr', 'Tryptophan'], ['as', 'as'], ['gl', 'gl'],
  ['aspa', 'aspa'], ['aspar', 'aspar'], ['aspara', 'Asparagine'], ['glutamin', 'Glutamine'],
  ['xyzxyzxyz', 'xyzxyzxyz'], ['glysin', 'glysin']
]) check(context.autocorrectAminoAcidName(typed), expected);
function input(value, index = 0) { return { value, disabled: false, dataset: { index: String(index) } }; }
function correct(item, value) {
  context.roundItems = [item]; context.swapMap = null;
  const field = input(value); const suggestion = context.getAminoAcidInputSuggestion(field); check(field.value, value); return suggestion ?? field.value;
}
check(correct({ category: 'aminoAcids', label: 'Valine' }, 'lyisne'), 'Lysine');
check(correct({ category: 'aminoAcids', label: 'Valine' }, 'phe'), 'Phenylalanine');
check(correct({ category: 'aminoAcids', label: 'Valine' }, 'K'), 'K');
check(correct({ category: 'numbers', label: '1' }, 'lyisne'), 'lyisne');
check(correct({ category: 'aminoAcids', recallHint: 'Background color', answer: 'Red' }, 'lyisne'), 'lyisne');
check(correct({ category: 'aminoAcids', recallHint: 'Text color', answer: 'Red' }, 'lyisne'), 'lyisne');
check(correct({ category: 'aminoAcids', sequenceSteps: [{}] }, 'lyisne'), 'lyisne');
check(correct({ category: 'numbers', answerCategory: 'aminoAcids', recallHint: 'Previous card' }, 'lyisne'), 'Lysine');
context.roundItems = [{ category: 'numbers' }, { category: 'aminoAcids' }]; context.swapMap = [1, 0];
const mapped = input('lyisne'); check(context.getAminoAcidInputSuggestion(mapped), 'Lysine'); check(mapped.value, 'lyisne');
context.roundItems = [{ category: 'aminoAcids' }]; context.swapMap = null;
for (const state of ['idle', 'show', 'result']) {
  context.phase = state;
  const field = input('lyisne'); check(context.getAminoAcidInputSuggestion(field), null); check(field.value, 'lyisne');
}
context.phase = 'recall';
for (const field of [Object.assign(input('lyisne'), { disabled: true }), { ...input('lyisne'), dataset: { index: '0', composing: 'true' } }]) {
  check(context.getAminoAcidInputSuggestion(field), null); check(field.value, 'lyisne');
}
console.log(`${checks} amino acid spelling suggestion checks passed.`);
