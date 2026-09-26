import { type HealthEvent, type Food,type TargetTemplate,type Targets,localDate,londonToISO } from './domain';
const base:Targets={water:{kind:'range',min:2500,max:2800},calories:{kind:'range',min:2100,max:2350},protein:{kind:'range',min:105,max:120},carbs:{kind:'range',min:180,max:220},fat:{kind:'range',min:55,max:70},saturated_fat:{kind:'maximum',min:null,max:20},fibre:{kind:'range',min:25,max:30}};
export function demoData(){
 const date=localDate();const nutrition={calories:125,protein:9,carbs:13,fat:4,saturated_fat:1.2,fibre:2,sugar:null,sodium:null};
 const food:Food={id:'b3130f00-9478-4d2d-86da-09f176a10001',name:'Refeição de exemplo',brand:'Dados fictícios',nutrition,favorite:true};
 const mk=(hour:string,type:HealthEvent['type'],data:HealthEvent['data'],i:number):HealthEvent=>({id:`b3130f00-9478-4d2d-86da-09f176a1000${i}`,timestamp:londonToISO(`${date}T${hour}`),local_date:date,timezone:'Europe/London',type,source:'manual',measurement_type:type==='checkin'?'subjective':'measured',estimated:false,notes:'Exemplo fictício',data});
 return {healthRecords:[],periodEvents:[],day:{local_date:date,day_type:'dia sem tênis · caminhada com Caju',targets:base},foods:[food],mealTemplates:[],draft:null,templates:['descanso','normal','tênis leve','tênis moderado','tênis intenso','customizado'].map((x,i)=>({id:String(i),name:x,day_type:x,targets:x.startsWith('tênis')?{...base,water:{kind:'range',min:2800,max:3500}}:base})) as TargetTemplate[],events:[
 mk('07:45','checkin',{kind:'checkin',preset:'Bom dia',scores:{energy:6,clarity:7,motivation:7,activation:6,focus:6,sleepiness:4}},1),
 mk('08:15','water',{kind:'water',volume:650,beverage:'água'},2),
 mk('08:30','meal',{kind:'meal',name:'Café da manhã',meal_type:'Café da manhã',items:[{food_id:food.id,name:food.name,grams:300,nutrition}],hunger:null,satiety:7},3),
 mk('11:00','water',{kind:'water',volume:590,beverage:'água'},4),
 mk('12:45','meal',{kind:'meal',name:'Almoço',meal_type:'Almoço',items:[{food_id:food.id,name:food.name,grams:500,nutrition}],hunger:6,satiety:8},5),
 mk('14:00','checkin',{kind:'checkin',preset:'Check-in geral',scores:{energy:8,clarity:8,motivation:9,activation:8,focus:8,sleepiness:2},activity:'trabalho focado'},6)
 ]};
}
