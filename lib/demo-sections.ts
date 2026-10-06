// Fictitious data for the dev-only /demo/* preview routes.
// Everything here is invented ("Exemplo") and typed with the real schemas so each
// section renders every visual state without touching the private database.
import { localDate, type HealthEvent } from './domain';
import { demoData } from './demo';
import { creditCardSchema, type CreditCard } from './credit-card';
import { initialTennisLeague, tennisLeagueSchema, type TennisLeague } from './tennis-league';
import { reminders, billsSchema, datesSchema, preferencesSchema, type Bill, type Deadline, type Preferences } from './life';
import { tennisProfileSchema, type TennisProfile } from './tennis-club';
import { investmentsSchema, type InvestmentSnapshot } from './investments';
import { examsSchema, type Exam } from './exams';
import { holdingsSchema, liveRows } from './holdings';
import { dogSchema, type Dog } from './dog';
import { carSchema, financeSchema, tripSchema, type CarProfile, type Finance, type Trip } from './personal';

export type DemoRecord={id:string;category:string;recorded_on:string;recorded_at:string|null;payload:Record<string,unknown>;source:string};

const SOURCE='Dados fictícios';
export const demoToday=()=>localDate();
export function shiftDate(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
const iso=(date:string,time:string)=>new Date(`${date}T${time}:00Z`).toISOString();
// Deterministic pseudo-random values so the demo looks organic but stays stable between renders.
function rng(seed:number){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const round=(n:number,decimals=0)=>Math.round(n*10**decimals)/10**decimals;
const effortLabel=(effort:number)=>effort>=8?'Muito difícil':effort>=6?'Difícil':effort>=4?'Moderado':'Leve';
const zonesFor=(seconds:number)=>[.12,.26,.34,.2,.08].map((share,index)=>({zone:index+1,duration_seconds:Math.round(seconds*share),...(index===0?{max_bpm_exclusive:118}:index===4?{min_bpm:171}:{min_bpm:[118,135,153][index-1],max_bpm:[134,152,170][index-1]})}));

/* Tênis ------------------------------------------------------------------ */
type TennisPlan=[daysAgo:number,type:string,opponent:string,sets:[number,number][]|null,duration:number,energy:number,clarity:number,performance:number,analysis:string];
const tennisPlan:TennisPlan[]=[
 [1,'Simples · Liga','Exemplo Andrade',[[6,4],[3,6],[7,5]],98,7,8,8,'Saque consistente no terceiro set e boa leitura dos pontos longos.'],
 [4,'Treino','Treinador Exemplo',null,60,6,7,7,'Treino de voleio, devolução cruzada e deslocamento lateral.'],
 [7,'Duplas','Exemplo Lima & Exemplo Costa',[[6,3],[6,4]],75,8,8,9,'Comunicação boa com o parceiro; poucos erros não forçados.'],
 [10,'Simples · Amistoso','Exemplo Ribeiro',[[4,6],[5,7]],85,5,6,5,'Noite curta de sono antes do jogo; pernas pesadas no segundo set.'],
 [13,'Simples · Liga','Exemplo Ferreira',[[6,2],[6,3]],70,8,9,9,'Melhor jogo do mês: agressivo na devolução e paciente nas trocas.'],
 [16,'Treino','Treinador Exemplo',null,55,7,7,6,'Foco em segundo saque com mais rotação.'],
 [19,'Duplas','Exemplo Souza & Exemplo Dias',[[3,6],[6,7]],80,6,6,6,'Perdemos os pontos decisivos no tie-break.'],
 [23,'Simples · Amistoso','Exemplo Martins',[[6,4],[6,4]],78,7,8,8,'Jogo controlado, bom aproveitamento nos pontos de break.'],
 [27,'Simples · Liga','Exemplo Andrade',[[6,7],[4,6]],105,6,5,5,'Clareza abaixo do normal; muitas decisões apressadas nas trocas longas.'],
 [31,'Treino','Treinador Exemplo',null,60,7,8,7,'Sessão de condicionamento com séries curtas.'],
 [35,'Simples · Liga','Exemplo Pereira',[[7,5],[6,3]],92,8,8,8,'Saque funcionando bem; poucas duplas faltas.'],
 [40,'Duplas','Exemplo Lima & Exemplo Costa',[[6,4],[4,6],[10,7]],95,7,7,7,'Super tie-break decidido na rede.'],
 [45,'Simples · Amistoso','Exemplo Ribeiro',[[6,1],[6,2]],60,9,9,9,'Adversário com dor no ombro; jogo rápido.'],
 [52,'Simples · Liga','Exemplo Ferreira',[[3,6],[6,4],[4,6]],118,6,7,6,'Fisicamente bem até o fim, mas faltou precisão no terceiro set.'],
 [59,'Simples · Amistoso','Exemplo Martins',null,70,7,7,7,'Placar não anotado; jogo informal de fim de tarde.'],
 [66,'Simples · Liga','Exemplo Pereira',[[6,3],[6,2]],74,8,8,9,'Primeira vitória da temporada de liga (exemplo).'],
];
export function demoTennisRecords():DemoRecord[]{
 const today=demoToday(),r=rng(7);
 return tennisPlan.map(([daysAgo,type,opponent,sets,duration,energy,clarity,performance,analysis],index):DemoRecord=>{
  const date=shiftDate(today,-daysAgo),start=iso(date,'18:30'),end=new Date(Date.parse(start)+duration*60000).toISOString();
  const active=Math.round(duration*7.4+r()*60),avgHr=Math.round(138+r()*14),effort=round(Math.min(10,Math.max(3,(performance+energy)/2+(r()-.5)*2)),1);
  return {id:`demo-tennis-${index+1}`,category:'tennis',recorded_on:date,recorded_at:end,source:SOURCE,payload:{
   kind:'workout',activity_type:'Tênis',type,opponent_or_partner:opponent,duration_minutes:duration,duration_seconds:duration*60,
   physical_energy:energy,clarity,performance,analysis,...(sets?{sets:sets.map(([felipe,adversario])=>({felipe,adversario}))}:{}),
   started_at:start,ended_at:end,active_calories:active,total_calories:active+Math.round(duration*1.6),heart_rate_average:avgHr,
   watch_effort:effort,watch_effort_label:effortLabel(effort),distance_km:round(duration*.055,2),steps:Math.round(duration*62),location:'Clube Exemplo · quadra 3',
   heart_rate_zones:zonesFor(duration*60),post_workout_heart_rate:[{elapsed_minutes:0,bpm:avgHr+12},{elapsed_minutes:1,bpm:avgHr-10},{elapsed_minutes:2,bpm:avgHr-28}],
   weather:{temperature_c:round(14+r()*9,1),humidity_percent:Math.round(55+r()*30),air_quality_index:Math.round(18+r()*20)}
  }};
 }).sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on));
}
export function demoTennisProfile():TennisProfile{
 const today=demoToday();
 return tennisProfileSchema.parse({name:'Jogador Exemplo',sex:'Masculino',racket:'Raquete Exemplo Pro 98 · 305 g',strings:'Corda Exemplo Poly 1.25 · 24 kg',hand:'Destro',backhand:'Duas mãos',level:'NTRP 4.0',club:'Clube Exemplo',league:'Liga Exemplo · Divisão 2',surface:'Grama',grip:'L2',restrung:shiftDate(today,-48),since:'2015',upcoming:[
  {id:'demo-match-1',date:shiftDate(today,3),time:'19:00',opponent:'Exemplo Andrade',location:'Clube Exemplo · quadra 2',type:'Simples · Liga',notes:'Levar bolas novas e garrafa extra.',cancelled:false},
  {id:'demo-match-2',date:shiftDate(today,9),time:'10:30',opponent:'Exemplo Lima & Exemplo Costa',location:'Parque Exemplo · quadra coberta',type:'Duplas',notes:'',cancelled:false},
  {id:'demo-match-3',date:shiftDate(today,14),time:'',opponent:'',location:'Clube Exemplo',type:'Treino',notes:'Horário a confirmar com o treinador.',cancelled:false},
  {id:'demo-match-4',date:shiftDate(today,5),time:'18:00',opponent:'Exemplo Ribeiro',location:'Clube Exemplo · quadra 1',type:'Simples · Amistoso',notes:'Cancelado por chuva.',cancelled:true}
 ]});
}

/* Financeiro -------------------------------------------------------------- */
const financeRows:[item:string,category:string,value:number,payment:string,day:number|null,type:'Fixo'|'Variável'][]=[
 ['Aluguel (exemplo)','House',1450,'Direct Debit Santander',1,'Fixo'],['Council Tax (exemplo)','House',160,'Direct Debit Santander',15,'Fixo'],['Energia e gás','House',120,'Direct Debit Santander',20,'Fixo'],['Água','House',45,'Direct Debit Santander',1,'Fixo'],
 ['Internet','Subscription',32,'Direct Debit Santander',5,'Fixo'],['Celular','Subscription',18,'Direct Debit Santander',8,'Fixo'],['Streaming Exemplo','Subscription',16,'Direct Debit Santander',12,'Fixo'],['Nuvem Exemplo','Subscription',3,'Direct Debit Santander',22,'Fixo'],
 ['Mercado','Grocery',480,'Revolut',null,'Variável'],['Academia Exemplo','Fitness',95,'Direct Debit Santander',1,'Fixo'],['Clube de tênis Exemplo','Fitness',60,'Direct Debit Santander',3,'Fixo'],
 ['Transporte','Transport',140,'Wise Jar',null,'Variável'],['Seguro do carro','Car',98,'Direct Debit Santander',18,'Fixo'],['Combustível','Car',110,'Wise Jar',null,'Variável'],['Road Tax','Car',17.5,'Direct Debit Santander',1,'Fixo'],
 ['Lazer','Entertainment',150,'Wise Jar',null,'Variável'],['Presentes','Shopping',40,'Wise Jar',null,'Variável'],['Vitaminas','Shopping',30,'Wise Jar',null,'Variável'],['Poupança viagem','Savings',200,'Wise Jar',null,'Fixo'],['Pet Exemplo','Pets',55,'Wise Jar',null,'Variável']
];
export function demoFinance():Finance{return financeSchema.parse({incomeFelipe:4100,incomeSara:1500,rows:financeRows.map(([item,category,value,payment,day,type],i)=>({id:`demo-expense-${i+1}`,item,category,value,payment,day,type}))});}

const demoAssets=[
 {asset_id:'demo-etf-mundo',name:'ETF Mundo Exemplo',account:'Corretora Exemplo',currency:'GBP',asset_type:'ETFs',start:4200,drift:.012,flow:150,swing:.03},
 {asset_id:'demo-etf-renda-fixa',name:'ETF Renda Fixa Exemplo',account:'Corretora Exemplo',currency:'GBP',asset_type:'Renda fixa',start:2100,drift:.004,flow:50,swing:.01},
 {asset_id:'demo-bitcoin',name:'Bitcoin (exemplo)',account:'Exchange Exemplo',currency:'USD',asset_type:'Cripto',start:1500,drift:.03,flow:0,swing:.18},
 {asset_id:'demo-acao-tech',name:'Ação Exemplo Tech',account:'Corretora Exemplo USA',currency:'USD',asset_type:'Ações',start:900,drift:.02,flow:0,swing:.1},
 {asset_id:'demo-caixa',name:'Saldo em conta (exemplo)',account:'Banco Exemplo',currency:'GBP',asset_type:'Caixa',start:800,drift:0,flow:-20,swing:0}
] as const;
export function demoInvestments():InvestmentSnapshot[]{
 const today=demoToday(),r=rng(21);
 const months=Array.from({length:9},(_,i)=>{const d=new Date(`${today.slice(0,7)}-15T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()-(8-i));return d.toISOString().slice(0,10);});
 const values=new Map<string,number>(demoAssets.map(asset=>[asset.asset_id,asset.start]));
 return investmentsSchema.parse(months.map((date,index)=>{
  const rate=round(.76+(r()-.5)*.04,4);
  return {id:`demo-inv-${date.slice(0,7)}`,as_of:`${date}T17:00:00+01:00`,notes:index===months.length-1?'Atualização fictícia mais recente.':'',
   // The stock only appears from the third month to exercise the "first update" state.
   items:demoAssets.filter(asset=>!(asset.asset_id==='demo-acao-tech'&&index<2)).map(asset=>{
    const previous=values.get(asset.asset_id)!;const value=index===0?previous:Math.max(0,round(previous*(1+asset.drift+(r()-.5)*asset.swing)+asset.flow,2));values.set(asset.asset_id,value);
    return {asset_id:asset.asset_id,name:asset.name,account:asset.account,currency:asset.currency,value,asset_type:asset.asset_type,net_flow:index===0?null:asset.flow,...(asset.currency==='USD'?{fx:{rate,date,source:'https://example.com/cotacao-ficticia'}}:{})};
   })};
 }));
}

/* Viagens, carro e vida --------------------------------------------------- */
const tripRows:[string,string,string,string,number|null,string][]=[
 ['demo-trip-1','Lisboa','Portugal','2025-05-10',9,'Pastéis em Belém, miradouros ao pôr do sol e um fado inesquecível em Alfama (exemplo).'],
 ['demo-trip-2','Edimburgo','Escócia','2025-08-22',8.5,'Festival no fim de agosto, subida ao Arthur’s Seat e muito vento (exemplo).'],
 ['demo-trip-3','Praia Exemplo','Brasil','2024-12-28',10,'Fim de ano com a família, água morna e açaí todo dia (exemplo).'],
 ['demo-trip-4','Amsterdã','Países Baixos','2026-03-14',7.5,'Museus excelentes, mas o clima atrapalhou os passeios de bicicleta (exemplo).'],
 ['demo-trip-5','Lago Exemplo','Itália','2026-07-05',null,'Ainda sem nota: viagem recente, lembranças em construção (exemplo).'],
 ['demo-trip-6','Cidade Exemplo','França','',8,'Sem data registrada; fim de semana prolongado com amigos (exemplo).']
];
export function demoTrips():Trip[]{return tripRows.map(([id,place,country,date,rating,details])=>tripSchema.parse({id,place,country,date,rating,details}));}

export function demoCar():CarProfile{
 const today=demoToday();
 return carSchema.parse({model:'SUV Exemplo 1.5 Turbo',registration:'EX26 MPL',purchase:'2024-03-12',km:48200,notes:'Dados fictícios para demonstração. Revisão anual feita em março.',photo:'',
  insurance:shiftDate(today,-344),insuranceExpiry:shiftDate(today,21),insuranceSite:'https://example.com/seguro',permit:shiftDate(today,-307),permitExpiry:shiftDate(today,58),permitSite:'https://example.com/parking-permit',
  extra:{
   vehicle:{brand:'Marca Exemplo',version:'Exemplo Edition',year:'2022',vin:'EXEMPLO00000000001',colour:'Cinza grafite',engine:'1.5 turbo',fuel:'Gasolina',transmission:'Automática',power:'163 cv',drive:'4x4',price:'£ 19.500',purchaseKm:'31.000'},
   financing:{type:'PCP',lender:'Financeira Exemplo',intermediary:'Broker Exemplo',proposalNumber:'PX-000123',agreementDate:'2024-03-12',cashPrice:'£ 19.500',deposit:'£ 7.500',cashDeposit:'£ 4.000',tradeIn:'£ 3.500',amount:'£ 12.000',termMonths:'48',apr:'7,9',interestRate:'4,1',instalment:'£ 268',repaymentCount:'47',finalRepayment:'£ 5.900',balloon:'£ 5.900',remaining:'22',paymentDay:'10',nextPayment:shiftDate(today,12),totalChargeCredit:'£ 2.964',totalPayable:'£ 22.464',acceptanceFee:'£ 10',titleTransferFee:'£ 1',commission:'£ 450',earlyRepayment:'Permitida',agreementVehicle:'SUV Exemplo 1.5 Turbo',agreementRegistration:'EX26 MPL',agreementVin:'EXEMPLO00000000001',agreementMileage:'31.000',firstRegistration:'2022-05-18'},
   insurance:{provider:'Seguradora Exemplo',policy:'POL-EX-0001',coverage:'Completa',annual:'£ 1.180',excess:'£ 350',renewal:shiftDate(today,21),drivers:'Titular e cônjuge',breakdown:'Incluído'},
   mot:{last:shiftDate(today,-300),next:shiftDate(today,65),km:'46.100',advisories:'Pneu traseiro esquerdo próximo do limite',failures:'Nenhuma'},
   tax:{amount:'£ 190',paid:shiftDate(today,-120),renewal:shiftDate(today,245)},
   documents:[
    {id:'demo-doc-1',title:'V5C (exemplo)',date:'2024-03-20',km:'',cost:'',notes:'Documento de registro do veículo.',url:'https://example.com/v5c'},
    {id:'demo-doc-2',title:'Invoice da compra',date:'2024-03-12',km:'31.000',cost:'£ 19.500',notes:'Nota fiscal da concessionária Exemplo.',url:'https://example.com/invoice'},
    {id:'demo-doc-3',title:'Contrato de financiamento',date:'2024-03-12',km:'',cost:'',notes:'PCP de 48 meses.',url:''}
   ],
   maintenance:[
    {id:'demo-maint-1',title:'Revisão anual',date:shiftDate(today,-200),km:'41.800',cost:'£ 240',notes:'Óleo, filtros e verificação de freios.',url:''},
    {id:'demo-maint-2',title:'Troca de pneus dianteiros',date:shiftDate(today,-90),km:'45.900',cost:'£ 310',notes:'Dois pneus novos.',url:'https://example.com/pneus'}
   ],
   motHistory:[
    {id:'demo-mot-1',title:'MOT aprovado',date:shiftDate(today,-300),km:'40.300',cost:'£ 55',notes:'Um advisory: pneu traseiro.',url:''},
    {id:'demo-mot-2',title:'MOT aprovado',date:shiftDate(today,-665),km:'33.100',cost:'£ 55',notes:'Sem observações.',url:''}
   ]
  },
  previous:[
   {id:'demo-prev-1',model:'Hatch Exemplo 1.0',registration:'EX18 OLD',purchase:'2019-06-01',sold:'2024-03-01',km:92000,photo:'',notes:'Primeiro carro no Reino Unido. Cinco anos sem susto (exemplo).'},
   {id:'demo-prev-2',model:'Sedan Exemplo 2.0',registration:'EXE-1234',purchase:'2014-02-10',sold:'2018-11-20',km:138000,photo:'',notes:'Carro da época de faculdade (exemplo).'}
  ]});
}

export function demoCreditCard():CreditCard{
 const today=demoToday();
 return creditCardSchema.parse({name:'Cartão Exemplo',limit:5000,dueDay:Number(shiftDate(today,9).slice(8,10)),apr:null,margin:150,checkingBalance:2600,checkingDate:today,history:[
  {id:'demo-card-1',date:shiftDate(today,-62),balance:4200,notes:'Exemplo'},{id:'demo-card-2',date:shiftDate(today,-31),balance:3900,notes:''},{id:'demo-card-3',date:today,balance:3650,notes:''}
 ]});
}
export function demoBills():Bill[]{
 const today=demoToday();
 return billsSchema.parse([
  {id:'demo-bill-1',name:'Energia (exemplo)',site:'https://example.com/energia',value:120,currency:'GBP',date:shiftDate(today,16),monthly:true,notes:'Débito automático.'},
  {id:'demo-bill-2',name:'Internet (exemplo)',site:'https://example.com/internet',value:32,currency:'GBP',date:shiftDate(today,1),monthly:true,notes:''},
  {id:'demo-bill-3',name:'Council Tax (exemplo)',site:'',value:160,currency:'GBP',date:shiftDate(today,11),monthly:true,notes:'10 parcelas por ano.'},
  {id:'demo-bill-4',name:'Seguro residencial (exemplo)',site:'https://example.com/seguro-casa',value:210,currency:'GBP',date:shiftDate(today,120),monthly:false,notes:'Pagamento anual.'},
  {id:'demo-bill-5',name:'Água (exemplo)',site:'',value:null,currency:'GBP',date:'',monthly:true,notes:'Valor variável.'}
 ]);
}
export function demoDates():Deadline[]{
 const today=demoToday();
 return datesSchema.parse([
  {id:'demo-date-1',name:'Passaporte brasileiro (exemplo)',kind:'Passaporte',number:'EX123456',issued:'2019-04-02',date:shiftDate(today,40),url:'',notes:'Renovar com antecedência.'},
  {id:'demo-date-2',name:'Visto de trabalho (exemplo)',kind:'Visto',number:'VX-98765',issued:'2023-09-15',date:shiftDate(today,200),url:'https://example.com/visto',notes:''},
  {id:'demo-date-3',name:'Carteira de motorista (exemplo)',kind:'Documento',number:'DL-00042',issued:'2016-07-01',date:shiftDate(today,6),url:'',notes:'Troca de endereço pendente.'},
  {id:'demo-date-4',name:'Dentista (exemplo)',kind:'Consulta',number:'',issued:'',date:shiftDate(today,2),url:'',notes:'Limpeza semestral.'},
  {id:'demo-date-5',name:'Garantia do notebook (exemplo)',kind:'Garantia',number:'GAR-777',issued:'2024-10-01',date:shiftDate(today,-3),url:'',notes:'Já venceu; avaliar extensão.'},
  {id:'demo-date-6',name:'Assinatura anual de software (exemplo)',kind:'Assinatura',number:'',issued:'',date:shiftDate(today,75),url:'https://example.com/assinatura',notes:''}
 ]);
}
export function demoPreferences():Preferences{
 return preferencesSchema.parse({
  'Comida.Favoritas':'Massas, peixes e comida japonesa (exemplo)','Comida.Não gosta':'Coentro e pimentão cru',
  'Viagem.Tipo de hotel':'Boutique ou apart-hotel com cozinha','Viagem.Cidades':'Lisboa, Roma, Edimburgo','Viagem.Clima':'Ameno, entre 15 e 25 °C','Viagem.Atividades':'Caminhadas, museus e mercados locais',
  'Restaurantes.Tipos':'Italiano, japonês, tailandês','Restaurantes.Preço':'Médio','Restaurantes.Ambiente':'Tranquilo, com mesa ao ar livre quando possível',
  series:[{id:'demo-series-1',name:'Série Exemplo',rating:8.5},{id:'demo-series-2',name:'Documentário Exemplo',rating:'7–9, depende do episódio'},{id:'demo-series-3',name:'Comédia Exemplo',rating:null}]
 }) as Preferences;
}

/** The whole fictitious health_profiles.profile object (what personalData() returns). */
export function demoProfile():Record<string,unknown>{
 return {
  personal_health_initialized:true,
  personal_health_display:{cards:[['Tipo sanguíneo','O+'],['VO₂ max','48,5'],['Resting energy','1.700 kcal'],['Altura','1,76 m']],sections:[
   ['Corpo e capacidade',['VO₂ max: 48,5 (exemplo)','Resting energy médio: 1.700 kcal/dia','Passos médios: 9.800/dia','Exercício médio: 52 min/dia']],
   ['Coração e recuperação',['Sem condições cardíacas relatadas (exemplo)','Frequência cardíaca registrada: 46–186 bpm','Faixa em sono: 48–62 bpm']],
   ['Sono e rotina',['Acorda habitualmente às 7h20','Dorme por volta de 23h','Média recente: 7h40/noite','Caminhada diária e tênis três vezes por semana']],
   ['Digestão e sensibilidades',['Lactose em excesso causa desconforto (exemplo)','Café depois das 16h atrapalha o sono']],
   ['Objetivo de longo prazo',['Manter mobilidade e energia para viajar','Jogar tênis competitivo por muitos anos']]
  ]},
  'Identificação de saúde':'Tipo sanguíneo O+. Altura 1,76 m. Sem uso de óculos (exemplo).',
  'Condição e histórico':'Sem condições crônicas relatadas. Entorse no tornozelo direito em 2021, recuperado (exemplo).',
  'Histórico familiar relevante':'Avó materna: hipertensão. Avô paterno: diabetes tipo 2 (exemplo).',
  'Capacidade e metabolismo':'VO₂ max 48,5. Resting energy médio 1.700 kcal/dia. Referência de atividade: 52 min/dia e 9.800 passos/dia (exemplo).',
  'Sono e rotina':'Acorda por volta de 7h20 e dorme perto das 23h. Média recente de 7h40 por noite (exemplo).',
  'Sensibilidades digestivas':'Lactose em excesso causa desconforto. Café após as 16h atrapalha o sono (exemplo).',
  'Rotina e atividade':'Caminhada pela manhã, trabalho 9h–17h, tênis três vezes por semana e musculação leve (exemplo).',
  'Suplementos':'Dia: vitamina D e ômega-3. Noite: magnésio (exemplo).',
  'Objetivo':'Manter energia, mobilidade e clareza mental para trabalhar, viajar e jogar tênis por muitos anos (exemplo).',
  personal_finance:demoFinance(),personal_investments:demoInvestments(),personal_trips:demoTrips(),personal_car:demoCar(),
  personal_bills:demoBills(),personal_dates:demoDates(),personal_preferences:demoPreferences(),personal_tennis:demoTennisProfile(),personal_credit_card:demoCreditCard(),personal_exams:demoExams(),personal_dog:demoDog()
 };
}
export function demoMeasurements(){return {recorded_on:shiftDate(demoToday(),-12),payload:{peso_kg:78.4,gordura_corporal_percent:17.2,massa_muscular_kg:36.1,imc:24.1,agua_corporal_percent:58.3,cintura_cm:84,massa_ossea_kg:3.2,idade_metabolica:31},source:'Bioimpedância (exemplo)'};}

/* Sono, exercícios e saúde geral ----------------------------------------- */
export function demoSleepRecords():DemoRecord[]{
 const today=demoToday(),r=rng(3);
 return Array.from({length:36},(_,i):DemoRecord|null=>{
  const daysAgo=35-i;if(daysAgo===6||daysAgo===19)return null; // two nights without a record
  const date=shiftDate(today,-daysAgo);
  const total=round(6.4+r()*2.4+(daysAgo%7===5?-.9:0),2);
  const deep=Math.round(35+r()*45),rem=Math.round(65+r()*55),awake=Math.round(8+r()*30),core=Math.max(0,Math.round(total*60-deep-rem-awake));
  return {id:`demo-sleep-${i+1}`,category:'sleep',recorded_on:date,recorded_at:iso(date,'07:30'),source:'Apple Health (exemplo)',payload:{kind:'sleep',hours:total,deep_minutes:deep,rem_minutes:rem,core_minutes:core,awake_minutes:awake,heart_rate_average:Math.round(50+r()*8),heart_rate_min:Math.round(44+r()*4),respiratory_rate:round(14.5+r()*2,1),spo2:Math.round(95+r()*4),morning_recovery:round(5+r()*5,1),bedtime:'23:05',wake_time:'07:25'}};
 }).filter((row):row is DemoRecord=>row!==null);
}

const workoutTypes=[['Caminhada',45,4.2,110],['Corrida',38,7.2,165],['Treino de força',50,0,0],['Ciclismo',55,18.4,0],['Natação',40,1.5,0]] as const;
export function demoExerciseRecords():DemoRecord[]{
 const today=demoToday(),r=rng(11),rows:DemoRecord[]=[];
 for(let daysAgo=44;daysAgo>=0;daysAgo--){
  const date=shiftDate(today,-daysAgo),snapshot=iso(date,daysAgo===0?'15:40':'23:30');
  const steps=Math.round(6500+r()*7000),active=Math.round(420+r()*420);
  rows.push({id:`demo-daily-${daysAgo}`,category:'daily_metrics',recorded_on:date,recorded_at:snapshot,source:'Apple Health (exemplo)',payload:{kind:'daily_metrics',steps,distance_km:round(steps*.00074,2),stand_hours:Math.round(8+r()*5),stand_hours_goal:12,exercise_minutes:Math.round(25+r()*60),exercise_minutes_goal:30,active_calories:active,active_calories_goal:600,total_calories:active+Math.round(1750+r()*120),snapshot_at:snapshot}});
  if(daysAgo%3===0||daysAgo===1){
   const [type,minutes,km,stepsPerMinute]=workoutTypes[Math.floor(daysAgo/3)%workoutTypes.length];
   const duration=Math.round(minutes*(.8+r()*.4)),hr=Math.round(118+r()*35),effort=round(3+r()*6,1),start=iso(date,'07:10'),end=new Date(Date.parse(start)+duration*60000).toISOString(),burned=Math.round(duration*(5.5+r()*4));
   rows.push({id:`demo-workout-${daysAgo}`,category:'workout',recorded_on:date,recorded_at:end,source:'Apple Watch (exemplo)',payload:{kind:'workout',activity_type:type,duration_minutes:duration,duration_seconds:duration*60,started_at:start,ended_at:end,active_calories:burned,total_calories:burned+Math.round(duration*1.5),heart_rate_average:hr,watch_effort:effort,watch_effort_label:effortLabel(effort),...(km?{distance_km:round(km*(.85+r()*.3),2)}:{}),...(stepsPerMinute?{steps:Math.round(duration*stepsPerMinute)}:{}),location:type==='Natação'?'Piscina Exemplo':'Parque Exemplo',heart_rate_zones:zonesFor(duration*60),post_workout_heart_rate:[{elapsed_minutes:0,bpm:hr+10},{elapsed_minutes:1,bpm:hr-12},{elapsed_minutes:2,bpm:hr-30}],weather:{temperature_c:round(9+r()*12,1),humidity_percent:Math.round(60+r()*30)}}});
  }
 }
 return [...rows,...demoTennisRecords()].sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on)||(a.recorded_at??'').localeCompare(b.recorded_at??''));
}

type MealItem=[name:string,grams:number,nutrition:Record<string,number>];
const meals:[name:string,items:MealItem[]][]=[
 ['Café da manhã',[['Iogurte exemplo com granola',250,{calories:140,protein:6,carbs:18,fat:4,saturated_fat:1.5,fibre:2,sodium:60}],['Fruta exemplo',150,{calories:52,protein:.3,carbs:14,fat:.2,saturated_fat:0,fibre:2.4,sodium:1}]]],
 ['Almoço',[['Frango grelhado exemplo',180,{calories:165,protein:31,carbs:0,fat:3.6,saturated_fat:1,fibre:0,sodium:74}],['Arroz integral exemplo',200,{calories:111,protein:2.6,carbs:23,fat:.9,saturated_fat:.2,fibre:1.8,sodium:5}],['Salada exemplo',150,{calories:25,protein:1.5,carbs:5,fat:.2,saturated_fat:0,fibre:2,sodium:20}]]],
 ['Jantar',[['Salmão exemplo',160,{calories:208,protein:20,carbs:0,fat:13,saturated_fat:3.1,fibre:0,sodium:59}],['Batata-doce exemplo',200,{calories:86,protein:1.6,carbs:20,fat:.1,saturated_fat:0,fibre:3,sodium:55}]]],
 ['Lanche',[['Pão exemplo com queijo',120,{calories:300,protein:12,carbs:36,fat:12,saturated_fat:7,fibre:2,sodium:520}]]]
];
/** Meals, water and check-ins for the last 45 days (excluding today, which comes from demoData()). */
export function demoPeriodEvents():HealthEvent[]{
 const today=demoToday(),r=rng(5),events:HealthEvent[]=[];
 const mk=(date:string,time:string,type:HealthEvent['type'],data:HealthEvent['data'],notes='')=>{events.push({id:`demo-event-${events.length+1}`,timestamp:iso(date,time),local_date:date,timezone:'Europe/London',type,source:'manual',measurement_type:type==='checkin'?'subjective':'measured',estimated:false,notes,data});};
 const meal=(date:string,time:string,[name,items]:[string,MealItem[]])=>mk(date,time,'meal',{kind:'meal',name,meal_type:name,items:items.map(([itemName,grams,nutrition])=>({food_id:null,name:itemName,grams:Math.round(grams*(.8+r()*.4)),nutrition})),hunger:Math.round(3+r()*5),satiety:Math.round(5+r()*4)});
 const score=()=>Math.round(4+r()*6);
 for(let daysAgo=45;daysAgo>=1;daysAgo--){
  const date=shiftDate(today,-daysAgo);
  if(r()>.1)meal(date,'08:15',meals[0]);if(r()>.08)meal(date,'12:45',meals[1]);if(r()>.1)meal(date,'19:30',meals[2]);if(r()<.5)meal(date,'16:30',meals[3]);
  for(const [time,volume] of [['08:00',650],['11:00',590],['15:00',650],['18:30',590]] as const)if(r()>.2)mk(date,time,'water',{kind:'water',volume,beverage:'água'});
  mk(date,'09:00','checkin',{kind:'checkin',preset:'Bom dia',scores:{energy:score(),clarity:score(),motivation:score(),focus:score(),sleepiness:Math.round(1+r()*5),stress:Math.round(1+r()*6)}});
  if(r()<.6)mk(date,'15:30','checkin',{kind:'checkin',preset:'Check-in geral',scores:{energy:score(),clarity:score(),focus:score(),stress:Math.round(1+r()*6),anxiety:Math.round(r()*5)},activity:'trabalho focado'},'Exemplo fictício');
 }
 return events;
}
export function demoAllEvents():HealthEvent[]{return [...demoPeriodEvents(),...demoData().events];}
export function demoHealthRecords():DemoRecord[]{return [...demoSleepRecords(),...demoExerciseRecords()];}

/** Enriched HealthApp data: today's demo events plus sleep, movement, diary and reminders. */
export function demoHealthApp(){
 const base=demoData(),today=base.day.local_date,yesterday=shiftDate(today,-1);
 const diary:DemoRecord[]=[
  {id:'demo-diary-1',category:'supplement',recorded_on:today,recorded_at:iso(today,'07:05'),source:'manual',payload:{kind:'vitamins',record_type:'vitamins',routines:['Vitaminas do dia'],notes:''}},
  {id:'demo-diary-2',category:'checkin_history',recorded_on:today,recorded_at:iso(today,'12:30'),source:'manual',payload:{kind:'activity',record_type:'activity',activities:['Leitura','Ambiente com luz natural'],interest:'Alta',notes:'Registro fictício.'}},
  {id:'demo-diary-3',category:'checkin_history',recorded_on:today,recorded_at:iso(today,'09:10'),source:'manual',payload:{kind:'checkin',record_type:'checkin',mental:['Boa clareza'],emotions:['Tranquilo','Motivado'],body:['Leve'],digestion:['Sem desconforto'],notes:''}},
  {id:'demo-diary-4',category:'checkin_history',recorded_on:today,recorded_at:iso(today,'15:40'),source:'manual',payload:{kind:'checkin',record_type:'checkin',mental:['Levemente cansado'],emotions:['Neutro'],body:['Tenso'],digestion:['Gases leve'],notes:'Depois do almoço.'}}
 ];
 // Six earlier days of Registrar check-ins and vitamins, for the weekly evolution.
 const moods=[['Ativo','Bem-humorado','Descansado'],['Levemente cansado','Ansioso','Cansado'],['Boa clareza','Motivado','Leve'],['Neutro','Tranquilo','Leve'],['Turbo','Animado','Ativo'],['Sonolento','Entediado','Pesado']];
 const week:DemoRecord[]=moods.flatMap(([mental,emotion,body],i)=>{const date=shiftDate(today,-(6-i));return [
  {id:`demo-week-c-${i}`,category:'checkin_history',recorded_on:date,recorded_at:iso(date,'10:00'),source:'manual',payload:{kind:'checkin',record_type:'checkin',mental:[mental],emotions:[emotion],body:[body],digestion:['Sem desconforto'],notes:''}},
  {id:`demo-week-v-${i}`,category:'supplement',recorded_on:date,recorded_at:iso(date,'07:00'),source:'manual',payload:{kind:'vitamins',record_type:'vitamins',routines:['Vitaminas do dia'],notes:''}},
  ...(i%2?[{id:`demo-week-a-${i}`,category:'checkin_history',recorded_on:date,recorded_at:iso(date,'18:00'),source:'manual',payload:{kind:'activity',record_type:'activity',activities:['Caminhando com Caju'],notes:''}}]:[])];});
 return {...base,reminders:reminders(demoProfile(),today),exams:demoExams(),dog:demoDog(),healthRecords:[...demoHealthRecords().filter(record=>record.recorded_on===today||record.recorded_on===yesterday),...diary],periodHealthRecords:[...week,...demoSleepRecords()],periodEvents:[...demoPeriodEvents(),...base.events]};
}

/** Same box and results as the seed league, with fictitious names, countries and kit. */
export function demoTennisLeague():TennisLeague{
 const seed=initialTennisLeague();
 const people:[string,string,string,string][]=[['Exemplo Andrade','PT','Destro','Wilson Blade 98'],['Exemplo Ferreira','ES','Canhoto','Babolat Pure Aero'],['Exemplo Pereira','IN','Destro','Head Speed MP'],['Exemplo Ribeiro','PL','Destro','Yonex Ezone 100'],['Jogador Exemplo','BR','Destro','Raquete Exemplo Pro 98'],['Exemplo Martins','GB','Destro','Prince Phantom 100'],['Exemplo Costa','IN','Canhoto','Head Gravity MP'],['Exemplo Lima','IN','Destro','Babolat Pure Drive'],['Exemplo Souza','IE','Destro','Wilson Clash 100'],['Exemplo Dias','GB','Destro','Tecnifibre TF40'],['Exemplo Rocha','ZA','Destro','Head Radical MP'],['Exemplo Alves','GB','Destro','Dunlop CX 200']];
 const ids=new Map(seed.players.map((p,i)=>[p.id,`demo-player-${i+1}`]));
 const players=seed.players.map((p,i)=>({...p,id:ids.get(p.id)!,name:people[i][0],country:people[i][1],hand:people[i][2] as 'Destro'|'Canhoto',racket:people[i][3],backhand:(i%3===0?'Uma mão':'Duas mãos') as 'Uma mão'|'Duas mãos',level:`NTRP ${(3.5+(i%3)*0.5).toFixed(1)}`}));
 const seasons=seed.seasons.map(s=>({...s,league:'Liga Exemplo (noite, inclusive fins de semana)',notes:'',players:s.players.map(id=>ids.get(id)!),matches:s.matches.map(m=>({...m,id:`demo-${m.id}`,home:ids.get(m.home)!,away:ids.get(m.away)!}))}));
 const q4=seasons.find(s=>s.id==='2026-q4')!;const pick=(a:number,b:number,h:number,w:number,d:string)=>({id:`demo-q4-${a}-${b}`,home:`demo-player-${a}`,away:`demo-player-${b}`,homeSets:h,awaySets:w,score:'',date:d,notes:''});
 q4.matches=[pick(5,12,2,0,'2026-10-02'),pick(1,4,2,1,'2026-10-03'),pick(3,8,2,0,'2026-10-04')];
 return tennisLeagueSchema.parse({title:'Liga Exemplo',players,seasons});
}

/** Two fictitious blood tests six months apart, so markers have history and one is out of range. */
export function demoExams():Exam[]{
 const today=demoToday(),old=shiftDate(today,-190),recent=shiftDate(today,-21);
 const panel=(d:number,i:number)=>[
  {id:'vitd',name:'Vitamina D (25-OH)',group:'Vitaminas',value:[24,38][i],unit:'ng/mL',low:30,high:100,reference:'30 a 100 ng/mL'},
  {id:'b12',name:'Vitamina B12',group:'Vitaminas',value:[410,455][i],unit:'pg/mL',low:200,high:900,reference:'200 a 900 pg/mL'},
  {id:'ferritina',name:'Ferritina',group:'Minerais e ferro',value:[96,88][i],unit:'ng/mL',low:30,high:400,reference:'30 a 400 ng/mL'},
  {id:'magnesio',name:'Magnésio',group:'Minerais e ferro',value:[1.9,2.1][i],unit:'mg/dL',low:1.6,high:2.6,reference:'1,6 a 2,6 mg/dL'},
  {id:'ldl',name:'Colesterol LDL',group:'Lipídios',value:[138,124][i],unit:'mg/dL',low:null,high:130,reference:'Desejável < 130 mg/dL'},
  {id:'hdl',name:'Colesterol HDL',group:'Lipídios',value:[48,53][i],unit:'mg/dL',low:40,high:null,reference:'> 40 mg/dL'},
  {id:'tg',name:'Triglicerídeos',group:'Lipídios',value:[132,98][i],unit:'mg/dL',low:null,high:150,reference:'< 150 mg/dL'},
  {id:'glicose',name:'Glicose em jejum',group:'Glicose',value:[92,88][i],unit:'mg/dL',low:70,high:99,reference:'70 a 99 mg/dL'},
  {id:'hba1c',name:'Hemoglobina glicada (HbA1c)',group:'Glicose',value:[5.4,5.6][i],unit:'%',low:null,high:5.6,reference:'< 5,7%'},
  {id:'hb',name:'Hemoglobina',group:'Hemograma',value:[15.1,14.8][i],unit:'g/dL',low:13.5,high:17.5,reference:'13,5 a 17,5 g/dL'},
  {id:'tsh',name:'TSH',group:'Tireoide e hormônios',value:[2.1,2.4][i],unit:'mUI/L',low:0.4,high:4.0,reference:'0,4 a 4,0 mUI/L'},
  {id:'creat',name:'Creatinina',group:'Rins',value:[1.02,1.31][i],unit:'mg/dL',low:0.7,high:1.2,reference:'0,7 a 1,2 mg/dL',notes:i?'Pode subir com treino intenso na véspera (exemplo).':''},
  {id:'pcr',name:'Proteína C reativa',group:'Inflamação',value:[1.2,0.8][i],unit:'mg/L',low:null,high:3,reference:'< 3 mg/L'}
 ].map(r=>({...r,text:'',notes:(r as any).notes??''}));
 return examsSchema.parse([
  {id:'demo-exam-1',date:old,kind:'Exame de sangue',title:'Check-up semestral',lab:'Laboratório Exemplo',doctor:'Dra. Exemplo',results:panel(0,0),notes:'Dados fictícios.'},
  {id:'demo-visit-1',date:shiftDate(today,-18),kind:'Consulta',title:'Clínico geral · retorno',doctor:'Dra. Exemplo',notes:'Manter vitamina D 2.000 UI/dia e repetir exames em 6 meses (exemplo).',next:shiftDate(today,4),nextNote:'Coleta de sangue · repetir vitamina D'},
  {id:'demo-exam-2',date:recent,kind:'Exame de sangue',title:'Check-up semestral',lab:'Laboratório Exemplo',doctor:'Dra. Exemplo',results:panel(0,1),next:shiftDate(today,160),notes:'Dados fictícios.'}
 ]);
}
/** A fictitious dog for the demo (no photo: the page shows an illustrated avatar). */
export function demoDog():Dog{
 const today=demoToday(),d=(n:number)=>shiftDate(today,n);
 return dogSchema.parse({name:'Paçoca',photo:'',breed:'Vira-lata caramelo',sex:'Macho',neutered:'Castrado',birth:shiftDate(today,-365*4+3),adopted:shiftDate(today,-365*3),colour:'Caramelo',microchip:'000 000 000 000 000',passport:'',
  vet:{name:'Clínica Veterinária Exemplo',phone:'+44 20 0000 0000',address:'Rua Exemplo, 100',url:'',emergency:'Hospital 24h Exemplo'},insurance:{provider:'Seguro Pet Exemplo',policy:'PET-0001',renewal:d(40),monthly:24.9,excess:'£ 99'},
  food:{brand:'Ração Exemplo Adulto',gramsPerDay:220,meals:'2 refeições (8h e 18h)',treats:'Cenoura, petisco dental'},allergies:'Frango em excesso dá coceira (exemplo).',personality:'Brincalhão, adora bolinha de tênis e odeia banho.',notes:'Dados fictícios para demonstração.',
  targetWeight:{min:13,max:15},
  vaccines:[{id:'v10',name:'V10 (polivalente)',date:d(-340),next:d(25),vet:'Clínica Exemplo'},{id:'raiva',name:'Antirrábica',date:d(-200),next:d(165)},{id:'gripe',name:'Tosse dos canis',date:d(-380),next:d(-15),notes:'Reforço atrasado (exemplo).'}],
  parasites:[{id:'verm',kind:'Vermífugo',product:'Vermífugo Exemplo',date:d(-87),next:d(3),dose:'1 comprimido'},{id:'pulga',kind:'Antipulgas e carrapatos',product:'Comprimido mensal Exemplo',date:d(-25),next:d(5)}],
  weights:Array.from({length:8},(_,i)=>({id:`w${i}`,date:d(-210+i*30),kg:[13.4,13.6,13.9,14.1,14.4,14.3,14.6,14.8][i]})),
  visits:[{id:'vis1',date:d(-60),reason:'Check-up anual',vet:'Clínica Exemplo',diagnosis:'Saudável. Tártaro leve.',cost:65},{id:'vis2',date:d(-12),reason:'Coceira na orelha',vet:'Clínica Exemplo',diagnosis:'Otite leve (exemplo).',cost:48,next:d(2)}],
  medications:[{id:'otite',name:'Gotas para ouvido',dose:'4 gotas',everyDays:1,times:'8h e 20h',start:d(-12),end:d(2),lastGiven:today,stock:null},{id:'artic',name:'Suplemento articular',dose:'1 tablete',everyDays:1,times:'Com o jantar',start:d(-90),lastGiven:d(-1),stock:9}],
  grooming:[{id:'banho',kind:'Banho',date:d(-20),next:d(10),place:'Pet shop Exemplo',cost:35},{id:'unhas',kind:'Unhas',date:d(-35),next:d(-5)}],
  dates:[{id:'adocao',name:'Aniversário de adoção',date:shiftDate(today,-365*3+20),yearly:true}],
  activityGoalMinutes:60,
  activities:Array.from({length:20},(_,i)=>({id:`act-${i}`,date:d(-i),kind:i%3?'Brincadeira':'Parque',minutes:[25,15,40,20,30][i%5],distanceKm:i%3?null:1.2,steps:null,withMe:true,notes:'',source:'gpt'})),
  foodBags:[{id:'bag-demo',brand:'Ração Exemplo',product:'Adulto Raças Médias',type:'Ração seca',sizeKg:12,price:54.9,started:d(-20),active:true,ingredients:'Frango desidratado, arroz, milho, polpa de beterraba, óleo de peixe (exemplo).',analysis:'Proteína bruta 26%, extrato etéreo 14%, fibra 3%, matéria mineral 7,5%, umidade 9%, cálcio 1,2%, fósforo 0,9% (exemplo).',per100g:{calories:372,protein:26,fat:14,fibre:3,ash:7.5,moisture:9,calcium:1200,phosphorus:900,omega3:0.4,omega6:2.5,vitamin_a:1500,vitamin_d3:150,vitamin_e:40,glucosamine:50},photos:[]}],
  meals:[{id:'meal-1',at:new Date(Date.parse(today+'T08:00:00Z')).toISOString(),date:today,name:'Café da manhã',items:[{name:'Ração Exemplo Adulto Raças Médias',grams:110,foodId:'bag-demo',nutrition:{calories:372,protein:26,fat:14,fibre:3,calcium:1200,phosphorus:900,omega3:0.4,vitamin_a:1500,vitamin_d3:150,vitamin_e:40,glucosamine:50}}],notes:'',source:'gpt'},{id:'meal-2',at:new Date(Date.parse(today+'T12:30:00Z')).toISOString(),date:today,name:'Petisco',items:[{name:'Cenoura',grams:30,foodId:'',nutrition:{calories:41,fibre:2.8,vitamin_a:16700,potassium:320}}],notes:'',source:'manual'}]});
}

/** Fictitious holdings with fixed prices (the demo never calls price APIs). */
export function demoPortfolio(){
 const holdings=holdingsSchema.parse([
  {id:'demo-etf-mundo',name:'ETF Mundo Exemplo',symbol:'VWRL.L',source:'yahoo',account:'Corretora Exemplo',type:'ETFs',currency:'GBP',lots:[{id:'l1',date:'2026-03-02',quantity:40,price:98,currency:'GBP'},{id:'l2',date:'2026-07-01',quantity:8,price:104,currency:'GBP'}]},
  {id:'demo-acao-tech',name:'Ação Exemplo Tech',symbol:'QBTS',source:'yahoo',account:'Corretora Exemplo',type:'Ações',currency:'USD',lots:[{id:'l3',date:'2026-05-12',amount:900,price:15,currency:'USD'}]},
  {id:'demo-btc',name:'Bitcoin (exemplo)',symbol:'BTC',source:'coingecko',account:'Exchange Exemplo',type:'Cripto',currency:'GBP',lots:[{id:'l4',date:'2026-01-20',quantity:0.025,price:52000,currency:'GBP'}]}
 ]);
 const now=new Date().toISOString();
 const quotes={'demo-etf-mundo':{price:109.4,currency:'GBP',at:now,source:'Exemplo'},'demo-acao-tech':{price:21.8,currency:'USD',at:now,source:'Exemplo'},'demo-btc':{price:61200,currency:'GBP',at:now,source:'Exemplo'}};
 return {holdings,rows:liveRows(holdings,quotes,{GBP:{rate:1},USD:{rate:0.75}}),updatedAt:now};
}
