import {detectLanguage} from './geo-country.mjs';
const language=document.documentElement.lang;
const redirectKey='operion-language-redirect-v1';
// Consume a one-use handoff so an internal language redirect does not request GPS twice.
let handoff=null;
try{handoff=JSON.parse(sessionStorage.getItem(redirectKey)||'null');sessionStorage.removeItem(redirectKey);}catch{}
if(!(handoff?.language===language&&Date.now()-handoff.at>=0&&Date.now()-handoff.at<15000)){
 const target=await detectLanguage({
  secureContext:window.isSecureContext,
  geolocation:navigator.geolocation,
  loadBoundaries:async()=>{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4000);
   try{const response=await fetch(new URL('./assets/geo-countries-v12.json',import.meta.url),{signal:controller.signal,credentials:'same-origin'});if(!response.ok)throw new Error('country_data');return await response.json();}
   finally{clearTimeout(timer);}
  }
 });
 if(target!==language){
  try{sessionStorage.setItem(redirectKey,JSON.stringify({language:target,at:Date.now()}));}catch{}
  const path={uk:'index.html',it:'it.html',en:'en.html'}[target]||'index.html';
  // Query and section are kept; coordinates never enter URLs or persistent storage.
  location.replace(new URL(path+location.search+location.hash,location.href).href);
 }
}
