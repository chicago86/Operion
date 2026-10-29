// Local country lookup. Coordinates are never sent to a geocoding provider.
function onSegment(x,y,a,b){
 const cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
 return Math.abs(cross)<1e-10&&x>=Math.min(a[0],b[0])-1e-10&&x<=Math.max(a[0],b[0])+1e-10&&y>=Math.min(a[1],b[1])-1e-10&&y<=Math.max(a[1],b[1])+1e-10;
}
function inRing(x,y,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(onSegment(x,y,a,b))return true;
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function inGeometry(x,y,geometry){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 return polygons.some(polygon=>inRing(x,y,polygon[0])&&!polygon.slice(1).some(hole=>inRing(x,y,hole)));
}
export function languageForPosition(latitude,longitude,data){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<-90||latitude>90||longitude<-180||longitude>180)return 'uk';
 if(!data?.uk||!data?.it)throw new Error('country_data_unavailable');
 if(data.enExclusions?.some(geometry=>inGeometry(longitude,latitude,geometry)))return 'en';
 if(inGeometry(longitude,latitude,data.uk))return 'uk';
 if(inGeometry(longitude,latitude,data.it))return 'it';
 return 'en';
}
export async function detectLanguage({geolocation,secureContext=true,loadBoundaries,timeoutMs=8000}){
 if(!secureContext||typeof geolocation?.getCurrentPosition!=='function')return 'uk';
 const position=await new Promise(resolve=>{
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const timer=setTimeout(()=>finish(null),timeoutMs+300);
  try{geolocation.getCurrentPosition(finish,()=>finish(null),{enableHighAccuracy:false,maximumAge:300000,timeout:timeoutMs});}
  catch{finish(null);}
 });
 if(!position?.coords)return 'uk';
 try{return languageForPosition(position.coords.latitude,position.coords.longitude,await loadBoundaries());}
 catch{return 'uk';}
}
