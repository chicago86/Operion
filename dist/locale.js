'use strict';
const siteLanguage = ['uk','en','it'].includes(document.documentElement.lang) ? document.documentElement.lang : 'uk';
const demoNumberFormatter = new Intl.NumberFormat({uk:'uk-UA',en:'en-GB',it:'it-IT'}[siteLanguage], {minimumFractionDigits:2,maximumFractionDigits:2});
function formatDemoNumber(value) { return demoNumberFormatter.format(value); }
// Native required-field feedback follows the selected site language, not the browser's UI language.
const validationCopy = {
  uk:{required:'Будь ласка, заповніть це поле.',invalid:'Перевірте правильність введених даних.'},
  en:{required:'Please complete this field.',invalid:'Please check the information you entered.'},
  it:{required:'Compila questo campo.',invalid:'Controlla i dati inseriti.'}
}[siteLanguage];
document.querySelectorAll('form input, form textarea').forEach(field => {
  field.addEventListener('input',()=>field.setCustomValidity(''));
  field.addEventListener('invalid',()=>field.setCustomValidity(field.validity.valueMissing ? validationCopy.required : validationCopy.invalid));
});
document.querySelectorAll('form').forEach(form=>{
  const field=document.createElement('input');field.type='hidden';field.name='lang';field.value=siteLanguage;form.appendChild(field);
});
