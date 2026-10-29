import {cp,readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(path.join(root,'dist'),output,{recursive:true});
const notes={
 'index.html':['Підготуємо текст у вашому поштовому застосунку. Ви перевірите його перед надсиланням.','Заявка надсилається через сервер. Результат спроби з’явиться під формою.'],
 'en.html':["We'll prepare a draft in your email app for you to review before sending.",'Your enquiry is sent through the server. The result will appear below the form.'],
 'it.html':['Prepareremo una bozza nella tua app di posta, da controllare prima dell’invio.','La richiesta viene inviata tramite il server. Il risultato apparirà sotto il modulo.']
};
let origin=process.env.OPERION_SITE_URL||((process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL)?'https://'+(process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL):'');
if(origin){const u=new URL(origin);if(!['http:','https:'].includes(u.protocol))throw new Error('OPERION_SITE_URL must be an HTTP(S) origin');origin=u.origin;}
for(const [name,[before,after]]of Object.entries(notes)){
 const file=path.join(output,name);let html=await readFile(file,'utf8');
 if(!html.includes(before))throw new Error('Form copy not found in '+name);
 html=html.replace('action="send.php"','action="/api/contact"').replace('data-mail-mode="mailto"','data-mail-mode="api"').replace(before,after);
 html=html.replaceAll('https://operion-energy-platform-v2.redgecko14.chatgpt.site',origin);
 await writeFile(file,html);
}
// Development-only pages must never be served in a deployment.
for(const name of await readdir(output))if(/(?:^|-)qa\./.test(name))await rm(path.join(output,name),{force:true});
console.log('Built public/ with UK / IT / EN, automatic geolocation and the Vercel contact endpoint.');
