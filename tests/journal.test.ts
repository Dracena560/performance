import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { dueRevisits, filterJournal, journalMarkdown, journalStats, onThisDay, parseJournalEntry, promptOfDay, type JournalEntry } from '../lib/journal';

const entry=(id:string,raw:Record<string,unknown>):JournalEntry=>({id,...parseJournalEntry(raw)});
const entries=[
 entry('a',{occurred_on:'2024-10-24',kind:'conquista',title:'Primeira vitória na liga',people:['Hani Al-Hallak'],tags:['#Tênis'],milestone:true}),
 entry('b',{occurred_on:'2026-10-23',kind:'reflexao',body:'Semana cansativa, mas boa.',mood:7,tags:['trabalho']}),
 entry('c',{occurred_on:'2026-10-24',kind:'decisao',title:'Trocar de corda',revisit_on:'2026-10-24',mood:9}),
];

test('entries need text; tags lose # and repeats',()=>{
 assert.throws(()=>parseJournalEntry({occurred_on:'2026-10-24'}));
 assert.deepEqual(parseJournalEntry({occurred_on:'2026-10-24',title:'x',tags:['#Tênis','tênis','Liga']}).tags,['tênis','liga']);
});

test('search ignores accents and combines filters',()=>{
 assert.deepEqual(filterJournal(entries,{query:'vitoria'}).map(e=>e.id),['a']);
 assert.deepEqual(filterJournal(entries,{person:'hani al-hallak'}).map(e=>e.id),['a']);
 assert.deepEqual(filterJournal(entries,{year:'2026'}).map(e=>e.id),['c','b']);
 assert.deepEqual(filterJournal(entries,{milestones:true}).map(e=>e.id),['a']);
});

test('on this day, revisits, streak and mood',()=>{
 assert.deepEqual(onThisDay(entries,'2026-10-24').map(e=>e.id),['a']);
 assert.deepEqual(dueRevisits(entries,'2026-10-24').map(e=>e.id),['c']);
 const stats=journalStats(entries,'2026-10-24');
 assert.equal(stats.streak,2);assert.equal(stats.mood30,8);assert.equal(stats.milestones,1);
 assert.ok(promptOfDay('2026-10-24').endsWith('?'));
});

test('markdown export groups by year, oldest first',()=>{
 const md=journalMarkdown(entries);
 assert.ok(md.indexOf('## 2024')<md.indexOf('## 2026'));
 assert.match(md,/★ 24 de outubro de 2024 — Primeira vitória na liga/);
});

test('journal migration: RLS isolates users and rejects empty entries',async()=>{
 const db=new PGlite();
 await db.exec(`create schema auth;create role anon;create role authenticated;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;`);
 await db.exec(readFileSync('supabase/migrations/202610240004_journal.sql','utf8'));
 const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
 await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
 await db.query(`insert into public.journal_entries(user_id,occurred_on,title,tags) values($1,'2026-10-24','Oi','{tênis}')`,[a]);
 await assert.rejects(()=>db.query(`insert into public.journal_entries(user_id,occurred_on) values($1,'2026-10-24')`,[a]));
 await assert.rejects(()=>db.query(`insert into public.journal_entries(user_id,occurred_on,title) values($1,'2026-10-24','x')`,[b]));
 await db.exec(`set request.jwt.claim.sub='${b}';`);
 assert.equal((await db.query('select * from public.journal_entries')).rows.length,0);
 await db.close();
});
