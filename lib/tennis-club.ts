import { z } from 'zod';
import { dateValue } from './life';

export const tennisSessionTypes=['Simples · Liga','Simples · Amistoso','Duplas','Treino'] as const;
export const appointmentSchema=z.object({
 id:z.string().min(1).max(100),
 date:dateValue.refine(v=>!!v,'Informe a data'),
 time:z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/).default(''),
 /** Kept for appointments saved before the player roster was introduced. */
 opponent:z.string().max(200).default(''),
 opponentId:z.string().max(100).default(''),
 partnerId:z.string().max(100).default(''),
 opponentIds:z.array(z.string().min(1).max(100)).max(2).default([]),
 location:z.string().max(200).default(''),
 type:z.enum(tennisSessionTypes).default('Simples · Amistoso'),
 notes:z.string().max(5000).default(''),
 cancelled:z.boolean().default(false)
});
export const tennisProfileSchema=z.object({name:z.string().max(150).default('Felipe'),sex:z.string().max(60).default(''),racket:z.string().max(200).default('Yonex Vcore 98'),strings:z.string().max(200).default('Solinco Mach 10 · 52 lbs'),hand:z.string().max(40).default(''),backhand:z.string().max(40).default(''),level:z.string().max(100).default(''),club:z.string().max(200).default(''),league:z.string().max(200).default(''),surface:z.string().max(40).default(''),grip:z.string().max(40).default(''),restrung:dateValue.default(''),since:z.string().max(20).default(''),upcoming:z.array(appointmentSchema).max(500).default([])});
export type TennisProfile=z.infer<typeof tennisProfileSchema>;
export type Appointment=z.infer<typeof appointmentSchema>;
export type TennisRosterPlayer={id:string;name:string;nickname?:string;me?:boolean};
const normalizeName=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[-_.']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
/**
 * The league roster is the only player registry. Free text from older records or chats ("Hani")
 * resolves to the roster player by id, full name, nickname, or a first name/prefix that matches one player only.
 */
export function resolvePlayer(text:string,roster:TennisRosterPlayer[]):TennisRosterPlayer|null{
 const value=normalizeName(text);if(!value)return null;
 const exact=roster.find(player=>player.id===text.trim()||normalizeName(player.name)===value||(!!player.nickname&&normalizeName(player.nickname)===value));
 if(exact)return exact;
 const others=roster.filter(player=>!player.me);
 const first=others.filter(player=>normalizeName(player.name).split(' ')[0]===value);
 if(first.length===1)return first[0];
 const prefix=others.filter(player=>normalizeName(player.name).startsWith(value));
 return prefix.length===1?prefix[0]:null;
}
/** "Hani & Satyam", "Hani e Satyam", "Hani / Satyam" → ["Hani","Satyam"]. */
export const splitPlayerNames=(text:string)=>text.split(/\s*(?:&|\/|\+|,|\s+e\s+|\s+and\s+)\s*/i).map(name=>name.trim()).filter(Boolean);
type Participant={id:string|null;name:string};
const participant=(id:unknown,text:string,roster:TennisRosterPlayer[]):Participant=>{
 const byId=typeof id==='string'&&id?roster.find(player=>player.id===id):undefined;
 const player=byId??resolvePlayer(text,roster);
 return player?{id:player.id,name:player.name}:{id:null,name:text.trim()};
};
const textField=(payload:Record<string,unknown>,keys:string[])=>{for(const key of keys){const value=payload[key];if(typeof value==='string'&&value.trim())return value.trim();}return '';};
/** Opponents and partner of a tennis record, named from the roster whenever possible. */
export function recordParticipants(payload:Record<string,unknown>,roster:TennisRosterPlayer[]){
 // Records came from the site, ChatGPT and imports with different field names: all of them mean the same people.
 const list=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&!!item.trim()):[];
 const single=[payload.opponent_id,payload.opponentId].find((id):id is string=>typeof id==='string'&&!!id);
 const ids=list(payload.opponent_ids).length?list(payload.opponent_ids):list(payload.opponentIds).length?list(payload.opponentIds):single?[single]:[];
 const typed=textField(payload,['opponent_or_partner','opponent','Adversário']);
 const names=typed?splitPlayerNames(typed):list(payload.opponents);
 const count=Math.max(ids.length,names.length);
 const opponents=Array.from({length:count},(_,i)=>participant(ids[i],names[i]??'',roster)).filter(item=>item.name);
 const partnerText=textField(payload,['partner']);
 const partnerId=payload.partner_id||payload.partnerId;
 const partner=partnerText||partnerId?participant(partnerId,partnerText,roster):null;
 return {opponents,partner:partner?.name?partner:null};
}
/** Rewrites a record payload so names come from the roster and ids point at it; unknown names stay as typed. */
export function withRosterIds(payload:Record<string,unknown>,roster:TennisRosterPlayer[]){
 const {opponents,partner}=recordParticipants(payload,roster);
 const out:Record<string,unknown>={...payload};
 if(opponents.length){out.opponent_or_partner=opponents.map(item=>item.name).join(' & ');out.opponent_ids=opponents.map(item=>item.id).filter(Boolean);}
 if(partner){out.partner=partner.name;if(partner.id)out.partner_id=partner.id;else delete out.partner_id;}
 delete out.opponent;delete out.opponentId;delete out.opponentIds;delete out.partnerId;
 return out;
}
const sessionType=(payload:Record<string,unknown>)=>textField(payload,['match_type','type','Tipo de sessão','Tipo informado']);
const lineupKeys=/^(partner|partner_id|partnerId|opponent|opponents|opponent_or_partner|opponent_id|opponentId|opponent_ids|opponentIds|match_type|type)$/;
/** Whether a change touches the session type or who played, the only changes that need the doubles check. */
export const touchesLineup=(keys:string[])=>keys.some(key=>lineupKeys.test(key));
/** Doubles need the partner and two opponents, all from the player list. Returns what is wrong, or null. */
export function doublesLineupError(payload:Record<string,unknown>,roster:TennisRosterPlayer[]){
 if(matchGroup(sessionType(payload))!=='doubles')return null;
 const {opponents,partner}=recordParticipants(payload,roster);
 if(!partner||opponents.length<2)return 'Sessão de duplas precisa do parceiro e dos 2 adversários.';
 if(opponents.length>2)return 'Sessão de duplas tem só 2 adversários.';
 const people=[partner,...opponents];
 const missing=people.filter(person=>!person.id).map(person=>person.name);
 if(missing.length)return `Cadastre primeiro em Tênis › Jogadores: ${missing.join(', ')}.`;
 if(people.some(person=>roster.find(player=>player.id===person.id)?.me))return 'Você já está na dupla: escolha outro parceiro ou adversário.';
 if(new Set(people.map(person=>person.id)).size<3)return 'Cada jogador só pode aparecer uma vez na partida.';
 return null;
}
export function matchGroup(type:string){const t=type.toLowerCase();if(/trein|training/.test(t))return 'training';if(/dupla|double/.test(t))return 'doubles';if(/liga|league/.test(t))return 'league';if(/amist|friendly/.test(t))return 'friendly';return 'other';}
export function participantName(players:TennisRosterPlayer[],id:string){return players.find(player=>player.id===id)?.name??'';}
/** Produces one display label from explicit roster selections; legacy free text remains intact. */
export function appointmentParticipants(item:Appointment,players:TennisRosterPlayer[]){
 if(matchGroup(item.type)==='doubles'){
  const partner=participantName(players,item.partnerId);
  const opponents=item.opponentIds.map(id=>participantName(players,id)).filter(Boolean);
  const detail=[partner?`Dupla com ${partner}`:'',opponents.length?`vs ${opponents.join(' & ')}`:''].filter(Boolean).join(' · ');
  return detail||item.opponent;
 }
 const opponent=participantName(players,item.opponentId);
 return opponent||item.opponent;
}
export function appointmentLineup(item:Appointment,players:TennisRosterPlayer[]){
 const partner=participantName(players,item.partnerId);
 const opponents=item.opponentIds.map(id=>participantName(players,id)).filter(Boolean);
 const opponent=participantName(players,item.opponentId);
 return {partner,opponents,opponent};
}
/** Keeps legacy text and roster-based scheduling in sync for all site and MCP writes. */
export function withAppointmentParticipants(item:Appointment,players:TennisRosterPlayer[]):Appointment{
 const opponent=appointmentParticipants(item,players);
 return {...item,opponent};
}
const agendaInput=z.object({id:z.string().max(100).optional(),date:dateValue.refine(v=>!!v,'Informe a data'),time:z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/).optional(),location:z.string().max(200).optional(),type:z.enum(tennisSessionTypes).optional(),opponent_id:z.string().max(100).optional(),partner_id:z.string().max(100).optional(),opponent_ids:z.array(z.string().min(1).max(100)).max(2).optional(),notes:z.string().max(5000).optional(),cancelled:z.boolean().optional()});
/** MCP-friendly upsert for an upcoming game. Participant ids always point at the shared league roster. */
export function mcpSaveAppointment(stored:unknown,roster:TennisRosterPlayer[],raw:unknown){
 const input=agendaInput.parse(raw);const profile=tennisProfileSchema.parse(stored??{});const existing=input.id?profile.upcoming.find(item=>item.id===input.id):undefined;
 const item=appointmentSchema.parse({...existing,...input,id:input.id??existing?.id??`match-${Date.now().toString(36)}`,opponentId:input.opponent_id??existing?.opponentId??'',partnerId:input.partner_id??existing?.partnerId??'',opponentIds:input.opponent_ids??existing?.opponentIds??[]});
 const ids=[item.opponentId,item.partnerId,...item.opponentIds].filter(Boolean);for(const id of ids)if(!roster.some(player=>player.id===id))throw new Error(`Jogador não encontrado: ${id}. Cadastre-o ou consulte a lista de jogadores.`);
 const saved=withAppointmentParticipants(item,roster);return tennisProfileSchema.parse({...profile,upcoming:existing?profile.upcoming.map(current=>current.id===existing.id?saved:current):[...profile.upcoming,saved]});
}
export function mcpDeleteAppointment(stored:unknown,id:string){const profile=tennisProfileSchema.parse(stored??{});if(!profile.upcoming.some(item=>item.id===id))throw new Error('Partida agendada não encontrada.');return tennisProfileSchema.parse({...profile,upcoming:profile.upcoming.filter(item=>item.id!==id)});}
export function upcomingMatches(items:Appointment[],date:string,time:string){return items.filter(i=>!i.cancelled&&(i.date>date||(i.date===date&&(!i.time||i.time>=time)))).sort((a,b)=>(a.date+(a.time||'23:59')).localeCompare(b.date+(b.time||'23:59')));}
