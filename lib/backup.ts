/**
 * Full backup of everything the site stores for the owner, table by table, in a file the same site can restore.
 * Rows keep their ids, so restoring over the same database updates them instead of duplicating;
 * on a new database they are recreated. The owner's user id is always replaced by the current one.
 */
type Db={from:(table:string)=>any};
export const BACKUP_FORMAT='felipe-painel-backup';
export const BACKUP_VERSION=1;
export const CHUNK=400;

/** Order matters on restore: profile and settings first, then the day/target tables, then the records. */
export const backupTables=[
 {table:'profiles',owner:'id',conflict:'id'},
 {table:'health_profiles',owner:'user_id',conflict:'user_id'},
 {table:'target_templates',owner:'user_id',conflict:'user_id,day_type'},
 {table:'days',owner:'user_id',conflict:'user_id,local_date'},
 {table:'day_plans',owner:'user_id',conflict:'user_id,local_date'},
 {table:'foods',owner:'user_id',conflict:'id'},
 {table:'meal_templates',owner:'user_id',conflict:'id'},
 {table:'events',owner:'user_id',conflict:'id'},
 {table:'health_records',owner:'user_id',conflict:'id'},
 {table:'journal_entries',owner:'user_id',conflict:'id'},
 {table:'checkin_drafts',owner:'user_id',conflict:'user_id'},
] as const;
export type BackupTable=(typeof backupTables)[number]['table'];
export type BackupFile={format:typeof BACKUP_FORMAT;version:number;exported_at:string;tables:Partial<Record<BackupTable,Record<string,unknown>[]>>};
const config=(table:string)=>{const found=backupTables.find(t=>t.table===table);if(!found)throw new Error(`Tabela desconhecida no backup: ${table}`);return found;};

/** One page of a table (ordered, so pages never overlap). A missing table (migration not applied) returns no rows. */
export async function exportRows(db:Db,userId:string,table:string,offset:number){
 const t=config(table);
 const result=await db.from(t.table).select('*').eq(t.owner,userId).order(t.owner==='user_id'&&t.conflict==='user_id'?'user_id':'id').range(offset,offset+CHUNK-1);
 if(result.error){if(/does not exist|schema cache/i.test(result.error.message))return [];throw new Error(`Não foi possível ler ${table}.`);}
 return (result.data??[]) as Record<string,unknown>[];
}

/** Checks the file before anything is written. */
export function readBackup(raw:unknown):BackupFile{
 const file=raw as BackupFile;
 if(!file||file.format!==BACKUP_FORMAT||typeof file.tables!=='object'||!file.tables)throw new Error('Este arquivo não é um backup do painel.');
 if(file.version>BACKUP_VERSION)throw new Error('Backup de uma versão mais nova do site. Atualize o site antes de restaurar.');
 for(const [table,rows] of Object.entries(file.tables)){config(table);if(!Array.isArray(rows))throw new Error(`Dados inválidos em ${table}.`);}
 return file;
}

/** Writes one chunk: upsert by id (or natural key); rows that still conflict are tried one by one and counted as skipped. */
export async function restoreRows(db:Db,userId:string,table:string,rows:unknown[]){
 const t=config(table);if(!Array.isArray(rows)||rows.length>CHUNK)throw new Error('Lote inválido.');
 const clean=rows.filter((row):row is Record<string,unknown>=>!!row&&typeof row==='object').map(row=>({...row,[t.owner]:userId}));
 if(!clean.length)return {saved:0,skipped:0};
 const all=await db.from(t.table).upsert(clean,{onConflict:t.conflict});
 if(!all.error)return {saved:clean.length,skipped:0};
 let saved=0,skipped=0;
 for(const row of clean){const one=await db.from(t.table).upsert(row,{onConflict:t.conflict});if(one.error)skipped++;else saved++;}
 return {saved,skipped};
}
