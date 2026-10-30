import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, backupTables, readBackup, restoreRows } from '../lib/backup';

test('only backups of this site are accepted',()=>{
 assert.throws(()=>readBackup({foo:1}));
 assert.throws(()=>readBackup({format:BACKUP_FORMAT,version:1,exported_at:'',tables:{unknown_table:[]}}));
 assert.throws(()=>readBackup({format:BACKUP_FORMAT,version:99,exported_at:'',tables:{}}));
 assert.ok(readBackup({format:BACKUP_FORMAT,version:1,exported_at:'',tables:{events:[]}}));
});

test('every table the site writes is in the backup',()=>{
 for(const t of ['events','health_records','health_profiles','journal_entries','foods','days','day_plans'])assert.ok(backupTables.some(b=>b.table===t),t);
});

test('restore writes rows as the current owner and skips rows that still conflict',async()=>{
 const writes:any[]=[];
 const db={from:()=>({upsert:(rows:any)=>{writes.push(rows);const bad=Array.isArray(rows)?rows.some((r:any)=>r.bad):rows.bad;return Promise.resolve({error:bad?{message:'conflict'}:null});}})};
 const r=await restoreRows(db,'me','events',[{id:'1',user_id:'old'},{id:'2',user_id:'old',bad:true}]);
 assert.deepEqual(r,{saved:1,skipped:1});
 assert.equal(writes[0][0].user_id,'me');
});
