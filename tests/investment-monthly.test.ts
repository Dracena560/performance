import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyPortfolio,monthlyAsset,type InvestmentSnapshot} from '../lib/investments';
const snapshot=(id:string,as_of:string,items:InvestmentSnapshot['items']):InvestmentSnapshot=>({id,as_of,items,notes:''});
const item=(asset_id:string,value:number,currency='GBP')=>({asset_id,value,currency,name:asset_id,account:'Example'});
test('month-end totals use latest asset values, retain partial updates and separate currencies',()=>{
 const history=[snapshot('1','2026-08-01T12:00:00Z',[item('a',100),item('b',200),item('br',500,'BRL')]),snapshot('2','2026-08-30T12:00:00Z',[item('a',120)]),snapshot('3','2026-09-15T12:00:00Z',[item('a',130)])];
 const months=monthlyPortfolio(history);
 assert.deepEqual(months.map(m=>m.totals),[[{currency:'GBP',value:320,carried:0},{currency:'BRL',value:500,carried:0}],[{currency:'GBP',value:330,carried:1},{currency:'BRL',value:500,carried:1}]]);
 assert.deepEqual(monthlyAsset(history,'a').map(p=>[p.month,p.value,p.delta]),[['2026-08',120,null],['2026-09',130,10]]);
 assert.equal(months[1].items.find(i=>i.asset_id==='b')?.date,'2026-08-01T12:00:00Z');
 assert.deepEqual(monthlyPortfolio([...history].reverse()),months);
});
test('month boundaries use London time and explicit zero closes a position',()=>{
 const history=[snapshot('1','2026-08-31T23:30:00Z',[item('a',100)]),snapshot('2','2026-10-01T12:00:00Z',[item('a',0)])];
 assert.deepEqual(monthlyPortfolio(history).map(m=>[m.month,m.totals[0].value]),[['2026-09',100],['2026-10',0]]);
 assert.deepEqual(monthlyPortfolio([]),[]);
});

import {priceInPounds} from '../lib/investment-fx';
import {inPounds,gbpValue,investmentType} from '../lib/investments';
import {cleanPreferences,preferencesSchema} from '../lib/life';
test('FX is frozen, retains original amounts, and converts history into GBP',async()=>{
 let calls=0;const mock=(async()=>{calls++;return new Response(JSON.stringify([{date:'2026-09-28',base:'BRL',quote:'GBP',rate:0.14539}]),{status:200});}) as typeof fetch;
 const source=snapshot('fx','2026-09-28T12:00:00Z',[item('br',100,'BRL'),item('uk',20)]);
 const priced=await priceInPounds(source,mock);
 assert.equal(priced.items[0].value,100);assert.equal(gbpValue(priced.items[0]),14.539);
 assert.equal(inPounds([priced])[0].items[0].currency,'GBP');
 assert.deepEqual(await priceInPounds(priced,mock),priced);assert.equal(calls,1);
 assert.equal(gbpValue(item('unknown',100,'BRL')),null);
 assert.equal(investmentType({asset_id:'btc',name:'Bitcoin'}),'Cripto');
 assert.equal(investmentType({asset_id:'urnu',name:'Global X Uranium (Acc)'}),'ETFs');
});
test('future/mismatched FX does not become a saved conversion',async()=>{
 const mock=(async()=>new Response(JSON.stringify([{date:'2026-10-01',base:'BRL',quote:'GBP',rate:1}]),{status:200})) as typeof fetch;
 await assert.rejects(()=>priceInPounds(snapshot('x','2026-09-28T12:00:00Z',[item('br',100,'BRL')]),mock));
});
test('preferences remove only unwanted groups and retain editable series and ratings',()=>{
 const cleaned=cleanPreferences({'Comida.Favoritas':'Arroz','Comida.Intolerâncias':'x','Carros.Marcas':'x','Música.Artistas':'x','Filmes.Gêneros':'x','Viagem.Clima':'Sol',series:[{id:'1',name:'Exemplo',rating:0}]});
 assert.deepEqual(preferencesSchema.parse(cleaned),{'Comida.Favoritas':'Arroz','Viagem.Clima':'Sol',series:[{id:'1',name:'Exemplo',rating:0}]});
 assert.equal(preferencesSchema.safeParse({series:[{id:'1',name:'Exemplo',rating:11}]}).success,false);
});

import {appendSnapshot} from '../lib/investments';
test('retrying an investment does not overwrite its frozen quote or duplicate the month',()=>{
 const first=snapshot('fixed','2026-09-28T12:00:00Z',[{...item('br',100,'BRL'),fx:{rate:0.14539,date:'2026-09-28',source:'https://example.com'}}]);
 const retry=snapshot('fixed','2026-09-28T12:00:00Z',[{...item('br',100,'BRL'),fx:{rate:0.15,date:'2026-09-28',source:'https://example.com'}}]);
 assert.deepEqual(appendSnapshot([first],retry),[first]);
 assert.throws(()=>appendSnapshot([first],{...retry,items:[item('br',101,'BRL')]}));
});
