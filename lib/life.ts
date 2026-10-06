import { z } from 'zod';
import { dateValue } from './date-value';
import { examReminders,readExams } from './exams';
import { dogReminders,readDog } from './dog';
import { readSettings } from './settings';
export { dateValue };
export const siteValue=z.string().max(2000).refine(v=>{if(!v)return true;try{return ['https:','http:'].includes(new URL(v).protocol);}catch{return false;}},'Use um endereço com https://');
const fields=z.record(z.string().max(80),z.string().max(10000));
export const carGroups={
 vehicle:{title:'Identificação do veículo',fields:[['brand','Marca'],['version','Versão'],['year','Ano'],['vin','VIN'],['colour','Cor'],['engine','Motor'],['fuel','Combustível'],['transmission','Transmissão'],['power','Potência'],['drive','Tração'],['price','Preço pago'],['purchaseKm','Quilometragem na compra']]},
 financing:{title:'Financiamento',fields:[['type','Tipo de financiamento'],['lender','Financeira'],['intermediary','Intermediário / broker'],['proposalNumber','Proposal number'],['agreementDate','Data do acordo','date'],['cashPrice','Preço à vista do veículo'],['deposit','Entrada total'],['cashDeposit','Entrada em dinheiro'],['tradeIn','Valor do trade-in'],['amount','Valor financiado'],['termMonths','Prazo (meses)'],['apr','APR (%)'],['interestRate','Taxa de juros fixa a.a. (%)'],['instalment','Parcela mensal'],['repaymentCount','Parcelas regulares'],['finalRepayment','Parcela final'],['balloon','Balloon / parcela final especial'],['remaining','Parcelas restantes'],['settlement','Saldo devedor (settlement figure)'],['settlementDate','Data do saldo devedor','date'],['paymentDay','Dia da parcela'],['nextPayment','Data da próxima parcela','date'],['totalChargeCredit','Total charge for credit'],['totalPayable','Total a pagar'],['acceptanceFee','Acceptance fee'],['titleTransferFee','Title transfer fee'],['commission','Comissão do intermediário'],['earlyRepayment','Liquidação antecipada'],['agreementVehicle','Veículo no contrato'],['agreementRegistration','Matrícula no contrato'],['agreementVin','VIN no contrato'],['agreementMileage','Quilometragem no contrato'],['firstRegistration','Primeiro registo','date']]},
 insurance:{title:'Detalhes do seguro',fields:[['provider','Seguradora'],['policy','Número da apólice'],['coverage','Cobertura'],['annual','Valor anual'],['excess','Franquia'],['renewal','Renewal date','date'],['drivers','Motoristas cobertos'],['breakdown','Breakdown cover']]},
 mot:{title:'MOT',fields:[['last','Último MOT','date'],['next','Próximo vencimento','date'],['km','Quilometragem no MOT'],['advisories','Advisories'],['failures','Falhas anteriores']]},
 tax:{title:'Road Tax',fields:[['amount','Valor'],['paid','Data de pagamento','date'],['renewal','Data de renovação','date']]}
} as const;
export const carRecordSchema=z.object({id:z.string().min(1).max(100),title:z.string().max(200),date:dateValue,km:z.string().max(40),cost:z.string().max(40),notes:z.string().max(10000),url:siteValue});
export const carExtraSchema=z.object({vehicle:fields.default({}),financing:fields.default({}),insurance:fields.default({}),mot:fields.default({}),tax:fields.default({}),maintenance:z.array(carRecordSchema).max(200).default([]),motHistory:z.array(carRecordSchema).max(200).default([]),documents:z.array(carRecordSchema).max(100).default([])}).superRefine((v,c)=>{for(const [group,definition] of Object.entries(carGroups))for(const field of definition.fields){if(field[2]==='date'&&!dateValue.safeParse(v[group as keyof typeof carGroups][field[0]]??'').success)c.addIssue({code:'custom',message:'Confira as datas do carro.'});}});
export type CarExtra=z.infer<typeof carExtraSchema>;
export type CarRecord=z.infer<typeof carRecordSchema>;
export const billSchema=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(150),site:siteValue,value:z.number().finite().nonnegative().nullable(),currency:z.string().regex(/^[A-Z]{3}$/),date:dateValue,monthly:z.boolean(),notes:z.string().max(2000)});
export const billsSchema=z.array(billSchema).max(100);
export type Bill=z.infer<typeof billSchema>;
export const defaultBills:Bill[]=['Energia','Gás','Água','Internet','Council Tax'].map((name,i)=>({id:`bill-${i}`,name,site:'',value:null,currency:'GBP',date:'',monthly:true,notes:''}));
export const deadlineSchema=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(200),kind:z.enum(['Documento','Visto','Passaporte','Garantia','Assinatura','Consulta','Outro']),number:z.string().max(100),issued:dateValue,date:dateValue,url:siteValue,notes:z.string().max(5000)});
export const datesSchema=z.array(deadlineSchema).max(300);
export type Deadline=z.infer<typeof deadlineSchema>;
export const preferenceGroups={Comida:['Favoritas','Não gosta'],Viagem:['Tipo de hotel','Cidades','Clima','Atividades'],Restaurantes:['Tipos','Preço','Ambiente']} as const;
export const seriesRatingSchema=z.union([z.number().min(0).max(10),z.string().trim().min(1).max(200).refine(value=>{const match=value.match(/^(\d+(?:[.,]\d+)?)\s*(?:[–—-]\s*(\d+(?:[.,]\d+)?))?(?:\s*,\s*[^\d].*)?$/);if(!match)return false;const low=Number(match[1].replace(',','.')),high=match[2]?Number(match[2].replace(',','.')):low;return low>=0&&high<=10&&high>=low;},'Use uma nota de 0 a 10 ou uma faixa, como 7–10, dependendo do episódio.')]).nullable();
export const seriesPreferenceSchema=z.object({id:z.string().min(1).max(100),name:z.string().max(200),rating:seriesRatingSchema});
export const preferencesSchema=z.object({series:z.array(seriesPreferenceSchema).max(500).optional()}).catchall(z.string().max(5000));
export type Preferences={series?:z.infer<typeof seriesPreferenceSchema>[]} & {[key:string]:string|z.infer<typeof seriesPreferenceSchema>[]|undefined};
export function cleanPreferences(input:Record<string,any>):Preferences{return Object.fromEntries(Object.entries(input).filter(([key])=>!['Carros.','Música.','Filmes.'].some(prefix=>key.startsWith(prefix))&&key!=='Comida.Intolerâncias')) as Preferences;}

export const reminderWindowDays=5;
export type Reminder={id:string;name:string;source:string;date:string;days:number;level:string;amount:string|null};
const dayMs=86400000;
const daysBetween=(from:string,to:string)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/dayMs);
const money=(value:number|null|undefined,currency='GBP')=>typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(value):null;
function monthDay(year:number,month:number,day:number){const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();return new Date(Date.UTC(year,month,Math.min(day,last),12)).toISOString().slice(0,10);}
export function nextMonthlyDate(day:number,today:string){const year=Number(today.slice(0,4)),month=Number(today.slice(5,7))-1;const current=monthDay(year,month,day);return current>=today?current:monthDay(year,month+1,day);}
function upcoming(date:string,today:string,monthly:boolean){if(!date||!dateValue.safeParse(date).success)return '';return date>=today||!monthly?date:nextMonthlyDate(Number(date.slice(8,10)),today);}
export function nextCarPayment(financing:Record<string,any>|undefined,today:string){const paymentDay=Number(financing?.paymentDay);return upcoming(financing?.nextPayment??'',today,true)||(Number.isInteger(paymentDay)&&paymentDay>=1&&paymentDay<=31?nextMonthlyDate(paymentDay,today):'');}
export function reminders(profile:Record<string,any>,today:string):Reminder[]{
 const rules=readSettings(profile.personal_settings).reminders;
 const all:Omit<Reminder,'days'|'level'>[]=[];const car=profile.personal_car??{},extra=car.extra??{},financing=extra.financing??{};
 const carPayment=nextCarPayment(financing,today);
 for(const [id,name,date] of [['insurance','Seguro do carro',car.insuranceExpiry],['permit','Parking Permit',car.permitExpiry],['mot','MOT',extra.mot?.next],['tax','Road Tax',extra.tax?.renewal],['renewal','Renovação do seguro',extra.insurance?.renewal],['payment','Parcela do carro',carPayment]])if(date)all.push({id:`car-${id}`,name:String(name),source:'Carro',date:String(date),amount:id==='payment'?financing.instalment||null:null});
 const bills=billsSchema.safeParse(profile.personal_bills??[]);if(bills.success)for(const b of bills.data){const date=upcoming(b.date,today,b.monthly);if(date)all.push({id:`bill-${b.id}`,name:b.name,source:'Conta',date,amount:money(b.value,b.currency)});}
 const rows:unknown[]=Array.isArray(profile.personal_finance?.rows)?profile.personal_finance.rows:[];
 for(const row of rows){const r=row as Record<string,unknown>;if(r.type!=='Fixo'||typeof r.item!=='string'||!Number.isInteger(r.day)||(r.day as number)<1||(r.day as number)>31)continue;all.push({id:`expense-${String(r.id??r.item)}`,name:r.item,source:'Gasto fixo',date:nextMonthlyDate(r.day as number,today),amount:money(typeof r.value==='number'?r.value:null)});}
 const card=profile.personal_credit_card,history:unknown[]=Array.isArray(card?.history)?card.history:[];const latest=history.filter((e:any)=>e&&typeof e.balance==='number'&&typeof e.date==='string').reduce<any>((last,e:any)=>!last||e.date>=last.date?e:last,null);
 if(latest&&latest.balance>0&&Number.isInteger(card.dueDay)&&card.dueDay>=1&&card.dueDay<=31)all.push({id:'credit-card',name:String(card.name||'Fatura do cartão de crédito'),source:'Cartão de crédito',date:nextMonthlyDate(card.dueDay,today),amount:money(latest.balance)});
 const dates=datesSchema.safeParse(profile.personal_dates??[]);if(dates.success)for(const d of dates.data)if(d.date)all.push({id:`date-${d.id}`,name:d.name,source:d.kind,date:d.date,amount:null});
 all.push(...examReminders(readExams(profile.personal_exams)));
 if(profile.personal_dog)all.push(...dogReminders(readDog(profile.personal_dog),today));
 const group=(r:Omit<Reminder,'days'|'level'>)=>r.id.startsWith('car-')?'Carro':r.id.startsWith('bill-')?'Contas':r.id.startsWith('expense-')?'Gastos fixos':r.id==='credit-card'?'Cartão de crédito':r.id.startsWith('date-')?'Documentos e datas':r.id.startsWith('exam-')?'Exames':r.id.startsWith('dog-')?'Pet':'';
 return all.filter(r=>(rules.sources as string[]).includes(group(r))).filter(r=>dateValue.safeParse(r.date).success).map(r=>{const days=daysBetween(today,r.date);return {...r,days,level:days===0?'Hoje':days===1?'Amanhã':`Em ${days} dias`};}).filter(r=>r.days>=0&&r.days<=rules.windowDays).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name,'pt-BR'));
}
