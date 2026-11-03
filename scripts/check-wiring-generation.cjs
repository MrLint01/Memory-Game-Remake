const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'wiring-challenge.js'), 'utf8'), context);
const wiring = context.window.WiringChallenge;
let checks = 0;
for (let wires = 2; wires <= 8; wires++) {
  for (let destinations = wires; destinations <= 10; destinations++) {
    for (let complexity = 1; complexity <= 4; complexity++) {
      for (let round = 0; round < 5; round++) {
        const record = wiring.generate({ wires, destinations, complexity });
        assert.equal(new Set(record.solution).size, wires);
        assert.ok(record.solution.every(value => value >= 0 && value < destinations));
        assert.ok(record.solution.some((value, index) => index && value < record.solution[index - 1]));
        assert.equal(new Set(record.colors.map(color => color[1])).size, wires);
        for (const positions of [record.leftYs, record.rightYs]) {
          assert.ok(positions.every((value, index) => value >= 22 && value <= 278 && (!index || value > positions[index - 1])));
        }
        record.paths.forEach((points, index) => {
          assert.equal(points.length, complexity + 3);
          assert.equal(points[0][0], 18); assert.equal(points.at(-1)[0], 282);
          assert.equal(points[0][1], record.leftYs[index]);
          assert.equal(points.at(-1)[1], record.rightYs[record.solution[index]]);
          assert.ok(points.flat().every(Number.isFinite));
        });
        const original = JSON.stringify({ solution: record.solution, paths: record.paths });
        assert.equal(wiring.grade(record).correctCount, 0);
        record.selected = record.solution.slice();
        assert.equal(wiring.grade(record).correct, true);
        record.selected[0] = -1;
        assert.equal(wiring.grade(record).correct, false);
        assert.equal(wiring.grade(record).correctCount, wires - 1);
        wiring.reset(record);
        assert.ok(record.selected.every(value => value === -1));
        assert.equal(JSON.stringify({ solution: record.solution, paths: record.paths }), original);
        checks++;
      }
    }
  }
}
console.log(`${checks} wiring generation/partial-credit checks passed across all supported difficulty settings.`);
