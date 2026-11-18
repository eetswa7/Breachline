// Controlled clients retain the atomic release handoff. A fresh visit can
// load from the network while offline installation remains optional.
const RELEASE='92';

function version(worker) {
 if(!worker)return Promise.resolve(null);
 return new Promise(resolve=>{
  const channel=new MessageChannel();
  const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
  const timer=setTimeout(()=>finish(null),700);
  channel.port1.onmessage=e=>finish(e.data?.release);
  try{worker.postMessage({type:'VERSION'},[channel.port2]);}catch{finish(null);}
 });
}

function offlineStatus(text) {
 const status=document.getElementById('offline-status');
 if(status)status.textContent=text;
}

async function installRelease(workers,upgrading) {
 const registration=await workers.register('./sw.js?v=92',{updateViaCache:'none'});
 if(upgrading)await registration.update();
 const deadline=Date.now()+180000;
 const initial=registration.installing||registration.waiting;
 while(Date.now()<deadline){
  if(await version(workers.controller)===RELEASE)return;
  if(initial?.state==='redundant'&&!registration.installing&&!registration.waiting)
   throw new Error('The update download was interrupted.');
  await new Promise(resolve=>setTimeout(resolve,180));
 }
 throw new Error('The update download could not finish.');
}

async function boot() {
 try{
  const workers='serviceWorker'in navigator&&window.isSecureContext?navigator.serviceWorker:null;
  const controlled=!!workers?.controller;
  if(controlled&&await version(workers.controller)!==RELEASE){
   const label=document.getElementById('loading-label');
   if(label)label.textContent='DOWNLOADING UPDATED ARTWORK';
   await installRelease(workers,true);
   const style=document.querySelector('link[rel="stylesheet"]');
   if(style)style.href=`./style.css?v=${RELEASE}&ready=1`;
   if(label)label.textContent='PREPARING THE BATTLEGROUND';
  }

  document.getElementById('game-version').textContent=`BREACHLINE · VERSION ${RELEASE}`;
  const { application }=await import('./main.js?v=92');
  if(!workers){offlineStatus('Offline play unavailable');return;}
  if(controlled){
   offlineStatus('Ready for offline play');
   workers.register('./sw.js?v=92',{updateViaCache:'none'}).catch(()=>{});
   return;
  }
  if(!application)return;

  // Prioritize the game shell and visible art. The complete offline package
  // still uses the existing atomic service-worker install and cache policy.
  application.renderer.ready.then(async()=>{
   offlineStatus('Installing offline files');
   await installRelease(workers,false);
   offlineStatus('Ready for offline play');
  }).catch(()=>offlineStatus('Offline installation incomplete'));
 }catch(error){
  console.error(error);
  const loading=document.getElementById('loading');
  loading.classList.remove('hidden');
  loading.innerHTML='<div class="fatal"><h2>Game update interrupted</h2><p>Check your connection, then retry. Your saved progress is kept.</p><button type="button">RETRY</button></div>';
  loading.querySelector('button').onclick=()=>location.reload();
 }
}

boot();
