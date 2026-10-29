import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const recipient='fusioeng@gmail.com';
const cookieName='operion_contact_session';
const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const singleLineControl=/[\r\n\x00-\x1f\x7f]/;
const messageControl=/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;
const mailCopy={
 uk:['Operion OS — запит із сайту','Запит щодо Operion OS','Ім’я','Компанія','Контакт','Про об’єкт'],
 en:['Operion OS — website enquiry','Operion OS enquiry','Name','Company','Contact','About the site'],
 it:['Operion OS — richiesta dal sito','Richiesta su Operion OS','Nome','Azienda','Contatto','Informazioni sul sito']
};
function cleanField(value,max,multiline=false){
 if(typeof value!=='string')return null;
 value=value.trim();
 return value&&[...value].length<=max&&!(multiline?messageControl:singleLineControl).test(value)?value:null;
}
function originAllowed(req){
 if(req.headers['sec-fetch-site']==='cross-site')return false;
 const origin=req.headers.origin;
 if(!origin)return req.method==='GET';
 if(typeof origin!=='string'||typeof req.headers.host!=='string')return false;
 try{const url=new URL(origin);return ['https:','http:'].includes(url.protocol)&&url.host===req.headers.host;}catch{return false;}
}
function sessionNonce(req){
 const cookie=typeof req.headers.cookie==='string'?req.headers.cookie:'';
 const match=cookie.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9]{48})(?:;|$)'));
 return match?.[1]||null;
}
function signature(secret,nonce,issued){return createHmac('sha256',secret).update(nonce+'.'+issued).digest('hex');}
function validToken(token,nonce,secret,time){
 if(typeof token!=='string'||!nonce||!/^\d{10,13}\.[a-f0-9]{64}$/.test(token))return false;
 const [issued,mac]=token.split('.');const age=time-Number(issued);
 if(age<0||age>600000)return false;
 return timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(signature(secret,nonce,issued),'hex'));
}
export function createContactHandler({fetchImpl=globalThis.fetch,now=Date.now,environment=process.env}={}){
 // Per-instance protection. Configure a Vercel Firewall rule for a deployment-wide limit.
 const attempts=new Map();
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  const respond=(status,body)=>res.status(status).json(body);
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return respond(405,{ok:false,error:'method_not_allowed'});}
  if(!originAllowed(req))return respond(403,{ok:false,error:'origin_rejected'});
  const apiKey=environment.RESEND_API_KEY;
  const from=environment.OPERION_MAIL_FROM;
  if(typeof apiKey!=='string'||!apiKey.trim()||typeof from!=='string'||!emailPattern.test(from)||singleLineControl.test(from))return respond(503,{ok:false,error:'mail_not_configured'});
  const secret=createHash('sha256').update('operion-contact-token-v1:'+apiKey).digest();
  const time=now();
  if(req.method==='GET'){
   const nonce=sessionNonce(req)||randomBytes(24).toString('hex');
   const secure=environment.VERCEL==='1'||environment.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https';
   res.setHeader('Set-Cookie',`${cookieName}=${nonce}; Path=/api/contact; Max-Age=600; HttpOnly; SameSite=Strict${secure?'; Secure':''}`);
   return respond(200,{csrf_token:time+'.'+signature(secret,nonce,String(time))});
  }
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return respond(415,{ok:false,error:'json_required'});
  if(Number(req.headers['content-length']||0)>20000)return respond(413,{ok:false,error:'request_too_large'});
  let data=req.body;
  try{if(Buffer.isBuffer(data))data=data.toString('utf8');if(typeof data==='string')data=JSON.parse(data);}
  catch{return respond(400,{ok:false,error:'invalid_json'});}
  if(!data||typeof data!=='object'||Array.isArray(data))return respond(422,{ok:false,error:'invalid_fields'});
  if(Buffer.byteLength(JSON.stringify(data),'utf8')>20000)return respond(413,{ok:false,error:'request_too_large'});
  const nonce=sessionNonce(req);
  if(!validToken(data.csrf_token,nonce,secret,time))return respond(403,{ok:false,error:'invalid_token'});
  const name=cleanField(data.name,100),company=cleanField(data.company,160),contact=cleanField(data.contact,200),message=cleanField(data.message,5000,true);
  const digits=(contact||'').replace(/\D/g,'');
  const isEmail=Boolean(contact&&emailPattern.test(contact));
  const isPhone=Boolean(contact&&/^\+?[0-9\s().-]+$/.test(contact)&&digits.length>=7&&digits.length<=15);
  if(!name||!company||!message||!contact||(!isEmail&&!isPhone)||typeof data.website!=='string'||data.website.trim()!==''||typeof data.submission_id!=='string'||!/^[a-f0-9-]{36}$/i.test(data.submission_id))return respond(422,{ok:false,error:'invalid_fields'});
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||nonce).split(',')[0].trim();
  const rateKey=createHash('sha256').update(ip).digest('hex');
  // Bounded memory; only hashes and timestamps are retained, not form text or coordinates.
  if(attempts.size>5000)for(const [key,values]of attempts)if(!values.some(t=>t>time-600000))attempts.delete(key);
  if(attempts.size>10000)return respond(503,{ok:false,error:'service_busy'});
  const recent=(attempts.get(rateKey)||[]).filter(t=>t>time-600000);
  if(recent.length>=5){res.setHeader('Retry-After','600');return respond(429,{ok:false,error:'rate_limited'});}
  recent.push(time);attempts.set(rateKey,recent);
  const lang=['uk','en','it'].includes(data.lang)?data.lang:'uk';
  const copy=mailCopy[lang];
  const text=`${copy[1]}\n\n${copy[2]}: ${name}\n${copy[3]}: ${company}\n${copy[4]}: ${contact}\n\n${copy[5]}:\n${message}\n\nLanguage: ${lang}`;
  const payload={from:`Operion <${from}>`,to:[recipient],subject:copy[0],text,...(isEmail?{reply_to:contact}:{})};
  const idempotency='operion-'+createHash('sha256').update(data.submission_id+'|'+JSON.stringify(payload)).digest('hex');
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify(payload),signal:controller.signal});
   if(!response.ok)return respond(503,{ok:false,error:'mail_transport_failed'});
   const result=await response.json();
   if(typeof result.id!=='string'||!result.id)return respond(503,{ok:false,error:'mail_transport_failed'});
   // Acceptance by the email provider is not a guarantee of inbox delivery.
   return respond(202,{ok:true});
  }catch{return respond(503,{ok:false,error:'mail_transport_failed'});}
  finally{clearTimeout(timeout);}
 };
}
