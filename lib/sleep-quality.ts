import { sleepData } from './sleep-data';
// Diary estimate only: reuse the same transparent scoring across all screens.
export function sleepQuality(payload:Record<string,unknown>){
 const {total,deep,rem,awake}=sleepData(payload);
 const hours=total===null?null:total/60;
 if(hours===null||hours<0||hours>24)return {score:null,explanation:'Duração do sono não informada ou inválida.'};
 let points=hours>=7&&hours<=9?5:hours>=6&&hours<=10?3:1;
 let possible=5;
 const reasons=[hours>=7&&hours<=9?'Duração entre 7 e 9 horas.':'Duração fora da faixa de referência do diário.'];
 if(deep!==null&&deep>=0){possible+=2;points+=deep>=50?2:deep>=30?1:0;reasons.push('Profundo: '+Math.round(deep)+' min.');}
 if(rem!==null&&rem>=0){possible+=2;points+=rem>=90?2:rem>=60?1:0;reasons.push('REM: '+Math.round(rem)+' min.');}
 if(awake!==null&&awake>=0){possible+=1;points+=awake<=30?1:0;reasons.push('Acordado: '+Math.round(awake)+' min.');}
 if(possible<10)reasons.push('Estimativa parcial; campos ausentes não contam como zero.');
 return {score:Math.round(points/possible*100)/10,explanation:reasons.join(' ')};
}
