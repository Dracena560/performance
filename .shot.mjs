import {chromium} from 'playwright';
const [S]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
await p.goto('http://localhost:4200/demo/saude',{waitUntil:'networkidle',timeout:120000});await p.waitForTimeout(2000);
await p.locator('#alimentacao summary').click();await p.waitForTimeout(1500);
await p.locator('#alimentacao').screenshot({path:`${S}/alim.png`});console.log('errors:',errs.join('\n'));await b.close();
