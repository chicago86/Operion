'use strict';
// Static previews use an explicit draft; Vercel exports use the server endpoint.
const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-status');
const contactSubmit = contactForm.querySelector('[type="submit"]');
let contactSubmissionId=null;
function prepareContactDraft(data) {
  const message=`Richiesta su Operion OS\n\nNome: ${data.get('name')}\nAzienda: ${data.get('company')}\nContatto: ${data.get('contact')}\n\nInformazioni sul sito:\n${data.get('message')}`;
  document.getElementById('prepared-message').value=message;
  const link=document.getElementById('open-mail');
  link.href='mailto:fusioeng@gmail.com?subject='+encodeURIComponent("Operion OS — richiesta sul sito")+'&body='+encodeURIComponent(message);
  document.getElementById('form-result').hidden=false;
  return link;
}
contactForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  const data=new FormData(contactForm);
  contactStatus.textContent='';
  if (!['php','api'].includes(contactForm.dataset.mailMode)) {
    contactStatus.textContent="La bozza è pronta. Inviala dalla tua app di posta.";
    prepareContactDraft(data).click();
    return;
  }
  contactSubmit.disabled=true;
  contactForm.setAttribute('aria-busy','true');
  contactStatus.textContent="Invio della richiesta…";
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const init=await fetch(contactForm.action,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});
    if(!init.ok)throw new Error('service');
    const token=await init.json();
    if(!token.csrf_token)throw new Error('service');
    data.set('csrf_token',token.csrf_token);
    if(!contactSubmissionId)contactSubmissionId=crypto.randomUUID();
    data.set('submission_id',contactSubmissionId);
    const apiMode=contactForm.dataset.mailMode==='api';
    const response=await fetch(contactForm.action,{method:'POST',credentials:'same-origin',headers:{Accept:'application/json',...(apiMode?{'Content-Type':'application/json'}:{})},body:apiMode?JSON.stringify(Object.fromEntries(data)):data,signal:controller.signal});
    const result=await response.json();
    if(!response.ok||result.ok!==true){
      contactStatus.textContent=response.status===422?"Controlla nome, azienda, recapito e descrizione dell’esigenza.":response.status===429?"Troppi tentativi. Riprova più tardi oppure scrivici direttamente.":"Impossibile inviare la richiesta. Riprova più tardi o scrivi a fusioeng@gmail.com.";
      return;
    }
    contactStatus.textContent="La richiesta è stata accettata per l’invio. Grazie: ti contatteremo al recapito indicato.";
    contactForm.reset();
    contactSubmissionId=null;
    document.getElementById('form-result').hidden=true;
  } catch {
    contactStatus.textContent="Impossibile inviare la richiesta. Il testo è rimasto nei campi: riprova o scrivi a fusioeng@gmail.com.";
  } finally {
    clearTimeout(timeout);
    contactSubmit.disabled=false;
    contactForm.removeAttribute('aria-busy');
  }
});
document.getElementById('copy-message').addEventListener('click',async event=>{
  const button=event.currentTarget;
  const text=document.getElementById('prepared-message');
  try{await navigator.clipboard.writeText(text.value);button.textContent="Copiato ✓";}
  catch{text.focus();text.select();button.textContent="Testo selezionato: premi Ctrl+C";}
});
