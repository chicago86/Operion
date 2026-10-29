'use strict';
// Motion is decorative; all numbers remain the explicit demonstration scenarios.
let dayPlaybackTimer = null;
let dayPlaybackTick = false;
let dayPlaybackStarted = false;
let dayPlaybackFinished = false;
let dayChartVisible = false;
const dispatchStatus = document.getElementById('dispatch-playback-status');
const dispatchSection = document.getElementById('dispatch');
function setDayState(state, text) {
  dispatchSection.dataset.playbackState = state;
  dispatchStatus.textContent = text;
}
function pauseDayPlayback() {
  if (dayPlaybackTimer) clearInterval(dayPlaybackTimer);
  dayPlaybackTimer = null;
  if (dayPlaybackStarted && !dayPlaybackFinished) setDayState('paused', 'Добовий сценарій призупинено.');
}
function stopDayPlayback() {
  // A manual hour selection takes over; automatic playback never restarts it.
  pauseDayPlayback();
  dayPlaybackFinished = true;
  setDayState('manual', 'Обрано годину вручну. Перегляньте рішення для неї.');
}
function maybeRunDayPlayback() {
  if (dayPlaybackFinished || dayPlaybackTimer || !dayChartVisible || document.hidden ||
      reducedMotion.matches || document.documentElement.classList.contains('motion-paused')) return;
  if (!dayPlaybackStarted) {
    dayPlaybackStarted = true;
    dayPlaybackTick = true;
    setHour(0);
    dayPlaybackTick = false;
  }
  setDayState('running', 'Добовий сценарій: один автоматичний прохід від 00:00 до 23:00.');
  dayPlaybackTimer = setInterval(() => {
    const next = Number(document.getElementById('hour').value) + 1;
    if (next > 23) {
      pauseDayPlayback();
      dayPlaybackFinished = true;
      setDayState('complete', 'Добу показано. Оберіть будь-яку годину, щоб розглянути рішення.');
      return;
    }
    dayPlaybackTick = true;
    setHour(next);
    dayPlaybackTick = false;
  }, 1000);
}
function updateDispatchScene({hour, kind: mode}) {
  document.querySelector('.dispatch-detail').dataset.hourKind = mode;
  document.querySelectorAll('.dispatch-step-line span').forEach(el => el.classList.toggle('active', el.dataset.kind === mode && hour < 22));
  document.getElementById('dispatch').style.setProperty('--hour-progress', (hour / 23 * 100) + '%');
}
document.addEventListener('operion:hour', e => updateDispatchScene(e.detail));
setDayState('idle', reducedMotion.matches ? 'Оберіть годину, щоб переглянути рішення. Автопоказ вимкнено відповідно до налаштувань руху.' : 'Добовий сценарій запуститься автоматично, коли ви дійдете до графіка.');
if ('IntersectionObserver' in window) {
  const dayObserver = new IntersectionObserver(entries => {
    dayChartVisible = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
    if (dayChartVisible) maybeRunDayPlayback(); else pauseDayPlayback();
  }, {threshold:[0,.25]});
  dayObserver.observe(document.getElementById('price-chart'));
}
updateDispatchScene({hour:18, kind:kind(18)});
// Selected sector and keyboard navigation retain the original accessible tabs.
const sectorPalette = ['#d9ac70','#73bdd6','#bf9c52','#a59bc9','#7aa7bd','#7ba88f'];
function updateSectorColor() {
  const selected = document.querySelector('[data-business][aria-selected="true"]');
  if (!selected) return;
  const color = sectorPalette[Number(selected.dataset.business)];
  document.getElementById('business-panel').style.borderLeftColor = color;
}
document.querySelectorAll('[data-business]').forEach(el => {
  el.addEventListener('click', updateSectorColor);
  el.addEventListener('keydown', () => queueMicrotask(updateSectorColor));
});
updateSectorColor();
const motionToggle = document.getElementById('motion-toggle');
function syncMotionButton() {
  const paused = document.documentElement.classList.contains('motion-paused');
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.querySelector('i').textContent = paused ? '▶' : 'Ⅱ';
  motionToggle.querySelector('span').textContent = paused ? 'Увімкнути анімації' : 'Зупинити анімації';
}
motionToggle.addEventListener('click', () => {
  const paused = document.documentElement.classList.toggle('motion-paused');
  if (paused) { stopDemo(); pauseDayPlayback(); }
  syncMotionButton();
  if (!paused) maybeRunDayPlayback();
});
// Pause CSS animations outside the viewport and stop playback on hidden tabs.
if ('IntersectionObserver' in window) {
  const motionObserver = new IntersectionObserver(entries => entries.forEach(e => {
    e.target.classList.toggle('motion-offscreen', !e.isIntersecting);
    if (!e.isIntersecting && e.target.id === 'product-demo') stopDemo();
  }), {rootMargin:'120px'});
  document.querySelectorAll('.motion-zone').forEach(el => motionObserver.observe(el));
}
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('tab-hidden', document.hidden);
  if (document.hidden) pauseDayPlayback(); else maybeRunDayPlayback();
});
reducedMotion.addEventListener('change', e => { if (e.matches) pauseDayPlayback(); else maybeRunDayPlayback(); });
