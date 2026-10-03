import { matchGroup } from './tennis-club';

export type TennisSet={felipe:number;adversario:number};
export type TennisRecordLike={payload:Record<string,unknown>};

const typeFields=['Tipo de sessão','Tipo informado','type','match_type'] as const;
const text=(payload:Record<string,unknown>,key:string)=>typeof payload[key]==='string'&&payload[key].trim()?payload[key].trim():null;

export function normalizeTennisSessionType(record:TennisRecordLike){
 const candidates=typeFields.map(key=>text(record.payload,key)).filter((value):value is string=>Boolean(value));
 if(candidates.some(value=>matchGroup(value)==='training'))return 'Treino';
 for(const value of candidates){
  const group=matchGroup(value);
  if(group==='league')return 'Simples · Liga';
  if(group==='friendly')return 'Simples · Amistoso';
  if(group==='doubles')return 'Duplas';
 }
 return candidates[0]??null;
}

function explicitSets(payload:Record<string,unknown>):TennisSet[]{
 if(!Array.isArray(payload.sets))return [];
 return payload.sets.flatMap(value=>{
  if(!value||typeof value!=='object')return [];
  const set=value as Record<string,unknown>,felipe=Number(set.felipe),adversario=Number(set.adversario);
  return Number.isInteger(felipe)&&felipe>=0&&Number.isInteger(adversario)&&adversario>=0?[{felipe,adversario}]:[];
 });
}

function scoreSets(payload:Record<string,unknown>):TennisSet[]{
 const raw=text(payload,'score')??text(payload,'Resultado');
 if(!raw)return [];
 const matches=[...raw.matchAll(/(?:^|[,;]\s*)(\d{1,2})\s*[–-]\s*(\d{1,2})(?=$|[,;])/g)];
 return matches.map(match=>({felipe:Number(match[1]),adversario:Number(match[2])}));
}

export function getExplicitTennisSets(record:TennisRecordLike){return explicitSets(record.payload).length?explicitSets(record.payload):scoreSets(record.payload);}

export function getExplicitTennisScore(record:TennisRecordLike){
 if(normalizeTennisSessionType(record)==='Treino')return null;
 const sets=getExplicitTennisSets(record);
 if(sets.length)return sets.map(set=>`${set.felipe}–${set.adversario}`).join(', ');
 return text(record.payload,'score')??text(record.payload,'Resultado');
}

export function getTennisOutcome(record:TennisRecordLike){
 if(normalizeTennisSessionType(record)==='Treino')return null;
 const direct=text(record.payload,'outcome')??text(record.payload,'result')??text(record.payload,'resultado');
 if(direct){const value=direct.toLowerCase();if(value.includes('vit'))return 'vitória';if(value.includes('derr'))return 'derrota';}
 const sets=getExplicitTennisSets(record);if(!sets.length)return null;
 const won=sets.filter(set=>set.felipe>set.adversario).length,lost=sets.filter(set=>set.adversario>set.felipe).length;
 return won===lost?null:won>lost?'vitória':'derrota';
}

export function isCompetitiveTennisMatch(record:TennisRecordLike){
 const type=normalizeTennisSessionType(record);return type!==null&&type!=='Treino'&&['league','friendly','doubles'].includes(matchGroup(type));
}
