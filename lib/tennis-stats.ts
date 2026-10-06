import type { TennisSet } from './tennis-session';

export type MatchLike={id:string;date:string;type:string|null;opponent:string|null;outcome:string|null;duration:number|null;postScore:number|null;sets:TennisSet[];competitive:boolean};
export type Outcome='V'|'D';

const decided=<T extends MatchLike>(matches:T[])=>matches.filter(m=>m.competitive&&(m.outcome==='vitória'||m.outcome==='derrota'));
const letter=(m:MatchLike):Outcome=>m.outcome==='vitória'?'V':'D';

/** Win/loss record, current streak and last five results, oldest first in `form`. */
export function seasonRecord(matches:MatchLike[]){
 const list=decided(matches).sort((a,b)=>a.date.localeCompare(b.date));const wins=list.filter(m=>m.outcome==='vitória').length,losses=list.length-wins;
 let streak:{kind:Outcome;count:number}|null=null;for(const m of [...list].reverse()){const kind=letter(m);if(!streak)streak={kind,count:1};else if(streak.kind===kind)streak.count++;else break;}
 const sets=list.flatMap(m=>m.sets),games=sets.reduce((t,s)=>({won:t.won+s.felipe,lost:t.lost+s.adversario}),{won:0,lost:0});
 return {wins,losses,played:list.length,rate:list.length?Math.round(wins/list.length*100):null,streak,form:list.slice(-5).map(m=>({id:m.id,result:letter(m),date:m.date,opponent:m.opponent})),
  setsWon:sets.filter(s=>s.felipe>s.adversario).length,setsLost:sets.filter(s=>s.adversario>s.felipe).length,gamesWon:games.won,gamesLost:games.lost};
}

/** Record against each opponent, most played first. */
export function headToHead(matches:MatchLike[]){
 const map=new Map<string,{opponent:string;wins:number;losses:number;last:string}>();
 for(const m of decided(matches)){const name=m.opponent?.trim();if(!name)continue;const key=name.toLowerCase();const row=map.get(key)??{opponent:name,wins:0,losses:0,last:m.date};if(m.outcome==='vitória')row.wins++;else row.losses++;if(m.date>row.last)row.last=m.date;map.set(key,row);}
 return [...map.values()].sort((a,b)=>b.wins+b.losses-(a.wins+a.losses)||b.last.localeCompare(a.last));
}

/** The honours board: personal bests across every session. */
export function honours(matches:MatchLike[]){
 const list=decided(matches).sort((a,b)=>a.date.localeCompare(b.date));let best=0,run=0;for(const m of list){run=m.outcome==='vitória'?run+1:0;best=Math.max(best,run);}
 const longest=matches.filter(m=>m.duration!==null).reduce<MatchLike|null>((top,m)=>!top||m.duration!>top.duration!?m:top,null);
 const rated=matches.filter(m=>m.postScore!==null).reduce<MatchLike|null>((top,m)=>!top||m.postScore!>top.postScore!?m:top,null);
 const bagels=list.flatMap(m=>m.sets).filter(s=>s.felipe===6&&s.adversario===0).length;
 const comebacks=list.filter(m=>m.outcome==='vitória'&&m.sets.length>=2&&m.sets[0].felipe<m.sets[0].adversario).length;
 const rival=headToHead(matches)[0]??null;
 // Matches decided in a third set and sets decided in a tie-break (7–6): how you do when it is close.
 const deciders=list.filter(m=>m.sets.length>=3),tiebreaks=list.flatMap(m=>m.sets).filter(s=>(s.felipe===7&&s.adversario===6)||(s.felipe===6&&s.adversario===7));
 const deciding={won:deciders.filter(m=>m.outcome==='vitória').length,lost:deciders.filter(m=>m.outcome!=='vitória').length};
 const tiebreak={won:tiebreaks.filter(s=>s.felipe>s.adversario).length,lost:tiebreaks.filter(s=>s.felipe<s.adversario).length};
 return {bestStreak:best,longest,rated,bagels,comebacks,rival,deciding,tiebreak,minutes:matches.reduce((t,m)=>t+(m.duration??0),0)};
}

/** League matches in order, as rounds of a campaign. */
export function leaguePath(matches:MatchLike[]){return matches.filter(m=>m.competitive&&/liga|league/i.test(m.type??'')).sort((a,b)=>a.date.localeCompare(b.date)).map((m,i)=>({...m,round:i+1}));}

export const initials=(name:string|null|undefined)=>{const parts=(name??'').replace(/&/g,' ').split(/\s+/).filter(Boolean);return parts.length?(parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase():'?';};

/** Game difference per match (last `limit` matches with sets) and the running win rate after each one. */
export function momentum(matches:MatchLike[],limit=15){
 const list=decided(matches).sort((a,b)=>a.date.localeCompare(b.date));let wins=0;
 const rows=list.map((m,i)=>{if(m.outcome==='vitória')wins++;const won=m.sets.reduce((t,s)=>t+s.felipe,0),lost=m.sets.reduce((t,s)=>t+s.adversario,0);return {id:m.id,date:m.date,opponent:m.opponent,result:letter(m),gamesWon:won,gamesLost:lost,diff:won-lost,hasSets:m.sets.length>0,rate:Math.round(wins/(i+1)*100)};});
 return rows.slice(-limit);
}

/** Minutes and sessions on court per day for the calendar, from `start` to `end` (inclusive). */
export function courtDays(matches:MatchLike[],start:string,end:string){
 const days=new Map<string,{minutes:number;sessions:number}>();
 for(const m of matches){if(m.date<start||m.date>end)continue;const d=days.get(m.date)??{minutes:0,sessions:0};d.minutes+=m.duration??0;d.sessions++;days.set(m.date,d);}
 return [...days.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>({date,...v}));
}
