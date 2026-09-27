import { z } from 'zod';
export const dateValue=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v),'Data inválida');
export const siteValue=z.string().max(2000).refine(v=>{if(!v)return true;try{return ['https:','http:'].includes(new URL(v).protocol);}catch{return false;}},'Use um endereço com https://');
const fields=z.record(z.string().max(80),z.string().max(10000));
export const carGroups={
 vehicle:{title:'Identificação do veículo',fields:[['brand','Marca'],['version','Versão'],['year','Ano'],['vin','VIN'],['colour','Cor'],['engine','Motor'],['fuel','Combustível'],['transmission','Transmissão'],['power','Potência'],['drive','Tração'],['price','Preço pago'],['purchaseKm','Quilometragem na compra']]},
 financing:{title:'Financiamento',fields:[['type','Tipo (PCP / HP)'],['deposit','Entrada'],['amount','Valor financiado'],['apr','APR (%)'],['instalment','Valor da parcela'],['remaining','Quantas parcelas faltam'],['paymentDay','Dia da parcela'],['nextPayment','Data da próxima parcela','date'],['balloon','Parcela final / balloon'],['lender','Financeira']]},
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
export const preferenceGroups={Comida:['Favoritas','Não gosta','Intolerâncias'],Filmes:['Gêneros','Atores','Estilo'],Viagem:['Tipo de hotel','Cidades','Clima','Atividades'],Carros:['Marcas','Conforto','Tecnologia','Tamanho'],Música:['Estilos','Artistas'],Restaurantes:['Tipos','Preço','Ambiente']} as const;
export const preferencesSchema=z.record(z.string().max(100),z.string().max(5000));
export type Reminder={id:string;name:string;date:string;days:number;level:string;thisMonth:boolean};
export function reminders(profile:Record<string,any>,today:string):Reminder[]{
 const all:{id:string;name:string;date:string}[]=[];const car=profile.personal_car??{},extra=car.extra??{};
 for(const [id,name,date] of [['insurance','Seguro do carro',car.insuranceExpiry],['permit','Parking Permit',car.permitExpiry],['mot','MOT',extra.mot?.next],['tax','Road Tax',extra.tax?.renewal],['renewal','Renovação do seguro',extra.insurance?.renewal],['payment','Parcela do carro',extra.financing?.nextPayment]])if(date)all.push({id:String(id),name:String(name),date:String(date)});
 const parsed=datesSchema.safeParse(profile.personal_dates??[]);if(parsed.success)for(const d of parsed.data)if(d.date)all.push({id:d.id,name:`${d.kind}: ${d.name}`,date:d.date});
 return all.filter(r=>dateValue.safeParse(r.date).success).map(r=>{const days=Math.round((Date.parse(r.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);return {...r,days,thisMonth:r.date.slice(0,7)===today.slice(0,7),level:days<0?'Vencido':days===0?'Hoje':days<=1?'Até 1 dia':days<=7?'Até 7 dias':days<=30?'Até 30 dias':'Até 90 dias'};}).filter(r=>(r.days>=0&&r.days<=90)||r.thisMonth).sort((a,b)=>a.date.localeCompare(b.date));
}
