import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { catalog, resources } from '../lib/site-crud';

/**
 * Rule of the project: EVERYTHING the site stores must be readable, addable, editable and removable
 * through the MCP. A new profile section, table or record category that is not exposed fails here.
 */
const files=(dir:string):string[]=>readdirSync(dir).flatMap(f=>{const p=join(dir,f);return statSync(p).isDirectory()?files(p):/\.(ts|tsx)$/.test(f)?[p]:[];});
const source=['app','components','lib'].flatMap(files).filter(f=>!f.endsWith('site-crud.ts')).map(f=>readFileSync(f,'utf8')).join('\n');
const config=Object.values(resources) as {key?:string;table?:string}[];

test('every profile section used by the site is an MCP resource',()=>{
 const used=new Set([...source.matchAll(/personal_[a-z_]+/g)].map(m=>m[0]).filter(k=>!/^personal_(sodium_(type|date)_|health_initialized)$/.test(k)));
 const exposed=new Set(config.map(r=>r.key));
 for(const key of used)assert.ok(exposed.has(key),`${key} não está em lib/site-crud.ts resources`);
});
test('every database table is an MCP resource',()=>{
 const used=new Set([...source.matchAll(/from\('([a-z_]+)'\)/g)].map(m=>m[1]).filter(t=>t!=='health_profiles'));
 const exposed=new Set(config.map(r=>r.table));
 for(const table of used)assert.ok(exposed.has(table),`tabela ${table} não está em lib/site-crud.ts resources`);
});
test('every health record category can be written through the MCP',()=>{
 const registros:any=catalog().resources.find(r=>r.resource==='registros');
 const allowed=new Set(registros.schema.properties.category.enum);
 const used=new Set([...source.matchAll(/category ?(?:===|:) ?'([a-z_]+)'/g)].map(m=>m[1]));
 for(const c of used)assert.ok(allowed.has(c),`categoria ${c} não aceita pelo recurso registros`);
});
test('every MCP resource documents itself and has a schema',()=>{
 for(const r of catalog().resources){assert.ok(r.description.length>20,`${r.resource} sem descrição`);assert.ok(r.schema,`${r.resource} sem schema`);}
});
