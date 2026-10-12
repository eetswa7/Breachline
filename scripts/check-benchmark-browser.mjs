// Desktop browser checks of local recording/export. Never iPhone baseline data.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateReport} from './benchmark-validation.mjs';
import {reportFixture} from '../tests/benchmark-fixture.mjs';
import {BENCHMARK_BUILD} from '../dist/js/benchmark-build.js';
const release=/const RELEASE='(\d+)'/.exec(await readFile('dist/js/boot.js','utf8'))[1];
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const server=process.env.BENCHMARK_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4189'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);server.on('exit',code=>{if(code)reject(new Error('Preview server failed'));});});
const browser=await chromium.launch({headless:true,executablePath:process.env.BENCHMARK_TEST_BROWSER??undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:874,height:402},deviceScaleFactor:3,isMobile:true,hasTouch:true,acceptDownloads:true});
// Some container Chromium builds crash inside the unavailable Linux udev
// gamepad backend. Only the test harness substitutes an empty hardware list;
// the shipped game and its controller support are unchanged.
const gamepadBackendDisabled=process.env.BENCHMARK_TEST_NO_GAMEPAD==='1';
if(gamepadBackendDisabled)await context.addInitScript(()=>Object.defineProperty(navigator,'getGamepads',{value:()=>[],configurable:true}));
const page=await context.newPage(),errors=[],checks=[],externalRequests=[],writeRequests=[];
const inspectionInputCheck=process.env.BENCHMARK_TEST_INSPECTION==='1';
page.on('pageerror',e=>errors.push(e.message));
const origin=process.env.BENCHMARK_TEST_ORIGIN??'http://127.0.0.1:4189';
context.on('request',r=>{if(new URL(r.url()).origin!==origin)externalRequests.push(r.url());if(!['GET','HEAD'].includes(r.method()))writeRequests.push(r.method());});
const readRows=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('breachline-benchmarks',2);r.onsuccess=()=>{const db=r.result,tx=db.transaction('items'),q=tx.objectStore('items').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);tx.oncomplete=()=>db.close();};r.onerror=()=>reject(r.error);}));
const screenshot=async name=>{await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/'+name+'.png'});};
try{
 // Seed an old local database before application boot; these records are synthetic.
 const legacy=reportFixture();await page.goto(origin+'/__benchmark-storage-check');
 await page.evaluate(report=>new Promise((resolve,reject)=>{const r=indexedDB.open('breachline-benchmarks',1);r.onupgradeneeded=()=>r.result.createObjectStore('items',{keyPath:'key'});r.onsuccess=()=>{const db=r.result,tx=db.transaction('items','readwrite'),items=tx.objectStore('items');items.put({key:'auth',value:{privateKey:'synthetic-obsolete-key'}});items.put({key:'pairing',value:{publicKey:'synthetic-obsolete-key'}});items.put({key:'report:'+report.session.id,value:{report,state:'pending',attempts:5}});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};r.onerror=()=>reject(r.error);}),legacy);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#loading').waitFor({state:'hidden',timeout:90000});assert((await page.locator('#game-version').textContent()).includes(release));checks.push('release_'+release+'_boot');
 await page.locator('#settings-top').click();const migrated=await readRows();assert.equal(migrated.length,1);assert.equal(migrated[0].value.report.session.id,legacy.session.id);assert.deepEqual(Object.keys(migrated[0].value),['report']);checks.push('legacy_measurements_preserved_obsolete_setup_removed');
 assert.equal(await page.locator('#benchmark-toggle').isChecked(),false);assert.equal(await page.locator('#benchmark-watermark').isVisible(),false);assert.equal(await page.locator('#benchmark-setup').count(),0);assert.equal(await page.locator('#benchmark-retry').count(),0);assert(!/upload|pairing|cloudflare/i.test(await page.locator('#benchmark-panel').innerText()));checks.push('local_controls_without_account_setup');
 await page.locator('[data-setting="quality"]').selectOption('low');await page.locator('#benchmark-toggle').check();await page.locator('[data-page="play"]').click();await page.locator('#deploy').click();await page.locator('#hud').waitFor({state:'visible',timeout:45000});
 if(inspectionInputCheck){
  // Observe the real application's simulation calls after normal boot. This
  // also works when the service worker supplies the unchanged main module.
  await page.evaluate(async release=>{
   const {Game}=await import('/js/engine.js?v='+release),update=Game.prototype.update;
   Game.prototype.update=function(...args){window.__inspectionGame=this;return update.apply(this,args);};
  },release);
  await page.waitForFunction(()=>window.__inspectionGame?.player);
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__inspectionGame.player.weapon.inspectLeft>0);checks.push('keyboard_inspection_through_application_frame');
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.__inspectionGame.player.weapon.inspectLeft===0);checks.push('jump_cancels_live_inspection');
  const swap=await page.locator('[data-action="swap"]').boundingBox(),slot=await page.evaluate(()=>window.__inspectionGame.player.slot),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swap.x+swap.width/2,y:swap.y+swap.height/2,id:901}]});
  await page.waitForFunction(()=>window.__inspectionGame.player.weapon.inspectLeft>0);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate(()=>window.__inspectionGame.player.slot),slot);checks.push('held_swap_inspects_without_switch_through_real_touch_input');
  await page.locator('[data-action="fire"]').tap();await page.waitForFunction(()=>window.__inspectionGame.player.weapon.inspectLeft===0);checks.push('live_fire_cancels_inspection');
  await cdp.detach();await screenshot('inspection-input-release'+release);
 }
 await page.waitForTimeout(20000);assert(await page.locator('#benchmark-watermark').isVisible());assert((await page.locator('#benchmark-watermark').textContent()).includes('FPS'));await screenshot('benchmark-recording');checks.push('normal_gameplay_recording_watermark');
 await page.locator('#pause-button').click();await page.getByRole('button',{name:'BENCHMARK OFF',exact:true}).click();await page.waitForTimeout(500);assert.equal(await page.locator('#benchmark-watermark').isVisible(),false);
 const reports=(await readRows()).filter(r=>r.key.startsWith('report:'));assert.equal(reports.length,2);const report=reports.find(r=>r.value.report.session.id!==legacy.session.id).value.report;validateReport(report);assert(report.raw.seen>10);assert(report.summary.steady.frame_time.count>0);assert.equal(report.session.kind,'gameplay');assert.equal(report.build.release,release);assert.equal(report.contexts[0].graphics.device_pixel_ratio,3);assert.equal(report.contexts[0].graphics.requested_quality,'low');checks.push('final_json_valid_actual_browser_frames');
 await page.getByRole('button',{name:'MAIN MENU',exact:true}).click();await page.locator('#settings-top').click();assert.equal(await page.locator('#benchmark-report').inputValue(),report.session.id);assert((await page.locator('#benchmark-status').textContent()).includes('Export JSON'));checks.push('saved_session_selected_for_export');
 const downloadPromise=page.waitForEvent('download');await page.locator('#benchmark-export').click();const download=await downloadPromise;assert(download.suggestedFilename().endsWith(report.session.id+'.json'));const downloaded=JSON.parse(await readFile(await download.path(),'utf8'));assert.deepEqual(downloaded,report);validateReport(downloaded);assert.equal((await readRows()).filter(r=>r.key.startsWith('report:')).length,2);checks.push('actual_json_download_preserves_saved_copy');
 await page.reload();await page.locator('#loading').waitFor({state:'hidden',timeout:90000});await page.locator('#settings-top').click();assert.equal(await page.locator('#benchmark-toggle').isChecked(),false);assert.equal((await readRows()).filter(r=>r.key.startsWith('report:')).length,2);checks.push('saved_reports_survive_reload');
 await context.setOffline(true);await page.reload();await page.locator('#loading').waitFor({state:'hidden',timeout:30000});await page.locator('#settings-top').click();await page.locator('#benchmark-report').selectOption(report.session.id);
 const offlineDownload=page.waitForEvent('download');await page.locator('#benchmark-export').click();assert.deepEqual(JSON.parse(await readFile(await(await offlineDownload).path(),'utf8')),report);await context.setOffline(false);checks.push('offline_boot_and_json_download');
 await page.locator('#benchmark-stress').click();await page.locator('#hud').waitFor({state:'visible',timeout:45000});await page.waitForTimeout(2500);assert((await page.locator('#benchmark-watermark').textContent()).includes('STRESS'));await page.locator('#pause-button').click();await page.getByRole('button',{name:'STOP TEST',exact:true}).click();await page.locator('#menu').waitFor({state:'visible',timeout:15000});
 const next=(await readRows()).filter(r=>r.key.startsWith('report:'));assert.equal(next.length,3);const scripted=next.find(r=>r.value.report.session.kind==='scripted').value.report;validateReport(scripted);assert.equal(scripted.session.reason,'stress_cancelled');assert.equal(scripted.session.scenario.completed,false);checks.push('scripted_test_isolated_cancelled_and_restored');
 await page.locator('#settings-top').click();await page.locator('#benchmark-report').selectOption(legacy.session.id);await page.locator('#benchmark-remove').click();await page.getByRole('button',{name:'CANCEL',exact:true}).click();assert.equal((await readRows()).filter(r=>r.key.startsWith('report:')).length,3);checks.push('removal_requires_confirmation');
 assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);assert.deepEqual(writeRequests,[]);checks.push('no_page_errors_or_report_network_requests');await screenshot('benchmark-settings');
 assert.deepEqual(report.build,BENCHMARK_BUILD);
 const result={kind:'desktop_browser_validation',actual_iphone_data:false,build:report.build,browser:await browser.version(),renderer:'software WebGL / SwiftShader',viewport:{width:874,height:402,dpr:3},gamepad_hardware_backend_disabled:gamepadBackendDisabled,inspection_application_observation:inspectionInputCheck,checks,errors,external_request_count:externalRequests.length,write_request_count:writeRequests.length,normal_session_frame_count:report.raw.seen,steady_frame_count:report.summary.steady.frame_time.count,normal_report_bytes:Buffer.byteLength(JSON.stringify(report)),json_download_verified:true};
 await writeFile('docs/validation-release'+release+'-benchmark-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(e){await screenshot('benchmark-failure').catch(()=>{});console.error(JSON.stringify({checks,errors,failure:e.message}));throw e;}finally{await browser.close();server?.kill();}
