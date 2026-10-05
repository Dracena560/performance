import { z } from 'zod';
import { dateValue } from './life';

const requiredDate=dateValue.refine(v=>v!=='','Data obrigatória');
/** HTTPS image URL or a compressed JPEG/PNG/WebP data URL. */
const image=(max:number)=>z.string().max(max).refine(value=>value===''||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)||(()=>{try{return new URL(value).protocol==='https:';}catch{return false;}})(),'Use uma URL HTTPS ou uma imagem JPEG/PNG/WebP em data URL.');

export const leaguePlayerSchema=z.object({
 id:z.string().min(1).max(100),
 name:z.string().trim().min(1).max(120),
 nickname:z.string().max(60).default(''),
 country:z.string().regex(/^$|^[A-Z]{2}$/,'Use o código ISO de 2 letras, como BR ou GB.').default(''),
 photo:image(160000).default(''),
 sex:z.string().max(40).default(''),
 hand:z.enum(['','Destro','Canhoto']).default(''),
 backhand:z.enum(['','Uma mão','Duas mãos']).default(''),
 racket:z.string().max(120).default(''),
 strings:z.string().max(120).default(''),
 level:z.string().max(60).default(''),
 favouriteShot:z.string().max(80).default(''),
 favouritePlayer:z.string().max(80).default(''),
 since:z.string().max(20).default(''),
 notes:z.string().max(2000).default(''),
 me:z.boolean().default(false)
});
export const leagueMatchSchema=z.object({
 id:z.string().min(1).max(100),
 home:z.string().min(1).max(100),
 away:z.string().min(1).max(100),
 homeSets:z.number().int().min(0).max(5),
 awaySets:z.number().int().min(0).max(5),
 /** Optional games per set, from the home player's side, e.g. "6-4 3-6 10-8". */
 score:z.string().max(60).default(''),
 date:dateValue.default(''),
 notes:z.string().max(500).default('')
}).refine(m=>m.home!==m.away,'Um jogador não pode jogar contra si mesmo.').refine(m=>m.homeSets!==m.awaySets,'Informe um vencedor: os sets não podem empatar.');
export const leagueImageSchema=z.object({id:z.string().min(1).max(100),url:image(1500000),caption:z.string().max(300).default(''),date:dateValue.default('')});
export const leagueSeasonSchema=z.object({
 id:z.string().min(1).max(100),
 name:z.string().trim().min(1).max(120),
 league:z.string().max(160).default(''),
 division:z.string().max(60).default(''),
 start:requiredDate,
 end:requiredDate,
 players:z.array(z.string().min(1).max(100)).max(40).default([]),
 matches:z.array(leagueMatchSchema).max(1000).default([]),
 images:z.array(leagueImageSchema).max(30).default([]),
 notes:z.string().max(5000).default('')
}).refine(s=>s.end>=s.start,'A temporada termina antes de começar.');
export const tennisLeagueSchema=z.object({
 title:z.string().max(160).default('Singles Evening Box League'),
 players:z.array(leaguePlayerSchema).max(300).default([]),
 seasons:z.array(leagueSeasonSchema).max(200).default([])
}).superRefine((league,ctx)=>{
 const ids=new Set(league.players.map(p=>p.id));
 if(ids.size!==league.players.length)ctx.addIssue({code:'custom',message:'IDs de jogadores duplicados.'});
 const seasonIds=new Set<string>();
 for(const [si,season] of league.seasons.entries()){
  if(seasonIds.has(season.id))ctx.addIssue({code:'custom',path:['seasons',si,'id'],message:'IDs de temporadas duplicados.'});seasonIds.add(season.id);
  for(const p of season.players)if(!ids.has(p))ctx.addIssue({code:'custom',path:['seasons',si,'players'],message:`Jogador inexistente na temporada: ${p}`});
  const pairs=new Set<string>(),matchIds=new Set<string>();
  for(const [mi,m] of season.matches.entries()){
   if(matchIds.has(m.id))ctx.addIssue({code:'custom',path:['seasons',si,'matches',mi,'id'],message:'IDs de partidas duplicados.'});matchIds.add(m.id);
   if(!season.players.includes(m.home)||!season.players.includes(m.away))ctx.addIssue({code:'custom',path:['seasons',si,'matches',mi],message:'Os dois jogadores precisam estar na temporada.'});
   const pair=[m.home,m.away].sort().join('|');if(pairs.has(pair))ctx.addIssue({code:'custom',path:['seasons',si,'matches',mi],message:'Este confronto já foi registrado nesta temporada.'});pairs.add(pair);
  }
 }
});
export type LeaguePlayer=z.infer<typeof leaguePlayerSchema>;
export type LeagueMatch=z.infer<typeof leagueMatchSchema>;
export type LeagueSeason=z.infer<typeof leagueSeasonSchema>;
export type TennisLeague=z.infer<typeof tennisLeagueSchema>;

/** Emoji flag for an ISO 3166-1 alpha-2 code. */
export const flag=(code:string)=>/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(c=>0x1f1e6+c.charCodeAt(0)-65)):'';
const slug=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

/** Quarterly seasons: Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec. */
export function quarterOf(date:string){const year=Number(date.slice(0,4)),q=Math.floor((Number(date.slice(5,7))-1)/3);const start=`${year}-${String(q*3+1).padStart(2,'0')}-01`;const endMonth=q*3+3;const end=new Date(Date.UTC(year,endMonth,0)).toISOString().slice(0,10);return {start,end,id:`${year}-q${q+1}`};}

export type Standing={player:LeaguePlayer;played:number;won:number;lost:number;setsWon:number;setsLost:number;points:number;form:('V'|'D')[];position:number};
/**
 * Table order: wins, then set difference, then sets won, then the head-to-head result.
 * Points shown are 1 per set won plus 1 bonus per win (2-0 win = 3, 2-1 win = 3, 1-2 loss = 1, 0-2 loss = 0).
 */
export function standings(league:TennisLeague,season:LeagueSeason):Standing[]{
 const byId=new Map(league.players.map(p=>[p.id,p]));
 const rows=new Map<string,Omit<Standing,'position'>>();
 for(const id of season.players){const player=byId.get(id);if(player)rows.set(id,{player,played:0,won:0,lost:0,setsWon:0,setsLost:0,points:0,form:[]});}
 for(const m of [...season.matches].sort((a,b)=>(a.date||'').localeCompare(b.date||''))){
  const h=rows.get(m.home),a=rows.get(m.away);if(!h||!a)continue;const homeWon=m.homeSets>m.awaySets;
  for(const [row,mine,theirs,won] of [[h,m.homeSets,m.awaySets,homeWon],[a,m.awaySets,m.homeSets,!homeWon]] as const){row.played++;row.setsWon+=mine;row.setsLost+=theirs;if(won)row.won++;else row.lost++;row.points+=mine+(won?1:0);row.form.push(won?'V':'D');}
 }
 const winner=(x:string,y:string)=>{const m=season.matches.find(m=>(m.home===x&&m.away===y)||(m.home===y&&m.away===x));if(!m)return 0;const xWon=(m.home===x)===(m.homeSets>m.awaySets);return xWon?-1:1;};
 return [...rows.entries()].sort(([ia,a],[ib,b])=>b.won-a.won||(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)||b.setsWon-a.setsWon||winner(ia,ib)||a.player.name.localeCompare(b.player.name)).map(([,r],i)=>({...r,form:r.form.slice(-5),position:i+1}));
}

/** Progress of a season: matches played out of the full round robin, days left, and pairs still to play. */
export function seasonStatus(season:LeagueSeason,today:string){
 const n=season.players.length,total=n*(n-1)/2,played=season.matches.length;
 const day=(d:string)=>Date.parse(d+'T12:00:00Z');const length=Math.round((day(season.end)-day(season.start))/86400000)+1;
 const elapsed=Math.min(length,Math.max(0,Math.round((day(today)-day(season.start))/86400000)+1));
 const done=new Set(season.matches.map(m=>[m.home,m.away].sort().join('|')));const pending:[string,string][]=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const pair=[season.players[i],season.players[j]];if(!done.has([...pair].sort().join('|')))pending.push(pair as [string,string]);}
 const state=today<season.start?'upcoming':today>season.end?'finished':'live';
 return {total,played,percent:total?Math.round(played/total*100):0,length,elapsed,daysLeft:Math.max(0,Math.round((day(season.end)-day(today))/86400000)),state:state as 'upcoming'|'live'|'finished',pending};
}

export function currentSeason(league:TennisLeague,today:string){const sorted=[...league.seasons].sort((a,b)=>b.start.localeCompare(a.start));return sorted.find(s=>s.start<=today&&s.end>=today)??sorted.find(s=>s.start<=today)??sorted[0]??null;}

/** Finds a player by id, exact name, or the start of a name (case and accent insensitive). */
export function findPlayer(league:TennisLeague,query:string){
 const q=slug(query);const exact=league.players.find(p=>p.id===query||slug(p.name)===q||(p.nickname&&slug(p.nickname)===q));if(exact)return exact;
 const partial=league.players.filter(p=>slug(p.name).startsWith(q)||slug(p.name).split('-').includes(q));return partial.length===1?partial[0]:null;
}

/** Adds or replaces the result between two players in a season (one result per pair). */
export function recordResult(league:TennisLeague,seasonId:string,result:{home:string;away:string;homeSets:number;awaySets:number;score?:string;date?:string;notes?:string;id?:string}):TennisLeague{
 const season=league.seasons.find(s=>s.id===seasonId);if(!season)throw new Error('Temporada não encontrada.');
 const home=findPlayer(league,result.home),away=findPlayer(league,result.away);if(!home||!away)throw new Error(`Jogador não encontrado: ${!home?result.home:result.away}. Cadastre-o antes ou use o id exato.`);
 const pair=[home.id,away.id].sort().join('|');const existing=season.matches.find(m=>[m.home,m.away].sort().join('|')===pair);
 const match=leagueMatchSchema.parse({id:result.id??existing?.id??`${season.id}-${pair.replace('|','-')}`,home:home.id,away:away.id,homeSets:result.homeSets,awaySets:result.awaySets,score:result.score??'',date:result.date??'',notes:result.notes??''});
 const players=season.players.includes(home.id)&&season.players.includes(away.id)?season.players:[...new Set([...season.players,home.id,away.id])];
 return tennisLeagueSchema.parse({...league,seasons:league.seasons.map(s=>s.id!==seasonId?s:{...s,players,matches:existing?s.matches.map(m=>m===existing?match:m):[...s.matches,match]})});
}

// Seed: Div 1 of the Singles Evening Box League, season ending 30 Sep 2026 (from the paper table),
// and the season that started on 1 Oct 2026 with the same box. Phone numbers on the sheet are not stored.
const roster:[string,string][]=[['A','Daniel Melo'],['B','Hani Al-Hallak'],['C','Satyam Pandhi'],['D','Jan Kosiba'],['E','Felipe Fabricio'],['F','Tim Evans'],['G','Prashant Parab'],['H','Piyush Somani'],['I','Oliver Gallagher'],['J','Leigh Banwait'],['K','Mike Strydom'],['L','Gilbert Flook']];
const idOf=(letter:string)=>slug(roster.find(([l])=>l===letter)![1]);
// Row player's sets – column player's sets, one entry per pair as written on the sheet.
const sheet='AB 2-0,AC 2-0,AD 2-1,AE 2-1,AF 2-0,AG 2-1,AH 2-0,AI 2-0,AJ 2-1,AL 2-0,BC 2-0,BD 0-2,BE 0-2,BH 2-0,BK 2-0,BL 2-1,CD 2-1,CE 1-2,CG 2-0,CH 2-0,CI 2-1,CL 2-1,DE 2-1,DF 2-1,DG 2-0,DI 2-1,DJ 2-0,DK 2-0,DL 2-0,EF 2-1,EG 2-1,EH 2-0,EI 0-2,EJ 2-1,EL 2-0,FH 2-0,FJ 2-0,FL 2-0,GI 1-2,GJ 0-2,GL 2-0,HI 0-2,HK 0-2,HL 1-2,IL 2-0,JL 1-2';
export function initialTennisLeague():TennisLeague{
 const players=roster.map(([,name])=>({id:slug(name),name,me:name==='Felipe Fabricio',country:name==='Felipe Fabricio'?'BR':''}));
 const ids=players.map(p=>p.id);
 const matches=sheet.split(',').map(entry=>{const [pair,score]=entry.split(' ');const [h,a]=score.split('-').map(Number);return {id:`2026-q3-${idOf(pair[0])}-${idOf(pair[1])}`,home:idOf(pair[0]),away:idOf(pair[1]),homeSets:h,awaySets:a};});
 return tennisLeagueSchema.parse({title:'Singles Evening Box League',players,seasons:[
  {id:'2026-q3',name:'Julho–Setembro 2026',league:'Singles Evening Box League (após 17h, inclusive fins de semana)',division:'Div 1',start:'2026-07-01',end:'2026-09-30',players:ids,matches,notes:'Importado da tabela em papel. Leituras incertas: Daniel × Tim anotado como “2-6” (registrado 2-0); Mike × Piyush com 2-1 riscado (registrado 2-0); Mike × Gilbert e Gilbert × Piyush riscados na linha do Gilbert.'},
  {id:'2026-q4',name:'Outubro–Dezembro 2026',league:'Singles Evening Box League (após 17h, inclusive fins de semana)',division:'Div 1',start:'2026-10-01',end:'2026-12-31',players:ids,matches:[],notes:'Box inicial copiado da temporada anterior; ajuste os jogadores se a divisão mudou.'}
 ]});
}
export function readLeague(value:unknown):TennisLeague{if(value===undefined||value===null)return initialTennisLeague();const parsed=tennisLeagueSchema.safeParse(value);return parsed.success?parsed.data:initialTennisLeague();}

// MCP helpers: pure functions over the stored value, so the route only loads and saves.
const resultArgs=z.object({season_id:z.string().optional(),home:z.string().min(1),away:z.string().min(1),home_sets:z.number().int().min(0).max(5),away_sets:z.number().int().min(0).max(5),score:z.string().max(60).optional(),date:dateValue.optional(),notes:z.string().max(500).optional(),id:z.string().max(100).optional()});
export function mcpRecordResult(stored:unknown,raw:unknown,today:string){const a=resultArgs.parse(raw);const league=stored===undefined?initialTennisLeague():tennisLeagueSchema.parse(stored);const season=a.season_id??currentSeason(league,today)?.id;if(!season)throw new Error('Nenhuma temporada cadastrada.');return recordResult(league,season,{home:a.home,away:a.away,homeSets:a.home_sets,awaySets:a.away_sets,score:a.score,date:a.date,notes:a.notes,id:a.id});}
const playerArgs=leaguePlayerSchema;
/** Creates or updates a player (matched by id, else by name); fields left out keep their value. */
export function mcpSavePlayer(stored:unknown,raw:unknown){
 const league=stored===undefined?initialTennisLeague():tennisLeagueSchema.parse(stored);const input=z.record(z.string(),z.unknown()).parse(raw);
 const existing=typeof input.id==='string'?league.players.find(p=>p.id===input.id):typeof input.name==='string'?findPlayer(league,input.name):null;
 const id=existing?.id??(typeof input.id==='string'&&input.id?input.id:slug(String(input.name??'')));
 if(!id)throw new Error('Informe o nome do jogador.');
 const player=playerArgs.parse({...(existing??{}),...input,id});
 const players=existing?league.players.map(p=>p.id===existing.id?player:p):[...league.players,player];
 return {league:tennisLeagueSchema.parse({...league,players}),player};
}
const seasonArgs=z.object({start:dateValue.optional(),name:z.string().max(120).optional(),division:z.string().max(60).optional(),league:z.string().max(160).optional(),players:z.array(z.string()).optional(),copy_players_from:z.string().optional()});
/** Creates the quarterly season containing `start` (default: today), copying the box of the previous season unless players are given. */
export function mcpCreateSeason(stored:unknown,raw:unknown,today:string){
 const league=stored===undefined?initialTennisLeague():tennisLeagueSchema.parse(stored);const a=seasonArgs.parse(raw);const q=quarterOf(a.start||today);
 if(league.seasons.some(s=>s.id===q.id))throw new Error(`A temporada ${q.id} já existe.`);
 const previous=a.copy_players_from?league.seasons.find(s=>s.id===a.copy_players_from):[...league.seasons].sort((x,y)=>y.start.localeCompare(x.start))[0];
 const players=a.players?a.players.map(p=>{const found=findPlayer(league,p);if(!found)throw new Error(`Jogador não encontrado: ${p}`);return found.id;}):previous?.players??[];
 const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];const m=Number(q.start.slice(5,7))-1;
 const season={id:q.id,name:a.name??`${months[m]}–${months[m+2]} ${q.start.slice(0,4)}`,league:a.league??previous?.league??'',division:a.division??previous?.division??'',start:q.start,end:q.end,players,matches:[],images:[],notes:''};
 return tennisLeagueSchema.parse({...league,seasons:[...league.seasons,season]});
}
const imageArgs=z.object({season_id:z.string().optional(),url:z.string(),caption:z.string().max(300).optional(),date:dateValue.optional(),id:z.string().max(100).optional()});
export function mcpAddImage(stored:unknown,raw:unknown,today:string){
 const league=stored===undefined?initialTennisLeague():tennisLeagueSchema.parse(stored);const a=imageArgs.parse(raw);const seasonId=a.season_id??currentSeason(league,today)?.id;
 const season=league.seasons.find(s=>s.id===seasonId);if(!season)throw new Error('Temporada não encontrada.');
 const item=leagueImageSchema.parse({id:a.id??`img-${Date.now().toString(36)}`,url:a.url,caption:a.caption??'',date:a.date??today});
 const images=season.images.some(i=>i.id===item.id)?season.images.map(i=>i.id===item.id?item:i):[...season.images,item];
 return tennisLeagueSchema.parse({...league,seasons:league.seasons.map(s=>s.id===season.id?{...s,images}:s)});
}
/** Read model for the MCP and the public page: every season with its table, status and pending pairs. */
export function leagueSummary(league:TennisLeague,today:string,seasonId?:string){
 const names=new Map(league.players.map(p=>[p.id,p.name]));
 const seasons=(seasonId?league.seasons.filter(s=>s.id===seasonId):league.seasons).map(s=>{const status=seasonStatus(s,today);return {id:s.id,name:s.name,division:s.division,start:s.start,end:s.end,status:{...status,pending:status.pending.map(([a,b])=>`${names.get(a)} × ${names.get(b)}`)},
  table:standings(league,s).map(r=>({posicao:r.position,jogador:r.player.name,jogos:r.played,vitorias:r.won,derrotas:r.lost,sets:`${r.setsWon}-${r.setsLost}`,pontos:r.points})),
  matches:s.matches.map(m=>({id:m.id,partida:`${names.get(m.home)} ${m.homeSets}-${m.awaySets} ${names.get(m.away)}`,date:m.date,score:m.score})),images:s.images.map(i=>({id:i.id,caption:i.caption,date:i.date}))};});
 return {current:currentSeason(league,today)?.id??null,players:league.players.map(p=>({id:p.id,name:p.name,country:p.country,hand:p.hand,racket:p.racket})),seasons};
}
