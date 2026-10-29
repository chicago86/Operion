'use strict';
// Keep a selected sector visible in the touch carousel without moving the page.
const sectorMobileQuery=window.matchMedia('(max-width:600px)');
document.querySelectorAll('[data-business]').forEach(button=>{
 const revealSelected=()=>{
  if(!sectorMobileQuery.matches||button.getAttribute('aria-selected')!=='true')return;
  const scroller=button.parentElement;
  const next=button.offsetLeft-scroller.offsetLeft-(scroller.clientWidth-button.offsetWidth)/2;
  scroller.scrollTo({left:next,behavior:reducedMotion.matches?'auto':'smooth'});
 };
 button.addEventListener('click',revealSelected);
 button.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))queueMicrotask(()=>{
   const selected=document.querySelector('[data-business][aria-selected="true"]');
   if(selected&&sectorMobileQuery.matches){
    const scroller=selected.parentElement;
    scroller.scrollTo({left:selected.offsetLeft-scroller.offsetLeft-(scroller.clientWidth-selected.offsetWidth)/2,behavior:reducedMotion.matches?'auto':'smooth'});
   }
  });
 });
});
if('IntersectionObserver' in window){
 const cardMotionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-offscreen',!entry.isIntersecting)),{threshold:0});
 document.querySelectorAll('[data-business]').forEach(button=>cardMotionObserver.observe(button));
}
