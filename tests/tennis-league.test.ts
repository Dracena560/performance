import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialTennisLeague,standings,seasonStatus,recordResult,findPlayer,quarterOf,flag,tennisLeagueSchema,currentSeason } from '../lib/tennis-league';
const league=initialTennisLeague();const q3=league.seasons.find(s=>s.id==='2026-q3')!;
test('the paper table imports as 46 consistent results in a 12-player box',()=>{
 assert.equal(league.players.length,12);assert.equal(q3.matches.length,46);
 const felipe=standings(league,q3).find(s=>s.player.me)!;assert.equal(felipe.won,7);assert.equal(felipe.lost,3);assert.equal(felipe.setsWon,16);assert.equal(felipe.setsLost,10);
});
test('standings order by wins, set difference and head-to-head',()=>{
 const table=standings(league,q3);assert.equal(table[0].player.name,'Daniel Melo');assert.equal(table[0].won,10);
 assert.deepEqual(table.map(r=>r.position),table.map((_,i)=>i+1));
 const total=table.reduce((t,r)=>t+r.won,0);assert.equal(total,46);
});
test('season status counts pending pairs and days left',()=>{
 const s=seasonStatus(q3,'2026-10-05');assert.equal(s.total,66);assert.equal(s.played,46);assert.equal(s.pending.length,20);assert.equal(s.state,'finished');
 const q4=seasonStatus(league.seasons[1],'2026-10-05');assert.equal(q4.state,'live');assert.equal(q4.daysLeft,87);assert.equal(q4.elapsed,5);assert.equal(q4.length,92);
 assert.equal(currentSeason(league,'2026-10-05')?.id,'2026-q4');
});
test('recording a result finds players by name and replaces the same pair',()=>{
 const once=recordResult(league,'2026-q4',{home:'felipe',away:'Gilbert Flook',homeSets:2,awaySets:0,date:'2026-10-04',score:'6-1 6-0'});
 const again=recordResult(once,'2026-q4',{home:'Gilbert',away:'Felipe Fabricio',homeSets:1,awaySets:2});
 const q4=again.seasons.find(s=>s.id==='2026-q4')!;assert.equal(q4.matches.length,1);assert.equal(q4.matches[0].home,'gilbert-flook');
 assert.throws(()=>recordResult(league,'2026-q4',{home:'Nobody',away:'Felipe',homeSets:2,awaySets:0}),/não encontrado/);
 assert.throws(()=>recordResult(league,'2026-q4',{home:'Felipe',away:'Gilbert',homeSets:1,awaySets:1}));
 assert.equal(findPlayer(league,'jan')?.name,'Jan Kosiba');
});
test('schema rejects duplicate pairs, unknown players and bad countries',()=>{
 const bad={...league,seasons:[{...q3,matches:[...q3.matches,{...q3.matches[0],id:'dup'}]}]};assert.equal(tennisLeagueSchema.safeParse(bad).success,false);
 assert.equal(tennisLeagueSchema.safeParse({...league,seasons:[{...q3,players:[...q3.players,'ghost']}]}).success,false);
 assert.equal(tennisLeagueSchema.safeParse({...league,players:[{...league.players[0],country:'Brazil'}]}).success,false);
 assert.deepEqual(quarterOf('2026-11-20'),{start:'2026-10-01',end:'2026-12-31',id:'2026-q4'});assert.equal(flag('BR'),'🇧🇷');
});
import { mcpSavePlayer,mcpCreateSeason,mcpAddImage,mcpRecordResult,leagueSummary } from '../lib/tennis-league';
test('MCP helpers upsert players, create quarterly seasons, add images and results',()=>{
 const {league:withPlayer,player}=mcpSavePlayer(undefined,{name:'Gilbert Flook',country:'GB',hand:'Destro',racket:'Babolat Pure Drive'});
 assert.equal(player.id,'gilbert-flook');assert.equal(withPlayer.players.length,12);assert.equal(withPlayer.players.find(p=>p.id==='gilbert-flook')?.country,'GB');
 const {league:newcomer}=mcpSavePlayer(withPlayer,{name:'Novo Jogador'});assert.equal(newcomer.players.length,13);
 assert.throws(()=>mcpSavePlayer(withPlayer,{name:'X',country:'Inglaterra'}));
 const next=mcpCreateSeason(withPlayer,{start:'2027-01-10'},'2026-10-05');const q1=next.seasons.find(s=>s.id==='2027-q1')!;assert.equal(q1.name,'Janeiro–Março 2027');assert.equal(q1.end,'2027-03-31');assert.equal(q1.players.length,12);
 assert.throws(()=>mcpCreateSeason(next,{start:'2027-02-01'},'2026-10-05'),/já existe/);
 const img=mcpAddImage(next,{url:'https://example.com/tabela.jpg',caption:'Tabela'},'2026-10-05');assert.equal(img.seasons.find(s=>s.id==='2026-q4')!.images.length,1);
 assert.throws(()=>mcpAddImage(next,{url:'http://insecure.example/x.jpg'},'2026-10-05'));
 const played=mcpRecordResult(img,{home:'Felipe',away:'Jan',home_sets:2,away_sets:1},'2026-10-05');
 const summary=leagueSummary(played,'2026-10-05','2026-q4');assert.equal(summary.current,'2026-q4');assert.equal(summary.seasons[0].matches[0].partida,'Felipe Fabricio 2-1 Jan Kosiba');assert.equal(summary.seasons[0].status.played,1);
});
