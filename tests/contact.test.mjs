import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContactHandler} from '../lib/contact-service.mjs';
const env={RESEND_API_KEY:'test-only-not-a-real-key',OPERION_MAIL_FROM:'website@example.test',VERCEL:'1'};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.value=value;return this;}};}
function request(method='GET',body,overrides={}){return {method,headers:{host:'example.test',origin:'https://example.test','content-type':'application/json','x-forwarded-for':'192.0.2.10',...overrides},body};}
async function session(handler){const res=response();await handler(request(),res);assert.equal(res.code,200);return {csrf_token:res.value.csrf_token,cookie:res.headers['Set-Cookie'].split(';')[0],header:res.headers['Set-Cookie']};}
function fields(){return {name:'Test Visitor',company:'Example Test',contact:'visitor@example.test',message:'Test scenario; no real email is sent.',website:'',lang:'it',submission_id:randomUUID()};}
test('Configured endpoint accepts an Italian enquiry for the fixed recipient',async()=>{
 const sent=[];const handler=createContactHandler({environment:env,fetchImpl:async(url,options)=>{sent.push({url,options});return {ok:true,json:async()=>({id:'mock-email-id'})};}});
 const s=await session(handler);assert.match(s.header,/HttpOnly/);assert.match(s.header,/Secure/);
 const res=response();await handler(request('POST',{...fields(),csrf_token:s.csrf_token},{cookie:s.cookie}),res);
 assert.equal(res.code,202);assert.deepEqual(res.value,{ok:true});
 const payload=JSON.parse(sent[0].options.body);assert.deepEqual(payload.to,['fusioeng@gmail.com']);assert.equal(payload.reply_to,'visitor@example.test');assert.match(payload.text,/Nome:/);assert.match(payload.subject,/richiesta/);assert.ok(sent[0].options.headers['Idempotency-Key']);
});
test('Unconfigured mail is an explicit 503, not a false success',async()=>{
 const handler=createContactHandler({environment:{}});const res=response();await handler(request(),res);assert.equal(res.code,503);assert.equal(res.value.ok,false);
});
test('Cross-origin and missing-Origin submissions are rejected',async()=>{
 const handler=createContactHandler({environment:env});
 for(const origin of ['https://other.test',undefined]){const res=response();await handler(request('POST',{}, {origin}),res);assert.equal(res.code,403);}
});
test('A token is bound to the HttpOnly session and expires',async()=>{
 let time=1793300000000;const handler=createContactHandler({environment:env,now:()=>time});const s=await session(handler);
 let res=response();await handler(request('POST',{...fields(),csrf_token:s.csrf_token}),res);assert.equal(res.code,403);
 time+=600001;res=response();await handler(request('POST',{...fields(),csrf_token:s.csrf_token},{cookie:s.cookie}),res);assert.equal(res.code,403);
});
test('Honeypot, contact and header-injection validation reject bad input',async()=>{
 const handler=createContactHandler({environment:env,fetchImpl:()=>{throw Error('must not send');}});const s=await session(handler);
 for(const change of [{website:'spam'},{contact:'not a contact'},{name:'Name\r\nInjected'},{message:''},{company:'x'.repeat(161)}]){
  const res=response();await handler(request('POST',{...fields(),...change,csrf_token:s.csrf_token},{cookie:s.cookie}),res);assert.equal(res.code,422);
 }
});
test('Provider rejection and network errors never report acceptance',async()=>{
 for(const fetchImpl of [async()=>({ok:false}),async()=>{throw Error('mock network error');}]){
  const handler=createContactHandler({environment:env,fetchImpl});const s=await session(handler);const res=response();await handler(request('POST',{...fields(),csrf_token:s.csrf_token},{cookie:s.cookie}),res);assert.equal(res.code,503);assert.equal(res.value.ok,false);
 }
});
test('Per-instance limit blocks the sixth request',async()=>{
 const handler=createContactHandler({environment:env,fetchImpl:async()=>({ok:true,json:async()=>({id:'mock'})})});const s=await session(handler);
 for(let i=0;i<6;i++){const res=response();await handler(request('POST',{...fields(),csrf_token:s.csrf_token},{cookie:s.cookie}),res);assert.equal(res.code,i<5?202:429);}
});
test('Retried identical enquiry uses the same provider idempotency key',async()=>{
 const keys=[];const handler=createContactHandler({environment:env,fetchImpl:async(url,options)=>{keys.push(options.headers['Idempotency-Key']);return {ok:true,json:async()=>({id:'mock'})};}});const s=await session(handler);const data={...fields(),csrf_token:s.csrf_token};
 for(let i=0;i<2;i++)await handler(request('POST',data,{cookie:s.cookie}),response());assert.equal(keys[0],keys[1]);
});
