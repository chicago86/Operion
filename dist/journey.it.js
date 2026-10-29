'use strict';
// Content-only demonstrations. No equipment commands or external side effects.
function bindContentTabs(selector,panelPrefix,onSelect){
 const buttons=[...document.querySelectorAll(selector)];
 let selected=0;
 function choose(index,focus=false){
  selected=index;
  buttons.forEach((button,i)=>{
   button.setAttribute('aria-selected',String(i===index));
   button.tabIndex=i===index?0:-1;
   document.getElementById(panelPrefix+i).hidden=i!==index;
  });
  if(onSelect)onSelect(index);
  if(focus)buttons[index].focus();
 }
 buttons.forEach((button,i)=>{
  button.addEventListener('click',()=>choose(i));
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   choose(event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowRight'?1:buttons.length-1))%buttons.length,true);
  });
 });
 return {choose,next(){choose((selected+1)%buttons.length,true);}};
}
const launchTabs=bindContentTabs('[data-launch]','launch-panel-',index=>{
 document.getElementById('launch-position').textContent="Selezionato: "+["valutazione","modellazione","integrazione","esercizio"][index];
 document.getElementById('launch-next').innerHTML=(index===3?"Torna alla prima fase":"Fase successiva")+' <span aria-hidden="true">→</span>';
});
document.getElementById('launch-next').addEventListener('click',()=>launchTabs.next());
const prepButtons=[...document.querySelectorAll('.prep-options button')];
prepButtons.forEach(button=>button.addEventListener('click',()=>{
 button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));
 const count=prepButtons.filter(b=>b.getAttribute('aria-pressed')==='true').length;
 document.getElementById('prep-status').textContent=count?`Selezionati ${count} su 4. La selezione rimane su questa pagina e non viene inviata.`:"Possiamo iniziare da ciò che hai.";
}));
const faqItems=[...document.querySelectorAll('.faq-item')];
function setAnswer(item,open){
 item.classList.toggle('is-open',open);
 const button=item.querySelector('.faq-question');
 const answer=item.querySelector('.faq-answer');
 button.setAttribute('aria-expanded',String(open));
 answer.setAttribute('aria-hidden',String(!open));
 answer.inert=!open;
}
faqItems.forEach(item=>item.querySelector('.faq-question').addEventListener('click',()=>{
 const open=!item.classList.contains('is-open');
 faqItems.forEach(other=>setAnswer(other,other===item&&open));
}));
document.querySelectorAll('[data-faq-filter]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-faq-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
 faqItems.forEach(item=>{
  const visible=button.dataset.faqFilter==='all'||button.dataset.faqFilter===item.dataset.category;
  if(!visible)setAnswer(item,false);
  item.hidden=!visible;
 });
}));
