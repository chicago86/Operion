'use strict';
// Operion OS is a concept demonstration. These configurations never send commands.
const osWorkspace = document.querySelector('.workspace');
const osBasePhases = demoPhases.map(p => ({...p}));
const osLogistics = [
  {solar:0,load:80,grid:130,soc:38,batteryPower:50},
  {solar:140,load:110,grid:0,soc:62,batteryPower:30},
  {solar:20,load:110,grid:0,soc:74,batteryPower:90}
];
const osJournalMessages = ["Rete → domanda e carica del BESS","Eccedenza FV → carica del BESS","FV + scarica del BESS → domanda"];
function renderOSPhase(i) {
  osWorkspace.dataset.phase = String(i);
  document.getElementById('journal-time').textContent = demoPhases[i].time.split(' / ')[0];
  document.getElementById('journal-action').textContent = osJournalMessages[i];
}
document.addEventListener('operion:phase', e => renderOSPhase(e.detail.phase));
renderOSPhase(demoPhase);
document.getElementById('demo-object').addEventListener('change', e => {
  stopDemo();
  const selection = e.target.value;
  osBasePhases.forEach((base, i) => {
    const p = {...base};
    if (selection !== 'plant') {
      const l = osLogistics[i];
      const aggregate = selection === 'portfolio';
      const baseBattery = [80,60,145][i];
      p.solar = l.solar + (aggregate ? base.solar : 0);
      p.load = l.load + (aggregate ? base.load : 0);
      p.grid = l.grid + (aggregate ? base.grid : 0);
      p.soc = l.soc; // Same illustrative SoC and equal-capacity batteries in both examples.
      const power = l.batteryPower + (aggregate ? baseBattery : 0);
      p.battery = (i === 2 ? "Scarica: " : "Carica: ") + power + " kW";
      p.balance = i === 0 ? `Bilancio: ${p.grid} = ${p.load} + ${power} kW` : i === 1 ? `Bilancio: ${p.solar} = ${p.load} + ${power} kW` : `Bilancio: ${p.solar} + ${power} = ${p.load} kW`;
      p.description = i === 0 ? `Rete: ${p.grid} kW. Domanda: ${p.load} kW. Carica del BESS: ${power} kW.` : i === 1 ? `FV: ${p.solar} kW. Domanda: ${p.load} kW. Carica del BESS: ${power} kW.` : `FV: ${p.solar} kW. Scarica del BESS: ${power} kW. Domanda: ${p.load} kW.`;
      p.reason = p.description + (aggregate ? " I valori di due siti illustrativi vengono sommati; le batterie hanno la stessa capacità e lo stesso SoC." : " Un profilo didattico separato per un sito logistico.");
    }
    Object.assign(demoPhases[i], p);
  });
  showDemoPhase(demoPhase);
  renderOSPhase(demoPhase);
});
// SVG light packets follow real SVG paths; shared pause controls stop them too.
function syncOSVectorMotion() {
  document.querySelectorAll('.hero-energy-art,.os-energy-scene').forEach(svg => {
    const zone = svg.closest('.motion-zone');
    const shouldPause = reducedMotion.matches || document.hidden || document.documentElement.classList.contains('motion-paused') || zone?.classList.contains('motion-offscreen');
    if (typeof svg.pauseAnimations === 'function') {
      shouldPause ? svg.pauseAnimations() : svg.unpauseAnimations();
    }
  });
}
const osMotionObserver = new MutationObserver(syncOSVectorMotion);
osMotionObserver.observe(document.documentElement, {attributes:true, attributeFilter:['class']});
document.querySelectorAll('.hero-surface,#product-demo').forEach(el => osMotionObserver.observe(el, {attributes:true, attributeFilter:['class']}));
document.addEventListener('visibilitychange', syncOSVectorMotion);
reducedMotion.addEventListener('change', syncOSVectorMotion);
document.getElementById('motion-toggle').addEventListener('click', () => {
  const paused = document.documentElement.classList.contains('motion-paused');
  document.getElementById('motion-toggle').setAttribute('aria-label', paused ? "Attiva le animazioni" : "Metti in pausa le animazioni");
  syncOSVectorMotion();
});
syncOSVectorMotion();
// Call shortcut appears after the introduction; it hides at the contact block.
const callDock = document.getElementById('call-dock');
let osContactVisible = false;
let osLastScroll = window.scrollY;
let osScrollFrame = null;
function updateOSCallDock() {
  const y = window.scrollY;
  const visible = y > 600 && !osContactVisible;
  const delta = y - osLastScroll;
  if (Math.abs(delta) > 8) callDock.classList.toggle('is-compact', delta > 0);
  osLastScroll = y;
  callDock.dataset.visible = String(visible);
  callDock.setAttribute('aria-hidden', String(!visible));
  callDock.tabIndex = visible ? 0 : -1;
  osScrollFrame = null;
}
window.addEventListener('scroll', () => {
  if (osScrollFrame === null) osScrollFrame = requestAnimationFrame(updateOSCallDock);
}, {passive:true});
if ('IntersectionObserver' in window) {
  const contactObserver = new IntersectionObserver(entries => {
    osContactVisible = entries[0].isIntersecting;
    updateOSCallDock();
  });
  contactObserver.observe(document.getElementById('contact'));
}
updateOSCallDock();
