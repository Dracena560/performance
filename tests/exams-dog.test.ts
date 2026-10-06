import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertExam,markers,status,relatedSupplements,examReminders } from '../lib/exams';
import { readDog,upsertDogItem,upcomingCare,ageLabel,nextDose,vaccineStatus,weightSummary,dogReminders } from '../lib/dog';
import { reminders } from '../lib/life';

test('exams upsert by date and title, keep marker history and flag values outside the range',()=>{
 const first=upsertExam([],{date:'2026-03-10',title:'Check-up anual',lab:'Lab',results:[{name:'Vitamina D (25-OH)',group:'Vitaminas',value:22,unit:'ng/mL',low:30,high:100},{name:'Ferritina',group:'Minerais e ferro',value:80,unit:'ng/mL',low:30,high:400}]});
 assert.equal(first.created,true);assert.equal(first.exam.id,'2026-03-10-check-up-anual');
 const again=upsertExam(first.exams,{date:'2026-03-10',title:'Check-up anual',next:'2026-10-08',results:[{name:'Vitamina D (25-OH)',group:'Vitaminas',value:24,unit:'ng/mL',low:30,high:100}]});
 assert.equal(again.created,false);assert.equal(again.exams.length,1);
 const later=upsertExam(again.exams,{date:'2026-09-01',title:'Vitamina D',results:[{name:'Vitamina D',group:'Vitaminas',value:41,unit:'ng/mL',low:30,high:100}]});
 const vitD=markers(later.exams).find(m=>m.key==='vitamina d')!;
 assert.equal(vitD.history.length,2);assert.equal(vitD.status,'normal');assert.equal(vitD.change,17);
 assert.equal(status({value:24,low:30,high:100}),'baixo');assert.equal(status({value:5,low:null,high:null}),'sem faixa');
 assert.deepEqual(relatedSupplements('Vitamina D (25-OH)',['Vitamina D','Magnésio']),[{name:'Vitamina D',taking:true}]);
 assert.equal(examReminders(later.exams)[0].date,'2026-10-08');
});

test('dog care: next doses, vaccine status, age, weight and reminders in the due-dates list',()=>{
 let dog=readDog(undefined);assert.equal(dog.name,'Caju');
 dog=upsertDogItem(dog,'vaccines',{name:'V10',date:'2025-10-10',next:'2026-10-10'}).dog;
 dog=upsertDogItem(dog,'parasites',{kind:'Vermífugo',product:'Drontal',date:'2026-07-01',next:'2026-10-01'}).dog;
 dog=upsertDogItem(dog,'medications',{name:'Apoquel',dose:'1/2 comprimido',everyDays:1,lastGiven:'2026-10-06',stock:10}).dog;
 dog=upsertDogItem(dog,'weights',{date:'2026-09-01',kg:14.2}).dog;dog=upsertDogItem(dog,'weights',{date:'2026-10-01',kg:14.6}).dog;
 dog={...dog,birth:'2019-10-09',targetWeight:{min:13,max:15}};
 assert.equal(ageLabel('2019-10-09','2026-10-06'),'6 anos e 11 meses');
 assert.equal(nextDose(dog.medications[0],'2026-10-06'),'2026-10-07');
 assert.equal(vaccineStatus(dog,'2026-10-06')[0].state,'Vence em breve');
 const w=weightSummary(dog);assert.equal(w.change,0.4);assert.equal(w.inRange,true);
 const care=upcomingCare(dog,'2026-10-06');assert.equal(care[0].kind,'Antiparasitário');assert.equal(care[0].overdue,true);
 assert.deepEqual(dogReminders(dog,'2026-10-06').map(r=>r.name),['Apoquel','Aniversário do Caju','Vacina V10']);
 const list=reminders({personal_dog:dog,personal_exams:[{id:'e',date:'2026-03-10',title:'Check-up',next:'2026-10-08'}]},'2026-10-06');
 assert.ok(list.some(r=>r.source==='Caju'&&r.name==='Vacina V10'));assert.ok(list.some(r=>r.source==='Exame'));
});

import { readSettings,scoreMap,settingsSchema,defaultSettings } from '../lib/settings';
import { choiceScores,dayEntries,supplementIntake } from '../lib/day-log';
test('settings drive Registrar scores, custom topics, routines and the due-dates window',()=>{
 const raw=structuredClone(defaultSettings) as any;
 raw.diary.topics[0].options=[{label:'Focado',score:10},{label:'Disperso',score:2}];
 raw.diary.topics.push({id:'dor',kind:'checkin',title:'Dor',help:'',dimension:'corpo',multiple:true,notes:false,enabled:true,options:[{label:'Sem dor',score:9}]});
 raw.routines=[{name:'Manhã',period:'dia',items:['Creatina']}];raw.reminders.windowDays=30;raw.reminders.sources=['Exames'];
 const s=readSettings(settingsSchema.parse(raw));
 assert.deepEqual(choiceScores({mental:['Focado','Disperso'],body:['Leve'],custom:{dor:['Sem dor']}},scoreMap(s)),{mente:6,corpo:8.5});
 const records=[{id:'r',category:'supplement',recorded_on:'2026-10-06',recorded_at:'2026-10-06T08:00:00Z',payload:{record_type:'vitamins',routines:['Manhã']}}];
 assert.deepEqual(supplementIntake(records,'2026-10-06',s).map(x=>x.name),['Creatina']);
 assert.equal(dayEntries([],records,'2026-10-06',s).length,1);
 const profile={personal_settings:s,personal_exams:[{id:'e',date:'2026-01-01',title:'Check-up',next:'2026-10-30'}],personal_dates:[{id:'d',name:'Passaporte',kind:'Passaporte',number:'',issued:'',date:'2026-10-07',url:'',notes:''}]};
 assert.deepEqual(reminders(profile,'2026-10-06').map(r=>r.source),['Exame']);
 assert.equal(readSettings({}).diary.topics.length,8);
});
