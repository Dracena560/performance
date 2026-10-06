/**
 * Weekly training load (session minutes × effort 0–10, like the session-RPE method) and the
 * acute:chronic ratio — this week against the average of the 4 weeks before it.
 * Sessions without an effort score count as 5 (moderate).
 */
export type LoadSession={date:string;duration:number|null;effort:number|null};
export const defaultEffort=5;
const monday=(date:string)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);

export function weeklyLoad(sessions:LoadSession[],today:string,weeks=12,effortWhenMissing=defaultEffort){
 const current=monday(today);
 const rows=Array.from({length:weeks},(_,i)=>{const start=shift(current,-7*(weeks-1-i));const end=shift(start,6);
  const list=sessions.filter(s=>s.date>=start&&s.date<=end&&(s.duration??0)>0);
  const load=Math.round(list.reduce((t,s)=>t+(s.duration??0)*(s.effort??effortWhenMissing),0));
  return {week:start,load,minutes:Math.round(list.reduce((t,s)=>t+(s.duration??0),0)),sessions:list.length,estimated:list.some(s=>s.effort===null)};});
 return rows.map((row,i)=>{const previous=rows.slice(Math.max(0,i-4),i);const chronic=previous.length===4?Math.round(previous.reduce((t,r)=>t+r.load,0)/4):null;return {...row,chronic,ratio:chronic?Math.round(row.load/chronic*100)/100:null};});
}

/** Reading of the acute:chronic ratio (0.8–1.3 is the usual safe range). */
export function loadAdvice(ratio:number|null,high=1.3,spike=1.5){
 if(ratio===null)return {level:'Sem base',text:'Registre treinos por pelo menos 5 semanas para comparar a semana com a sua média.'};
 if(ratio>spike)return {level:'Pico de carga',text:'Esta semana está bem acima da sua média de 4 semanas. Risco maior de lesão: priorize sono e um dia leve.'};
 if(ratio>high)return {level:'Acima do normal',text:'Carga subindo rápido. Bom para evoluir, mas evite somar mais sessões intensas nesta semana.'};
 if(ratio>=0.8)return {level:'Faixa ideal',text:'Carga parecida com a sua média recente: ritmo sustentável para evoluir.'};
 return {level:'Abaixo do normal',text:'Semana mais leve que a sua média. Ótimo para recuperar; se não for intencional, você está perdendo condicionamento.'};
}
