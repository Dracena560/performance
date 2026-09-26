export type HealthPayload=Record<string,unknown>;
const normal=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const flatten=(value:unknown,prefix=''):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value as Record<string,unknown>).reduce((out,[name,item])=>({...out,...flatten(item,prefix?`${prefix} ${name}`:name)}),{} as Record<string,unknown>):prefix?{[prefix]:value}:{};
export const metricValue=(payload:HealthPayload,names:string[])=>{const entries=Object.entries(flatten(payload));for(const name of names){const found=entries.find(([field])=>normal(field)===normal(name));if(found){const raw=found[1];if(typeof raw==='number'&&Number.isFinite(raw))return raw;if(typeof raw==='string'&&raw.trim()&&!Number.isNaN(Number(raw)))return Number(raw);}}return null;};
const totalAliases=['total calories','calorias totais','kcal totais','total kcal','total energy','energia total','calorias gastas'];
const activeAliases=['active calories','calorias ativas','kcal ativas','active kcal','active energy','energia ativa'];
export const caloriesBurned=(payload:HealthPayload)=>metricValue(payload,totalAliases)??metricValue(payload,activeAliases);
