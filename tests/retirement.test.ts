import test from 'node:test';
import assert from 'node:assert/strict';
import { assetDebts, defaultRetirement, projectRetirement } from '../lib/retirement';
import { assetSchema } from '../lib/assets';
import { readSettings } from '../lib/settings';

const land=assetSchema.parse({id:'t',name:'Terreno',currency:'BRL',purchasePrice:100000,financing:{instalmentsTotal:24,instalmentsPaid:0,instalmentValue:1000,outstanding:24000}});

test('defaults are conservative and live in the settings',()=>{
 assert.deepEqual(readSettings({}).finance.retirement,defaultRetirement);
 assert.equal(defaultRetirement.years,20);assert.equal(defaultRetirement.monthlySaving,500);
});

test('savings only: £500/month rising with salary, 5% a year, for 20 years',()=>{
 const p=projectRetirement({liquid:0,goods:[],rates:{},startYear:2026});
 assert.equal(p.rows.length,21);assert.equal(p.last.year,2046);
 assert.ok(p.last.investments>230000&&p.last.investments<280000,String(p.last.investments));
 assert.ok(p.last.netToday<p.last.net);
 assert.equal(p.rows[20].monthlySaving,Math.round(500*1.03**19));
});

test('property grows, debt is paid off and half the instalment becomes savings',()=>{
 const rates={BRL:0.15};
 const debts=assetDebts([land],rates);
 assert.equal(debts[0].months,24);assert.equal(debts[0].balance,3600);
 const p=projectRetirement({liquid:1000,goods:[land],rates,debts,startYear:2026});
 assert.deepEqual(p.payoffs,[{name:'Terreno',year:2028}]);
 assert.equal(p.rows[2].debt,0);
 assert.ok(p.rows[0].property===15000&&p.last.property>15000);
 const without=projectRetirement({liquid:1000,goods:[],rates,startYear:2026});
 assert.ok(p.last.investments>without.last.investments);
});
