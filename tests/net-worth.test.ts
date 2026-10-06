import test from 'node:test';
import assert from 'node:assert/strict';
import { carDebt,netWorth,emergencyFund } from '../lib/net-worth';
import { creditCardSchema } from '../lib/credit-card';
const card=creditCardSchema.parse({checkingBalance:2000,checkingDate:'2026-10-01',history:[{id:'a',date:'2026-09-05',balance:6000},{id:'b',date:'2026-10-05',balance:5000}]});
const investments=[{id:'s1',as_of:'2026-10-01T12:00:00Z',notes:'',items:[{asset_id:'etf',name:'ETF',account:'X',currency:'GBP',value:10000,asset_type:'ETFs' as const},{asset_id:'cash',name:'Saldo',account:'X',currency:'GBP',value:3000,asset_type:'Caixa' as const}]}];
const finance={incomeFelipe:4000,incomeSara:0,rows:[{id:'r',item:'Aluguel',category:'Casa',value:1000,type:'Fixo' as const,payment:'DD',day:1},{id:'v',item:'Mercado',category:'Casa',value:500,type:'Variável' as const,payment:'Cartão',day:null}]};
test('car debt prefers the settlement figure and otherwise adds remaining instalments and the final payment',()=>{
 assert.deepEqual(carDebt({extra:{financing:{settlement:'£ 8.000',settlementDate:'2026-10-01'}}})?.value,8000);
 assert.equal(carDebt({extra:{financing:{remaining:'10',instalment:'£ 268',finalRepayment:'£ 5.900'}}})?.value,8580);
 assert.equal(carDebt({}),null);
});
test('net worth is investments plus current account minus the latest card bill and the car debt',()=>{
 const n=netWorth({investments,card,car:{extra:{financing:{settlement:'8000'}}}});
 assert.equal(n.totalAssets,15000);assert.equal(n.totalLiabilities,13000);assert.equal(n.total,2000);assert.deepEqual(n.missing,[]);
});
test('emergency fund counts cash and the account after the card bill, against fixed expenses only',()=>{
 const e=emergencyFund({investments,card,finance});
 assert.equal(e.available,0);assert.equal(e.monthly,1000);assert.equal(e.months,0);assert.equal(e.gap,6000);
 const rich=emergencyFund({investments,card:{...card,history:[]},finance});
 assert.equal(rich.available,5000);assert.equal(rich.months,5);assert.equal(rich.level,'Em construção');
});
