import { z } from 'zod';
import { byDateDesc, parseJournalEntry, type JournalEntry } from './journal';

type Db={from:(table:string)=>any};
// select('*') keeps working before and after the topics migration.
const columns='*';

/** The whole journal, newest first (a lifetime of entries is still a few thousand rows). */
export async function loadJournal(db:Db,userId:string):Promise<JournalEntry[]>{
 const result=await db.from('journal_entries').select(columns).eq('user_id',userId).order('occurred_on',{ascending:false}).limit(20000);
 if(result.error)throw new Error('Não foi possível carregar o diário. Confira se a migration do diário foi aplicada.');
 return (result.data as JournalEntry[]).map(entry=>({...entry,topics:entry.topics??[]})).sort(byDateDesc);
}

/** Creates or updates one entry; the same id always updates the same row. */
export async function saveJournalEntry(db:Db,userId:string,raw:unknown,id:string|null,source:'site'|'mcp'){
 const parsed=parseJournalEntry(raw);
 // Topics are only sent when used (or when editing), so the journal still works if the topics migration was not applied yet.
 const {topics,...rest}=parsed;const entry=topics.length||id?parsed:rest;
 const result=id
  ?await db.from('journal_entries').update(entry).eq('id',z.string().uuid().parse(id)).eq('user_id',userId).select(columns).single()
  :await db.from('journal_entries').insert({...entry,user_id:userId,source}).select(columns).single();
 if(result.error)throw new Error(id?'Entrada não encontrada ou não salva.':'Não foi possível salvar a entrada.');
 return result.data as JournalEntry;
}

export async function deleteJournalEntry(db:Db,userId:string,id:string){
 const result=await db.from('journal_entries').delete().eq('id',z.string().uuid().parse(id)).eq('user_id',userId).select('id');
 if(result.error||!result.data?.length)throw new Error('Entrada não encontrada.');
 return true;
}
