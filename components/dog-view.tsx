'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bath,Bone,Bug,Cake,CalendarHeart,Check,Cpu,Dog as DogIcon,Heart,PawPrint,Pencil,Phone,Pill,Plus,Scale,ShieldCheck,Stethoscope,Syringe,Utensils} from 'lucide-react';
import {Button} from './ui/button';
import {EChart,lineOption} from './echart';
import {RecordDialog,type Field} from './record-form';
import {savePersonalSection} from '@/app/actions';
import {ageLabel,dogSchema,groomingKinds,nextDose,parasiteKinds,upcomingCare,vaccineStatus,weightSummary,type Dog,type DogList} from '@/lib/dog';

const num=(v:number,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(v);
const money=(v:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
const dateText=(d:string,opts:Intl.DateTimeFormatOptions={day:'2-digit',month:'short',year:'numeric'})=>d?new Intl.DateTimeFormat('pt-BR',{...opts,timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'—';
const when=(days:number)=>days<0?`Atrasado ${-days} ${days===-1?'dia':'dias'}`:days===0?'Hoje':days===1?'Amanhã':`Em ${days} dias`;
const careIcon:Record<string,typeof Syringe>={Vacina:Syringe,'Antiparasitário':Bug,'Remédio':Pill,'Veterinário':Stethoscope,Higiene:Bath,Seguro:ShieldCheck,'Aniversário':Cake,Data:CalendarHeart};

const fields:Record<DogList,Field[]>={
 vaccines:[{key:'name',label:'Vacina',placeholder:'V10, Antirrábica, Tosse dos canis…'},{key:'date',label:'Data da dose',type:'date'},{key:'next',label:'Próximo reforço',type:'date'},{key:'vet',label:'Clínica ou veterinário'},{key:'batch',label:'Lote'},{key:'notes',label:'Observações',type:'textarea'}],
 parasites:[{key:'kind',label:'Tipo',type:'select',options:parasiteKinds},{key:'product',label:'Produto'},{key:'date',label:'Data',type:'date'},{key:'next',label:'Próxima dose',type:'date'},{key:'dose',label:'Dose'},{key:'notes',label:'Observações',type:'textarea'}],
 weights:[{key:'date',label:'Data',type:'date'},{key:'kg',label:'Peso (kg)',type:'number'},{key:'notes',label:'Observações',wide:true}],
 visits:[{key:'reason',label:'Motivo'},{key:'date',label:'Data',type:'date'},{key:'vet',label:'Clínica ou veterinário'},{key:'cost',label:'Custo (£)',type:'number'},{key:'next',label:'Retorno',type:'date'},{key:'diagnosis',label:'Diagnóstico e orientações',type:'textarea'},{key:'notes',label:'Observações',type:'textarea'}],
 medications:[{key:'name',label:'Remédio'},{key:'dose',label:'Dose',placeholder:'1/2 comprimido, 4 gotas…'},{key:'everyDays',label:'A cada quantos dias',type:'number'},{key:'times',label:'Horários',placeholder:'8h e 20h'},{key:'start',label:'Início',type:'date'},{key:'end',label:'Fim (opcional)',type:'date'},{key:'lastGiven',label:'Última dose',type:'date'},{key:'stock',label:'Doses em estoque',type:'number'},{key:'active',label:'Em uso',type:'checkbox'},{key:'notes',label:'Observações',type:'textarea'}],
 grooming:[{key:'kind',label:'Cuidado',type:'select',options:groomingKinds},{key:'date',label:'Data',type:'date'},{key:'next',label:'Próximo',type:'date'},{key:'place',label:'Onde'},{key:'cost',label:'Custo (£)',type:'number'},{key:'notes',label:'Observações',wide:true}],
 dates:[{key:'name',label:'Nome'},{key:'date',label:'Data',type:'date'},{key:'yearly',label:'Repete todo ano',type:'checkbox'},{key:'notes',label:'Observações',wide:true}]
};
const blank:Record<DogList,(today:string)=>Record<string,unknown>>={
 vaccines:t=>({name:'',date:t,next:'',vet:'',batch:'',notes:''}),parasites:t=>({kind:'Vermífugo',product:'',date:t,next:'',dose:'',notes:''}),weights:t=>({date:t,kg:null,notes:''}),
 visits:t=>({reason:'',date:t,vet:'',cost:null,next:'',diagnosis:'',notes:''}),medications:t=>({name:'',dose:'',everyDays:1,times:'',start:t,end:'',lastGiven:'',stock:null,active:true,notes:''}),
 grooming:t=>({kind:'Banho',date:t,next:'',place:'',cost:null,notes:''}),dates:t=>({name:'',date:t,yearly:true,notes:''})
};
const listTitle:Record<DogList,string>={vaccines:'Vacina',parasites:'Antiparasitário',weights:'Pesagem',visits:'Consulta veterinária',medications:'Remédio',grooming:'Banho e higiene',dates:'Data especial'};
const profileFields:Field[]=[{key:'name',label:'Nome'},{key:'breed',label:'Raça'},{key:'sex',label:'Sexo'},{key:'neutered',label:'Castração'},{key:'birth',label:'Nascimento',type:'date'},{key:'adopted',label:'Chegou em casa',type:'date'},{key:'colour',label:'Cor e pelagem'},{key:'microchip',label:'Microchip'},{key:'passport',label:'Passaporte / registro'},
 {key:'targetWeight.min',label:'Peso ideal mínimo (kg)',type:'number'},{key:'targetWeight.max',label:'Peso ideal máximo (kg)',type:'number'},
 {key:'vet.name',label:'Veterinário'},{key:'vet.phone',label:'Telefone do veterinário'},{key:'vet.address',label:'Endereço da clínica',wide:true},{key:'vet.emergency',label:'Emergência 24h',wide:true},
 {key:'insurance.provider',label:'Seguro pet'},{key:'insurance.policy',label:'Apólice'},{key:'insurance.renewal',label:'Renovação do seguro',type:'date'},{key:'insurance.monthly',label:'Seguro por mês (£)',type:'number'},{key:'insurance.excess',label:'Franquia'},
 {key:'food.brand',label:'Ração'},{key:'food.gramsPerDay',label:'Gramas por dia',type:'number'},{key:'food.meals',label:'Refeições'},{key:'food.treats',label:'Petiscos'},
 {key:'allergies',label:'Alergias e restrições',type:'textarea'},{key:'personality',label:'Personalidade',type:'textarea'},{key:'notes',label:'Observações',type:'textarea'}];

/** Caju's page: a portrait hero, what is coming up, and every care list with add, edit and remove. */
export function DogView({initial,today,demo=false}:{initial:Dog;today:string;demo?:boolean}){
 const router=useRouter();
 const [dog,setDog]=useState(initial);useEffect(()=>setDog(initial),[initial]);
 const [editing,setEditing]=useState<{list:DogList;row:Record<string,any>}|null>(null),[profile,setProfile]=useState(false),[notice,setNotice]=useState('');
 const persist=async(next:Dog)=>{const parsed=dogSchema.parse(next);if(!demo)await savePersonalSection('dog',parsed);setDog(parsed);router.refresh();};
 const saveItem=async(list:DogList,row:Record<string,any>)=>{const rows=dog[list] as {id:string}[];const id=row.id||`${list}-${Date.now().toString(36)}`;await persist({...dog,[list]:rows.some(r=>r.id===row.id)?rows.map(r=>r.id===row.id?{...row,id}:r):[...rows,{...row,id}]} as Dog);};
 const removeItem=async(list:DogList,id:string)=>persist({...dog,[list]:(dog[list] as {id:string}[]).filter(r=>r.id!==id)} as Dog);
 const giveNow=async(id:string)=>{await persist({...dog,medications:dog.medications.map(m=>m.id===id?{...m,lastGiven:today,stock:m.stock===null?null:Math.max(0,m.stock-1)}:m)});setNotice('Dose registrada.');setTimeout(()=>setNotice(''),2500);};
 const add=(list:DogList,extra:Record<string,unknown>={})=>setEditing({list,row:{...blank[list](today),...extra}});
 const edit=(list:DogList,row:Record<string,any>)=>setEditing({list,row});

 const name=dog.name||'Caju';const age=ageLabel(dog.birth,today);const weight=weightSummary(dog);const care=upcomingCare(dog,today);const soon=care.filter(c=>c.days<=45);
 const vaccines=vaccineStatus(dog,today);const meds=dog.medications.filter(m=>m.active);
 const parasites=parasiteKinds.map(kind=>[...dog.parasites].filter(p=>p.kind===kind).sort((a,b)=>b.date.localeCompare(a.date))[0]).filter(Boolean);
 const year=today.slice(0,4);const spent=[...dog.visits,...dog.grooming].filter(v=>v.date.startsWith(year)).reduce((t,v)=>t+(v.cost??0),0);
 const facts=[[Cpu,'Microchip',dog.microchip],[ShieldCheck,'Seguro',dog.insurance.provider],[Heart,'Castração',dog.neutered]].filter(([,,v])=>v) as [typeof Cpu,string,string][];
 const section=(list:DogList,icon:React.ReactNode,title:string,help:string,body:React.ReactNode,className='')=><section className={`panel dog-panel ${className}`} aria-label={title}>
  <div className="panel-heading"><div><h2>{icon} {title}</h2><p className="field-help">{help}</p></div><Button variant="secondary" size="small" onClick={()=>add(list)} aria-label={`Adicionar ${listTitle[list].toLowerCase()}`}><Plus size={16}/>Adicionar</Button></div>{body}</section>;
 const empty=(text:string)=><p className="field-help dog-empty"><PawPrint size={16}/>{text}</p>;

 return <div className="dog-page">
  <header className="dog-hero">
   <div className="dog-hero-text">
    <span className="eyebrow">MEU MELHOR AMIGO</span>
    <h1>{name}</h1>
    <p>{[dog.breed,age,weight.latest?`${num(weight.latest.kg)} kg`:''].filter(Boolean).join(' · ')||'Complete a ficha para ver idade, raça e peso.'}</p>
    {facts.length>0&&<ul className="dog-facts">{facts.map(([Icon,label,value])=><li key={label}><Icon size={14} aria-hidden/><span>{label}</span><b>{value}</b></li>)}</ul>}
    {soon[0]?<div className={`dog-next${soon[0].overdue?' late':''}`}><span>{(()=>{const I=careIcon[soon[0].kind]??PawPrint;return <I size={18} aria-hidden/>;})()}</span><div><small>Próximo cuidado</small><strong>{soon[0].name}</strong><em>{when(soon[0].days)} · {dateText(soon[0].date,{day:'2-digit',month:'short'})}</em></div></div>
     :<div className="dog-next"><span><Check size={18} aria-hidden/></span><div><small>Próximo cuidado</small><strong>Nada pendente</strong><em>Cadastre vacinas e vermífugo para receber lembretes</em></div></div>}
    <Button variant="glass" className="dog-edit" onClick={()=>setProfile(true)}><Pencil size={16}/>Editar ficha</Button>
   </div>
   <div className="dog-portrait">
    {dog.photo?<img src={dog.photo} alt={`Foto do ${name}`}/>:<span className="dog-avatar" aria-hidden><DogIcon size={96} strokeWidth={1.4}/></span>}
    <span className="dog-tag" aria-hidden><Bone size={18}/>{name.toUpperCase()}</span>
   </div>
  </header>

  <section className="panel dog-care" aria-labelledby="dog-care-title">
   <div className="panel-heading"><div><h2 id="dog-care-title"><CalendarHeart size={19}/> Próximos cuidados</h2><p className="field-help">Atrasados e o que vence nos próximos 45 dias. Também aparecem em Próximos vencimentos, na tela Hoje.</p></div></div>
   {soon.length?<div className="dog-care-track">{soon.map(c=>{const I=careIcon[c.kind]??PawPrint;const med=c.id.startsWith('med-')?c.id.slice(4):null;
    return <article key={c.id} className={c.overdue?'late':c.days<=3?'soon':''}><span className="dog-care-icon"><I size={18} aria-hidden/></span><small>{c.kind}</small><strong>{c.name}</strong><em>{when(c.days)}</em><time>{dateText(c.date,{weekday:'short',day:'2-digit',month:'short'})}</time>{c.detail&&<p>{c.detail}</p>}
     {med&&c.days<=0&&<Button size="small" variant="tinted" onClick={()=>giveNow(med)}><Check size={15}/>Dei agora</Button>}</article>;})}</div>:empty('Nenhum cuidado previsto. Registre as vacinas, o vermífugo e os remédios para acompanhar as próximas datas.')}
   {notice&&<p className="field-help" role="status">{notice}</p>}
  </section>

  <div className="dog-grid">
   {section('vaccines',<Syringe size={19}/>,'Vacinas','Última dose de cada vacina e o próximo reforço.',vaccines.length?<ul className="dog-list">{vaccines.map(v=><li key={v.id}><button onClick={()=>edit('vaccines',v)}><span className={`dog-state ${v.state==='Em dia'?'ok':v.state==='Atrasada'?'late':v.state==='Vence em breve'?'soon':''}`}>{v.state}</span><div><strong>{v.name}</strong><small>{`Dose em ${dateText(v.date)}${v.next?` · reforço ${dateText(v.next)}`:''}`}</small></div></button></li>)}</ul>:empty('Nenhuma vacina registrada.'),'dog-vaccines')}

   {section('medications',<Pill size={19}/>,'Remédios','Em uso agora, com próxima dose e estoque.',meds.length?<ul className="dog-list">{meds.map(m=>{const next=nextDose(m,today);const low=m.stock!==null&&m.stock<=5;return <li key={m.id}><button onClick={()=>edit('medications',m)}><span className="dog-med-icon"><Pill size={16}/></span><div><strong>{m.name}</strong><small>{[m.dose,m.everyDays?`a cada ${m.everyDays} ${m.everyDays===1?'dia':'dias'}`:'',m.times].filter(Boolean).join(' · ')}</small><small>{`${next?`Próxima: ${dateText(next,{day:'2-digit',month:'short'})}`:'Sem próxima dose'}${m.lastGiven?` · última ${dateText(m.lastGiven,{day:'2-digit',month:'short'})}`:''}`}</small>{m.stock!==null&&<small className={low?'dog-low':''}>{`${m.stock} ${m.stock===1?'dose':'doses'} em estoque${low?' · comprar mais':''}`}</small>}</div></button><Button size="small" variant="secondary" onClick={()=>giveNow(m.id)} aria-label={`Registrar dose de ${m.name}`}><Check size={15}/>Dei</Button></li>;})}</ul>:empty('Nenhum remédio em uso.'),'dog-meds')}

   {section('parasites',<Bug size={19}/>,'Vermífugo e antipulgas','O mais recente de cada tipo.',parasites.length?<ul className="dog-list">{parasites.map(p=>{const days=p.next?Math.round((Date.parse(p.next)-Date.parse(today))/864e5):null;return <li key={p.id}><button onClick={()=>edit('parasites',p)}><span className={`dog-state ${days===null?'':days<0?'late':days<=7?'soon':'ok'}`}>{days===null?'Sem data':when(days)}</span><div><strong>{p.kind}</strong><small>{`${p.product} · ${dateText(p.date)}${p.next?` · próxima ${dateText(p.next,{day:'2-digit',month:'short'})}`:''}`}</small></div></button></li>;})}</ul>:empty('Registre o último vermífugo e o antipulgas.'))}

   {section('weights',<Scale size={19}/>,'Peso',weight.latest?`${num(weight.latest.kg)} kg em ${dateText(weight.latest.date,{day:'2-digit',month:'short'})}${weight.change!==null?` · ${weight.change>0?'+':''}${num(weight.change)} kg desde a última pesagem`:''}`:'Registre o peso a cada consulta ou pesagem.',weight.list.length>1?<><EChart height={200} label={`Evolução do peso do ${name}`} option={t=>{const o:any=lineOption(t,{categories:weight.list.map(w=>w.date),scale:true,format:v=>`${num(v)} kg`,labelFormat:c=>dateText(c,{month:'short'}),titleFormat:c=>dateText(c),series:[{name:'Peso',values:weight.list.map(w=>w.kg),color:'--sys-orange',area:true,smooth:true}]});const lines=[dog.targetWeight.min,dog.targetWeight.max].filter((v):v is number=>v!==null);if(lines.length){const all=[...weight.list.map(w=>w.kg),...lines];o.yAxis.scale=false;o.yAxis.min=Math.floor(Math.min(...all)-0.5);o.yAxis.max=Math.ceil(Math.max(...all)+0.5);}if(lines.length)o.series[0].markLine={symbol:'none',silent:true,label:{position:'insideEndTop',color:t.label2,formatter:(p:any)=>`ideal ${num(p.value)} kg`},lineStyle:{color:t.color('--sys-green'),type:[4,4]},data:lines.map(v=>({yAxis:v}))};return o;}}/>{weight.inRange!==null&&<p className={`field-help ${weight.inRange?'dog-ok':'dog-low'}`}>{weight.inRange?'Dentro do peso ideal.':'Fora do peso ideal informado na ficha.'}</p>}<button className="text-link" onClick={()=>edit('weights',weight.latest!)}>Editar última pesagem</button></>:weight.latest?<p className="dog-big">{num(weight.latest.kg)} kg</p>:empty('Nenhuma pesagem ainda.'),'dog-weight')}

   {section('visits',<Stethoscope size={19}/>,'Veterinário',`${dog.visits.length} ${dog.visits.length===1?'consulta':'consultas'}${spent?` · ${money(spent)} em cuidados em ${year}`:''}`,dog.visits.length?<ul className="dog-list">{[...dog.visits].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(v=><li key={v.id}><button onClick={()=>edit('visits',v)}><time>{dateText(v.date,{day:'2-digit',month:'short'})}<small>{v.date.slice(0,4)}</small></time><div><strong>{v.reason}</strong><small>{[v.vet,v.cost!==null?money(v.cost):'',v.next?`retorno ${dateText(v.next,{day:'2-digit',month:'short'})}`:''].filter(Boolean).join(' · ')}</small>{v.diagnosis&&<small>{v.diagnosis}</small>}</div></button></li>)}</ul>:empty('Nenhuma consulta registrada.'))}

   {section('grooming',<Bath size={19}/>,'Banho e higiene','Banho, tosa, unhas, dentes e ouvidos.',dog.grooming.length?<ul className="dog-list">{groomingKinds.map(k=>[...dog.grooming].filter(g=>g.kind===k).sort((a,b)=>b.date.localeCompare(a.date))[0]).filter(Boolean).map(g=><li key={g.id}><button onClick={()=>edit('grooming',g)}><span className="dog-med-icon"><Bath size={16}/></span><div><strong>{g.kind}</strong><small>{`Último em ${dateText(g.date,{day:'2-digit',month:'short'})}${g.next?` · próximo ${dateText(g.next,{day:'2-digit',month:'short'})}`:''}${g.place?` · ${g.place}`:''}`}</small></div></button></li>)}</ul>:empty('Registre o último banho para lembrar do próximo.'))}

   <section className="panel dog-panel dog-profile" aria-labelledby="dog-profile-title">
    <div className="panel-heading"><div><h2 id="dog-profile-title"><DogIcon size={19}/> {`Ficha do ${name}`}</h2><p className="field-help">Para emergências e para quem cuida dele quando você viaja.</p></div><Button variant="secondary" size="small" onClick={()=>setProfile(true)}><Pencil size={16}/>Editar</Button></div>
    <dl>{([['Raça',dog.breed],['Sexo',[dog.sex,dog.neutered].filter(Boolean).join(' · ')],['Nascimento',dog.birth?`${dateText(dog.birth)}${age?` · ${age}`:''}`:''],['Em casa desde',dog.adopted?dateText(dog.adopted):''],['Cor',dog.colour],['Microchip',dog.microchip],['Passaporte',dog.passport],['Peso ideal',dog.targetWeight.min||dog.targetWeight.max?`${dog.targetWeight.min?num(dog.targetWeight.min):'?'}–${dog.targetWeight.max?num(dog.targetWeight.max):'?'} kg`:''],['Alergias',dog.allergies],['Personalidade',dog.personality]] as [string,string][]).filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <div className="dog-contacts">
     <article><Stethoscope size={18}/><div><small>Veterinário</small><strong>{dog.vet.name||'—'}</strong>{dog.vet.phone&&<a href={`tel:${dog.vet.phone.replace(/[^\d+]/g,'')}`}><Phone size={13}/>{dog.vet.phone}</a>}{dog.vet.address&&<small>{dog.vet.address}</small>}{dog.vet.emergency&&<small>{`Emergência: ${dog.vet.emergency}`}</small>}</div></article>
     <article><Utensils size={18}/><div><small>Alimentação</small><strong>{dog.food.brand||'—'}</strong><small>{[dog.food.gramsPerDay?`${num(dog.food.gramsPerDay,0)} g/dia`:'',dog.food.meals].filter(Boolean).join(' · ')}</small>{dog.food.treats&&<small>{`Petiscos: ${dog.food.treats}`}</small>}</div></article>
     <article><ShieldCheck size={18}/><div><small>Seguro pet</small><strong>{dog.insurance.provider||'—'}</strong><small>{[dog.insurance.policy,dog.insurance.monthly!==null?`${money(dog.insurance.monthly)} por mês`:'',dog.insurance.excess?`franquia ${dog.insurance.excess}`:''].filter(Boolean).join(' · ')}</small>{dog.insurance.renewal&&<small>{`Renova em ${dateText(dog.insurance.renewal)}`}</small>}</div></article>
    </div>
    {dog.notes&&<p className="field-help">{dog.notes}</p>}
   </section>

   {section('dates',<Cake size={19}/>,'Datas especiais','Aniversário de adoção e outras datas para lembrar.',dog.dates.length?<ul className="dog-list">{dog.dates.map(d=><li key={d.id}><button onClick={()=>edit('dates',d)}><span className="dog-med-icon"><CalendarHeart size={16}/></span><div><strong>{d.name}</strong><small>{`${dateText(d.date)}${d.yearly?' · todo ano':''}`}</small></div></button></li>)}</ul>:empty('O aniversário dele entra sozinho quando a data de nascimento está na ficha.'))}
  </div>

  {editing&&<RecordDialog title={editing.row.id?`Editar ${listTitle[editing.list].toLowerCase()}`:`Novo: ${listTitle[editing.list].toLowerCase()}`} fields={fields[editing.list]} initial={editing.row} onClose={()=>setEditing(null)}
   onSave={row=>saveItem(editing.list,row)} onDelete={editing.row.id?()=>removeItem(editing.list,editing.row.id):undefined}/>}
  {profile&&<RecordDialog title={`Ficha do ${name}`} description="Esses dados ficam só na sua conta." fields={profileFields} initial={dog} onClose={()=>setProfile(false)} onSave={row=>persist({...dog,...row} as Dog)}/>}
 </div>;
}
