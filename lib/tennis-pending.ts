import { z } from 'zod';
import { appointmentLineup, matchGroup, tennisSessionTypes, type Appointment, type TennisRosterPlayer } from './tennis-club';
import { getExplicitTennisSets, getTennisOutcome } from './tennis-session';

type RecordLike={id:string;recorded_on:string;payload:Record<string,unknown>};
export type PendingMatch={id:string;date:string;time:string;type:Appointment['type'];location:string;partner:string;opponents:string[];label:string;recordId:string|null};

const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
const hasResult=(record:RecordLike)=>getExplicitTennisSets(record).length>0||getTennisOutcome(record)!==null;

/** Label used everywhere a match is named: "Felipe & Parceiro vs A & B" for doubles, "Felipe vs A" for singles. */
export function matchLabel(me:string,partner:string,opponents:string[]){
 const us=partner?`${me} & ${partner}`:me,them=opponents.filter(Boolean).join(' & ');
 return them?`${us} vs ${them}`:us;
}

/**
 * Scheduled games that already started (plus 90 min) and still have no result.
 * A record linked by appointment_id, or any record on the same day with sets/outcome, closes the game.
 * A same-day record without a result (e.g. the Apple Watch workout) is returned so the form completes it instead of duplicating.
 */
export function pendingMatches(upcoming:Appointment[],records:RecordLike[],players:TennisRosterPlayer[],me:string,today:string,time:string,lookbackDays=21):PendingMatch[]{
 const now=minutes(time),from=shift(today,-lookbackDays);
 return upcoming.filter(item=>!item.cancelled&&matchGroup(item.type)!=='training'&&item.date>=from&&(item.date<today||(item.date===today&&!!item.time&&minutes(item.time)+90<=now))).flatMap(item=>{
  const sameDay=records.filter(record=>record.recorded_on===item.date);
  if(records.some(record=>record.payload.appointment_id===item.id&&hasResult(record))||sameDay.some(hasResult))return [];
  const lineup=appointmentLineup(item,players),doubles=matchGroup(item.type)==='doubles';
  const opponents=doubles?lineup.opponents:[lineup.opponent||item.opponent].filter(Boolean);
  const partner=doubles?lineup.partner:'';
  const linked=records.find(record=>record.payload.appointment_id===item.id)??sameDay[0];
  return [{id:item.id,date:item.date,time:item.time,type:item.type,location:item.location,partner,opponents,label:matchLabel(me,partner,opponents),recordId:linked?.id??null}];
 }).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}

const score=z.number().min(0).max(10).nullable();
export const tennisMatchSchema=z.object({
 record_id:z.string().uuid().nullable().default(null),
 appointment_id:z.string().max(100).default(''),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 match_type:z.enum(tennisSessionTypes),
 partner:z.string().trim().max(200).default(''),
 opponents:z.array(z.string().trim().max(200)).max(2).default([]),
 duration_minutes:z.number().finite().nonnegative().nullable().default(null),
 sets:z.array(z.object({felipe:z.number().int().min(0).max(99),adversario:z.number().int().min(0).max(99)})).max(5).default([]),
 physical_energy:score.default(null),clarity:score.default(null),performance:score.default(null),effort:score.default(null),
 analysis:z.string().max(10000).default(''),
 notes:z.string().max(5000).default('')
});
export type TennisMatchInput=z.input<typeof tennisMatchSchema>;

/** Payload stored in health_records; keeps opponent_or_partner as the opposing side so head-to-head keeps working. */
export function tennisMatchPayload(raw:unknown){
 const input=tennisMatchSchema.parse(raw);const doubles=input.match_type==='Duplas';
 const opponents=input.opponents.filter(Boolean).slice(0,doubles?2:1);
 const sets=input.sets.filter(set=>set.felipe||set.adversario);
 const won=sets.filter(set=>set.felipe>set.adversario).length,lost=sets.filter(set=>set.adversario>set.felipe).length;
 const payload:Record<string,unknown>={match_type:input.match_type,phase:'Partida completa',opponent_or_partner:opponents.join(' & '),opponents,partner:doubles?input.partner:''};
 if(input.appointment_id)payload.appointment_id=input.appointment_id;
 if(sets.length){payload.sets=sets;payload.score=sets.map(set=>`${set.felipe}-${set.adversario}`).join(', ');if(won!==lost)payload.outcome=won>lost?'vitória':'derrota';}
 for(const key of ['duration_minutes','physical_energy','clarity','performance','effort'] as const)if(input[key]!==null)payload[key]=input[key];
 if(input.analysis.trim())payload.analysis=input.analysis.trim();
 if(input.notes.trim())payload.notes=input.notes.trim();
 return {input,payload};
}
