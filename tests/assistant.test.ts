import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantModel, assistantRequestSchema, runAssistant, toClaudeMessages, type AssistantEvent } from '../lib/assistant';
import { mcpInstructions, toolList } from '../lib/mcp-tools';

const reply=(content:any[],stop_reason:string)=>({content,stop_reason}) as any;
function fake(replies:any[]){
 const calls:any[]=[];
 return {calls,client:{beta:{messages:{stream:(params:any)=>{calls.push(JSON.parse(JSON.stringify(params)));const message=replies.shift();return {on:(_:string,listener:(t:string)=>void)=>{for(const b of message.content)if(b.type==='text')listener(b.text);},finalMessage:async()=>message};}}}}};
}
const run=async(client:any,execute:any)=>{const events:AssistantEvent[]=[];const result=await runAssistant({client,model:'m',system:'s',tools:[],messages:[{role:'user',content:'oi'}],execute,emit:e=>events.push(e)});return {events,result};};

test('runs the tool, sends the result back and reports that something was saved',async()=>{
 const f=fake([reply([{type:'tool_use',id:'t1',name:'registrar_agua',input:{volume_ml:650}}],'tool_use'),reply([{type:'text',text:'Salvei.'}],'end_turn')]);
 const seen:any[]=[];
 const {events,result}=await run(f.client,async(name:string,input:unknown)=>{seen.push([name,input]);return {text:'{"saved":true}',isError:false,wrote:true};});
 assert.deepEqual(seen,[['registrar_agua',{volume_ml:650}]]);
 assert.equal(result.wrote,true);
 assert.deepEqual(events.map(e=>e.type),['tool','tool_done','text']);
 const last=f.calls[1].messages.at(-1);
 assert.equal(last.content[0].tool_use_id,'t1');assert.equal(last.content[0].is_error,false);
 assert.equal(f.calls[0].fallbacks,'default');
 assert.equal(assistantModel(),'claude-haiku-5-5');
});

test('a tool failure goes back to Claude instead of breaking the turn',async()=>{
 const f=fake([reply([{type:'tool_use',id:'t1',name:'x',input:{}}],'tool_use'),reply([{type:'text',text:'Não deu.'}],'end_turn')]);
 const {result}=await run(f.client,async()=>{throw new Error('falhou');});
 assert.equal(result.wrote,false);
 assert.equal(f.calls[1].messages.at(-1).content[0].is_error,true);
});

test('never runs tools cut off at the token limit, and reports refusals',async()=>{
 let ran=false;
 const cut=await run(fake([reply([{type:'tool_use',id:'t',name:'x',input:{}}],'max_tokens')]).client,async()=>{ran=true;return {text:'',isError:false,wrote:true};});
 assert.equal(ran,false);assert.equal(cut.events.at(-1)?.type,'error');
 const refused=await run(fake([reply([],'refusal')]).client,async()=>({text:'',isError:false,wrote:false}));
 assert.equal(refused.events.at(-1)?.type,'error');
});

test('history: images and date only where they belong',()=>{
 const {turns}=assistantRequestSchema.parse({turns:[{role:'user',text:'a',images:[{media_type:'image/jpeg',data:'abc'}]},{role:'assistant',text:'b'},{role:'user',text:'c'}]});
 const messages:any=toClaudeMessages(turns,'hoje');
 assert.equal(messages[0].content[0].type,'image');
 assert.equal(messages[0].content[1].text,'a');
 assert.match(messages[2].content[0].text,/^\[Agora em Londres: hoje\]\nc$/);
 assert.throws(()=>assistantRequestSchema.parse({turns:[{role:'system',text:'x'}]}));
});

test('every site tool can be sent to Claude',()=>{
 assert.ok(mcpInstructions.length>100);
 const names=toolList.map(tool=>tool.name);
 assert.equal(new Set(names).size,names.length);
 for(const tool of toolList){assert.match(tool.name,/^[a-zA-Z0-9_-]{1,64}$/);assert.equal((tool.inputSchema as any).type,'object',tool.name);assert.ok(tool.description.length>0,tool.name);}
});

test('the cheapest model is called without the fallback it does not support',async()=>{
 const f=fake([reply([{type:'text',text:'ok'}],'end_turn')]);
 await runAssistant({client:f.client,model:'claude-haiku-5-5',system:'s',tools:[],messages:[{role:'user',content:'oi'}],execute:async()=>({text:'',isError:false,wrote:false}),emit:()=>{}});
 assert.equal(f.calls[0].model,'claude-haiku-5-5');assert.equal(f.calls[0].fallbacks,undefined);assert.equal(f.calls[0].betas,undefined);
});
