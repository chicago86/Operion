import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {languageForPosition,detectLanguage} from '../dist/geo-country.mjs';
const boundaries=JSON.parse(await readFile(new URL('../dist/assets/geo-countries-v12.json',import.meta.url),'utf8'));
const locations=[
 ['Kyiv',50.4501,30.5234,'uk'],['Poltava',49.5883,34.5514,'uk'],['Lviv',49.8397,24.0297,'uk'],
 ['Odesa',46.4825,30.7233,'uk'],['Donetsk',48.0159,37.8029,'uk'],['Luhansk',48.574,39.3078,'uk'],
 ['Simferopol',44.9521,34.1024,'uk'],['Sevastopol',44.6167,33.5254,'uk'],
 ['Rome',41.9028,12.4964,'it'],['Milan',45.4642,9.19,'it'],['Venice',45.4408,12.3155,'it'],
 ['Palermo',38.1157,13.3615,'it'],['Cagliari',39.2238,9.1217,'it'],['Naples',40.8518,14.2681,'it'],
 ['Paris',48.8566,2.3522,'en'],['Madrid',40.4168,-3.7038,'en'],['London',51.5074,-.1278,'en'],
 ['New York',40.7128,-74.006,'en'],['Ljubljana',46.0569,14.5058,'en'],['San Marino',43.9367,12.4464,'en'],
 ['Vatican City',41.9029,12.4534,'en']
];
for(const [name,lat,lon,expected]of locations)test('Country selection: '+name,()=>assert.equal(languageForPosition(lat,lon,boundaries),expected));
test('Invalid coordinates keep Ukrainian',()=>assert.equal(languageForPosition(NaN,0,boundaries),'uk'));
test('Permission granted uses local boundaries',async()=>{
 let options;
 const result=await detectLanguage({geolocation:{getCurrentPosition(success,error,value){options=value;success({coords:{latitude:41.9028,longitude:12.4964}});}},loadBoundaries:async()=>boundaries});
 assert.equal(result,'it');assert.equal(options.enableHighAccuracy,false);
});
for(const error of [1,2,3])test('Geolocation error '+error+' keeps Ukrainian without loading a map',async()=>{
 let requested=false;
 assert.equal(await detectLanguage({geolocation:{getCurrentPosition(success,failure){failure({code:error});}},loadBoundaries:async()=>{requested=true;return boundaries;}}),'uk');assert.equal(requested,false);
});
test('Unavailable API, insecure context and thrown browser errors keep Ukrainian',async()=>{
 assert.equal(await detectLanguage({geolocation:null}),'uk');
 assert.equal(await detectLanguage({secureContext:false,geolocation:{getCurrentPosition(){throw Error();}}}),'uk');
 assert.equal(await detectLanguage({geolocation:{getCurrentPosition(){throw Error();}}}),'uk');
});
test('Browser never answering cannot stall selection',async()=>assert.equal(await detectLanguage({geolocation:{getCurrentPosition(){}},timeoutMs:1}),'uk'));
test('Map fetch failure keeps Ukrainian',async()=>assert.equal(await detectLanguage({geolocation:{getCurrentPosition(success){success({coords:{latitude:41.9,longitude:12.5}});}},loadBoundaries:async()=>{throw Error();}}),'uk'));
const bootSource=(await readFile(new URL('../dist/geo-language.mjs',import.meta.url),'utf8')).replace(/^import .*?;\n/,'').replace('import.meta.url',JSON.stringify('https://example.test/geo-language.mjs'));
async function boot({current='uk',target='it',storageError=false,marker=null}={}){
 const entries=new Map(marker?[['operion-language-redirect-v1',JSON.stringify(marker)]]:[]);let replacement=null,calls=0;
 const storage={getItem(key){if(storageError)throw Error();return entries.get(key)||null;},setItem(k,v){if(storageError)throw Error();entries.set(k,v);},removeItem(k){if(storageError)throw Error();entries.delete(k);}};
 const context={document:{documentElement:{lang:current}},navigator:{geolocation:{}},window:{isSecureContext:true},sessionStorage:storage,location:{href:'https://example.test/'+(current==='uk'?'index.html':current+'.html')+'?campaign=demo#solutions',search:'?campaign=demo',hash:'#solutions',replace(url){replacement=url;}},Date,URL,setTimeout,clearTimeout,AbortController,detectLanguage:async()=>{calls++;return target;}};
 await vm.runInNewContext('(async()=>{'+bootSource+'})()',context);
 return {replacement,calls,entries};
}
test('Language redirect keeps query and section',async()=>assert.equal((await boot()).replacement,'https://example.test/it.html?campaign=demo#solutions'));
test('Ukrainian fallback redirects a direct English entry',async()=>assert.equal((await boot({current:'en',target:'uk'})).replacement,'https://example.test/index.html?campaign=demo#solutions'));
test('One-use handoff prevents a duplicate request after redirect',async()=>{
 const result=await boot({current:'it',marker:{language:'it',at:Date.now()}});assert.equal(result.calls,0);assert.equal(result.entries.size,0);
});
test('Storage refusal cannot prevent routing',async()=>assert.equal((await boot({storageError:true})).replacement,'https://example.test/it.html?campaign=demo#solutions'));
test('Already selected language does not loop',async()=>assert.equal((await boot({current:'it',target:'it'})).replacement,null));
