import test from 'node:test';
import assert from 'node:assert/strict';
import {seriesRatingSchema} from '../lib/life';
test('film ratings preserve decimals and qualified ranges without inventing averages',()=>{
 for(const value of [10,8.5,'8,5','7–10, dependendo do episódio',null])assert.equal(seriesRatingSchema.parse(value),value);
 for(const value of [11,-1,'10–7','7–11','20','unknown'])assert.equal(seriesRatingSchema.safeParse(value).success,false);
});
