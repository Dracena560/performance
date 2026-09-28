import test from 'node:test';
import assert from 'node:assert/strict';
import {formatSleepDuration} from '../lib/sleep-duration';
test('Apple Health night keeps exact minutes for every stage and total',()=>{
  assert.deepEqual([465,116,306,43,10].map(formatSleepDuration),['7h45','1h56','5h06','43 min','10 min']);
  assert.equal(116+306+43,465); // Awake time is separate from time asleep.
  assert.equal(formatSleepDuration(7.75*60),'7h45');
  assert.equal(formatSleepDuration(null),'—');
  assert.equal(formatSleepDuration(0),'0 min');
  assert.equal(formatSleepDuration(59.8),'1h00');
});
