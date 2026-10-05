import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator,englishDates,englishNumbers } from '../lib/i18n-dom';
import { english } from '../lib/i18n-en';
const t=createTranslator({...english,'Faltam ${days} dias':'${days} days left','${record.wins}V–${record.losses}D na temporada':'${record.wins}W–${record.losses}L this season','Treino':'Practice'});
test('exact phrases, templates and joined labels translate',()=>{
 assert.equal(t('Salvar metas'),'Save goals');
 assert.equal(t('  Temporada '),'  Season ');
 assert.equal(t('Faltam 10 dias'),'10 days left');
 assert.equal(t('8V–4D na temporada'),'8W–4L this season');
 assert.equal(t('Temporada · Treino'),'Season · Practice');
 assert.equal(t('Felipe Fabricio'),'Felipe Fabricio');
});
test('dates and numbers follow en-GB',()=>{
 assert.equal(englishDates('segunda-feira, 5 de outubro de 2026'),'Monday, 5 October 2026');
 assert.equal(englishDates('qui., 08 de out.'),'Thu, 08 Oct');
 assert.equal(englishDates('Outubro–Dezembro 2026'),'October–December 2026');
 assert.equal(englishDates('out'),'Oct');
 assert.equal(englishDates('Setembro'),'September');
 assert.equal(englishNumbers('1.240 ml · 7,9/10'),'1,240 ml · 7.9/10');
 assert.equal(englishNumbers('£6,480.00'),'£6,480.00');
});
test('tennis "Set" labels are not mistaken for September',()=>{assert.equal(t('Set'),'Set');assert.equal(t('Sets'),'Sets');});
import { englishExtra } from '../lib/i18n-en-extra';
test('pieces, labels with names and English sentences with "set" stay right',()=>{
 const tx=createTranslator({...english,...englishExtra});
 assert.equal(tx('Edit Café da manhã'),'Edit Breakfast');
 assert.equal(tx('Duração entre 7 e 9 horas. Profundo: 37 min. REM: 90 min. Acordado: 10 min.'),'Duration between 7 and 9 hours. Deep: 37 min. REM: 90 min. Awake: 10 min.');
 assert.equal(tx('Encordoada há 48 dias'),'Restrung 48 days ago');
 assert.equal(tx('Order: wins, set difference, sets won and head-to-head. Points: 1 per set won + 1 per win.'),'Order: wins, set difference, sets won and head-to-head. Points: 1 per set won + 1 per win.');
 assert.equal(englishDates('abr. de 26'),'Apr 26');
 assert.equal(tx('+£ 33.60 desde a última atualização'),'+£ 33.60 since the last update');
});
test('values captured by templates are translated too',()=>{
 const tx=createTranslator({...english,...englishExtra,'Editar ${x}':'Edit ${x}','Valor de ${row.item}':'Amount for ${row.item}'});
 assert.equal(tx('Editar Café da manhã'),'Edit Breakfast');assert.equal(tx('Valor de Combustível'),'Amount for Fuel');assert.equal(tx('Editar 590 ml · água'),'Edit 590 ml · water');
 assert.equal(tx('Duração fora da faixa de referência do diário. Profundo: 38 min. REM: 95 min. Acordado: 34 min.'),'Duration outside the diary reference range. Deep: 38 min. REM: 95 min. Awake: 34 min.');
});
