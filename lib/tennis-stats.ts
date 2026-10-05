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
 return {bestStreak:best,longest,rated,bagels,comebacks,rival,minutes:matches.reduce((t,m)=>t+(m.duration??0),0)};
}

/** League matches in order, as rounds of a campaign. */
export function leaguePath(matches:MatchLike[]){return matches.filter(m=>m.competitive&&/liga|league/i.test(m.type??'')).sort((a,b)=>a.date.localeCompare(b.date)).map((m,i)=>({...m,round:i+1}));}

export const initials=(name:string|null|undefined)=>{const parts=(name??'').replace(/&/g,' ').split(/\s+/).filter(Boolean);return parts.length?(parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase():'?';};
