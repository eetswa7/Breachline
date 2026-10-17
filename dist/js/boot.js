// Activate a complete release before importing its module graph. This also
// upgrades older Home Screen installations whose cache ignored URL versions.
const RELEASE='71';
function version(worker){
 if(!worker)return Promise.resolve(null);
 return new Promise(resolve=>{const channel=new MessageChannel();let settled=false;const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);channel.port1.close();resolve(value);};const timer=setTimeout(()=>finish(null),700);channel.port1.onmessage=e=>finish(e.data?.release);try{worker.postMessage({type:'VERSION'},[channel.port2]);}catch{finish(null);}});
}
async function activateRelease(){
 if(!('serviceWorker'in navigator)||!window.isSecureContext)return;
 const workers=navigator.serviceWorker;
 if(await version(workers.controller)===RELEASE){workers.register('./sw.js?v=71',{updateViaCache:'none'}).catch(()=>{});return;}
 let timer;
 const label=document.getElementById('loading-label');if(label)label.textContent='DOWNLOADING UPDATED ARTWORK';
 const installation=(async()=>{
  let registration;
  try{registration=await workers.register('./sw.js?v=71',{updateViaCache:'none'});await registration.update();}
  catch(error){if(!workers.controller)return;throw error;}
  const until=Date.now()+180000;
  while(Date.now()<until){
   if(await version(workers.controller)===RELEASE)return;
   const pending=registration.installing||registration.waiting;
   if(pending?.state==='redundant')throw new Error('The update download was interrupted.');
   await new Promise(resolve=>setTimeout(resolve,120));
  }
  throw new Error('The update download could not finish.');
 })();
 try{await Promise.race([installation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('The update download timed out.')),185000);})]);}finally{clearTimeout(timer);}
 // Reload the stylesheet through the newly activated cache as well.
 const style=document.querySelector('link[rel="stylesheet"]');if(style)style.href=`./style.css?v=${RELEASE}&ready=1`;
}
async function boot(){try{await activateRelease();document.getElementById('game-version').textContent=`BREACHLINE · VERSION ${RELEASE}`;await import('./main.js?v=71');}catch(error){
 console.error(error);const loading=document.getElementById('loading');loading.classList.remove('hidden');loading.innerHTML='<div class="fatal"><h2>Game update interrupted</h2><p>Check your connection, then retry. Your saved progress is kept.</p><button type="button">RETRY</button></div>';loading.querySelector('button').onclick=()=>location.reload();
}}
boot();
