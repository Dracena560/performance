import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { assistantModel, assistantRequestSchema, assistantSystem, runAssistant, toClaudeMessages, type AssistantEvent } from '@/lib/assistant';
import { callTool, mcpInstructions, toolList } from '@/lib/mcp-tools';
import { configured, supabase } from '@/lib/supabase/server';

export const runtime='nodejs';
export const maxDuration=300;
const tools=toolList.map(tool=>({name:tool.name,description:tool.description,input_schema:tool.inputSchema})) as Anthropic.Beta.BetaTool[];
const friendly=(error:unknown)=>{
 if(error instanceof Anthropic.AuthenticationError)return 'A chave da API do Claude está inválida. Confira ANTHROPIC_API_KEY na Vercel.';
 if(error instanceof Anthropic.RateLimitError)return 'Muitas mensagens em pouco tempo. Tente de novo em instantes.';
 if(error instanceof Anthropic.BadRequestError&&/credit/i.test(error.message))return 'A conta da API do Claude está sem créditos.';
 if(error instanceof Anthropic.APIError)return `O Claude respondeu com erro (${error.status}). Tente de novo.`;
 return 'Não foi possível concluir. Confira se algo já foi salvo antes de repetir.';
};

/** Chat of the Hoje screen: same owner check and same tools as the MCP connector, billed to ANTHROPIC_API_KEY. */
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&new URL(origin).host!==request.headers.get('host'))return NextResponse.json({error:'Origem não permitida.'},{status:403});
 const user=configured()?(await (await supabase()).auth.getUser()).data.user:null;
 if(!user||user.id!==process.env.HEALTH_GPT_USER_ID)return NextResponse.json({error:'Entre com a sua conta para usar o assistente.'},{status:401});
 if(!process.env.ANTHROPIC_API_KEY)return NextResponse.json({error:'Falta configurar ANTHROPIC_API_KEY na Vercel.'},{status:503});
 const parsed=assistantRequestSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success||parsed.data.turns.at(-1)?.role!=='user')return NextResponse.json({error:'Mensagem inválida.'},{status:400});
 const now=new Intl.DateTimeFormat('pt-BR',{timeZone:'Europe/London',dateStyle:'full',timeStyle:'short'}).format(new Date());
 const encoder=new TextEncoder();
 const body=new ReadableStream({async start(controller){
  // After the browser disconnects the stream is closed: nothing else to send.
  const emit=(event:AssistantEvent)=>{if(!request.signal.aborted)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
  let wrote=false;
  try{
   ({wrote}=await runAssistant({client:new Anthropic(),model:assistantModel(),system:assistantSystem(mcpInstructions),tools,messages:toClaudeMessages(parsed.data.turns,now),signal:request.signal,emit,
    execute:async(name,input)=>{
     const tool=toolList.find(item=>item.name===name);if(!tool)return {text:`Ferramenta desconhecida: ${name}`,isError:true,wrote:false};
     const result:any=await callTool(name,input);const isError=!!result?.isError;
     return {text:result?.content?.[0]?.text??JSON.stringify(result),isError,wrote:!tool.annotations.readOnlyHint&&!isError};
    }}));
  }catch(error){if(!request.signal.aborted){console.error('assistant',error);emit({type:'error',message:friendly(error)});}}
  if(wrote)revalidatePath('/','layout');
  emit({type:'done',wrote});
  if(!request.signal.aborted)controller.close();
 }});
 return new Response(body,{headers:{'content-type':'application/x-ndjson; charset=utf-8','cache-control':'no-store'}});
}
