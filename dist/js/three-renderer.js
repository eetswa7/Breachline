import {loadProductionTextures,stageTextureUploads} from './production-textures.js?v=71';
import {ProductionLighting} from './production-lighting.js?v=71';
import {objectiveBannerTexture,patchObjectiveBanner} from './objective-banner.js?v=71';
import {loadBlenderAssets,syncBlenderWeapon} from './blender-assets.js?v=71';
import {patchBlenderMaterial} from './blender-material.js?v=71';
import {blenderWorld} from './blender-world.js?v=71';
import {operatorMuzzle,operatorWeaponMount,nativeOperatorWeapon} from './operator-detail.js?v=71';
import {actorDeathProgress,transformOperatorPose} from './actor-pose.js?v=71';
import {updateWeaponClearance} from './weapon-clearance.js?v=71';
import {WEAPONS} from './weapons.js?v=71';
import {muzzleFlash,muzzleGas} from './firing-presentation.js?v=71';
import {hardWeaponBevel,patchWeaponBevel} from './weapon-surface.js?v=71';
import {patchAtmosphere} from './atmosphere.js?v=71';
import {installMetricUV,patchMetricUV} from './surface-uv.js?v=71';
import {worldMaterialVariationEligible,patchWorldMaterialVariation} from './world-material-variation.js?v=71';
import {SceneLOD,detailThickness,actorDetailLevel} from './scene-lod.js?v=71';
import {positionSun,shadowDue,shadowBias} from './shadow-system.js?v=71';
import {billboardVertex,billboardFragment,ambientDust,weatherParticles,grenadeSmokeBillboards} from './particles.js?v=71';
import {configurePresentation,presentationCapabilities} from './render-pipeline.js?v=71';
import {DecalSystem} from './decal-system.js?v=71';
import {ExplosionShockSystem} from './explosion-shock.js?v=71';
import {EnvironmentalFireSystem} from './environmental-fire.js?v=71';
import {GlassDamageSystem} from './glass-damage.js?v=71';
import {EnvironmentProbes,orientWeaponEnvironment,roomProbeSelected,cloudMask} from './environment-probes.js?v=71';
import {LightingField} from './lighting-field.js?v=71';
import {RoomLights} from './room-lights.js?v=71';
import {waterMaterial,patchWater} from './water-material.js?v=71';
import {visualGroundHeight} from './surface-placement.js?v=71';
import {patchSurfaceDetail} from './material-detail.js?v=71';
import {QUALITY,GraphicsQuality} from './graphics-quality.js?v=71';
import {GraphicsProfiler,textureBytes} from './graphics-profiler.js?v=71';
import {framebufferSize,sceneryOcclusion} from './render-budget.js?v=71';
import * as THREE from '../vendor/three.module.min.js';
import { clamp, lerp, compose, direction, distance } from './math.js?v=71';
import { actorModel, material, part } from './geometry.js?v=71';
import { ridgeMesh, ridgeTint } from './meshes.js?v=71';
import { loadImages } from './textures.js?v=71';
import { aimFov, verticalFov, scopeVisible, weaponPose, cameraBob, movementFov } from './aim.js?v=71';
import { weaponModel, animateWeaponParts } from './weapon-models.js?v=71';
import { identityFor, IDENTITIES } from './combat-identity.js?v=71';

const FRIEND = IDENTITIES.ally.band, ENEMY = IDENTITIES.enemy.band;
const FX_CAPACITY = 280;
const RAD = Math.PI / 180;
const FAR_ACTOR_PARTS = new Set([0,1,2,3,4,5,6,7,8,10,11,14,15,16,17,20,21]);

// The gameplay model remains engine independent. Only this module owns Three.js.
export function isFriendly(game, actor) {
  return identityFor(actor, game.player, game.rules).key !== 'enemy';
}

function bufferGeometry(vertices) {
  const geometry = new THREE.BufferGeometry();
  const buffer = new THREE.InterleavedBuffer(vertices, 8);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(buffer, 3, 3));
  geometry.setAttribute('uv', new THREE.InterleavedBufferAttribute(buffer, 2, 6));
  geometry.computeBoundingSphere();
  return geometry;
}

function tileCanvas(image, columns, index, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const edge = image.width / columns, height = image.height / columns;
  context.drawImage(image, index % columns * edge, Math.floor(index / columns) * height,
    edge, height, 0, 0, size, size);
  return canvas;
}

// Remove a tile's average colour before applying the authored weapon finish.
// This keeps dark graphite legible and prevents a tan tile from tinting twice.
export function neutraliseFinish(pixels) {
  let red = 0, green = 0, blue = 0, count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) { red += pixels[i]; green += pixels[i+1]; blue += pixels[i+2]; }
  const sr = 178 / Math.max(24, red / count), sg = 178 / Math.max(24, green / count), sb = 178 / Math.max(24, blue / count);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = clamp(pixels[i] * sr, 18, 248); pixels[i+1] = clamp(pixels[i+1] * sg, 18, 248); pixels[i+2] = clamp(pixels[i+2] * sb, 18, 248);
  }
  return pixels;
}

export class Renderer {
  constructor(canvas, settings) {
    this.canvas = canvas; this.settings = settings; this.lost = false; this.compatibility = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false,
      depth: true, stencil: false, powerPreference: 'high-performance' });
    this.gl = this.renderer.getContext();
    this.profiler=new GraphicsProfiler(this.gl);this.qualityController=new GraphicsQuality(settings.quality);
    configurePresentation(this.renderer);this.presentation=presentationCapabilities(this.gl);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.scene = new THREE.Scene(); this.weaponScene = new THREE.Scene();
    this.productionLighting=new ProductionLighting();this.lightingField=new LightingField();this.roomLights=new RoomLights();this.sceneLOD=new SceneLOD();
    this.camera = new THREE.PerspectiveCamera(55, 1, .055, 190);
    this.weaponCamera = new THREE.PerspectiveCamera(65, 1, .018, 10);
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.weaponRoot = new THREE.Group(); this.weaponScene.add(this.weaponRoot);
    this.sun = new THREE.DirectionalLight(0xffefd8, 3.1);
    this.sun.castShadow = true; this.sun.shadow.bias = -.00035; this.sun.shadow.normalBias = .035;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 150;
    Object.assign(this.sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 });
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xb1d4ea, 0x5a564b, 1.45); this.scene.add(this.hemi);
    this.weaponKeyLight = new THREE.DirectionalLight(0xfff0da, 3.4);
    this.weaponKeyLight.position.set(-2, 4, 1);
    this.weaponFill = new THREE.HemisphereLight(0xbddaea, 0x38302a, 1.75);
    this.weaponScene.add(this.weaponKeyLight, this.weaponFill);
    this.weaponLocalLight=new THREE.PointLight(0xffdfad,0,11,2);this.weaponScene.add(this.weaponLocalLight);
    this.interiorLights = Array.from({ length: 3 }, () => { const light = new THREE.PointLight(0xffdfad, 0, 11, 2);
      this.scene.add(light); return light; });
    this.muzzleLight = new THREE.PointLight(0xffb345, 0, 2.3, 2); this.weaponScene.add(this.muzzleLight);
    // The primary path waits for its required native library. Historical CPU
    // fixtures supply their own kit; the game allocates no duplicate mesh kit.
    this.geometry = {};
    this.worldMaterialVariationEnabled={value:1};this.worldMaterialVariationDetail={value:1};
    this.materials = new Map(); this.depthMaterials = new Map(); this.textures = []; this.partData = new WeakMap();
    this.bannerTexture=objectiveBannerTexture();this.textures.push(this.bannerTexture);
    this.worldBatches = []; this.actorBatches = new Map(); this.weaponBatches = new Map();
    this.matrix = new THREE.Matrix4(); this.parentMatrix = new THREE.Matrix4();
    this.operatorWeaponMatrix=new THREE.Matrix4();this.operatorWeaponLocal=new THREE.Matrix4();this.operatorWeaponPose={};
    this.localMatrix = new THREE.Matrix4(); this.rawMatrix = new Float32Array(16);
    this.color = new THREE.Color(); this.target = new THREE.Vector3(); this.projected = new THREE.Vector4();
    this.worldVP = new THREE.Matrix4(); this.eye = { x: 0, y: 2, z: 0 }; this.cameraY = null;
    this.windTime = { value: 0 };this.leafSun={value:new THREE.Vector3()};
    this.hazeSun={value:new THREE.Vector3(0,1,0)};this.hazeAmount={value:.08};
    this.weaponKey = ''; this.weaponParts = []; this.weaponPoseState = {};
    this.frustum = new THREE.Frustum(); this.actorBounds = new THREE.Sphere(new THREE.Vector3(), 1.5);
    this.renderScale = 1; this.frameAverage = 16.7; this.slowTime = 0; this.fastTime = 0;
    this.frames = 0; this.fps = 60; this.lastFPS = 0; this.drawCalls = 0; this.shadowClock = 1;
    this.quality = this.chooseQuality(); this.appliedQuality = ''; this.width = 0; this.height = 0;
    this.effects = Array.from({ length: 200 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      size: 0, max: 1, kind: 0, r: 1, g: 1, b: 1 }));
    this.effectCursor = 0; this.nearestLights = [null, null, null]; this.lightDistances = [Infinity, Infinity, Infinity];
    this.createEffectPool(); this.createMuzzle();this.decalSystem=new DecalSystem(this.scene);
    this.explosionShock=new ExplosionShockSystem(this.scene);
    this.environmentalFire=new EnvironmentalFireSystem(this.scene);
    this.glassDamage=new GlassDamageSystem(this.scene);
    this.onContextLost = event => { event.preventDefault(); this.lost = true;
      window.dispatchEvent(new CustomEvent('graphicslost')); };
    this.onContextRestored = () => window.location.reload();
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.ready = this.loadAssets();
  }

  chooseQuality() {
    return QUALITY[this.settings.quality] ? this.settings.quality : 'medium';
  }

  resetQuality(){this.qualityController?.reset(this.settings.quality);this.quality=this.chooseQuality();this.renderScale=1;}

  recordFrame(cpuMs,elapsed,active){
    this.profiler?.record(cpuMs,elapsed,active);
    this.qualityController?.sample(elapsed,this.profiler?.cpuMs??cpuMs,this.profiler?.gpuMs,active,this.settings.frameRate);
    if(this.qualityController){this.quality=this.qualityController.tier;this.renderScale=this.qualityController.scale;}
  }

  diagnostics(){const p=this.profiler,q=QUALITY[this.quality]??QUALITY.medium;
    return `${this.compatibility?'Canvas':'WebGL2'} · ${this.quality.toUpperCase()} · ${this.width} × ${this.height}\n${this.drawCalls} draws · ${Math.round(this.triangles??0).toLocaleString()} triangles\nCPU ${p?.cpuMs.toFixed(1)??'N/A'} ms · GPU ${p?.gpuMs?.toFixed(1)??'unavailable'} ms\nFrame p95 ${p?.frameP95.toFixed(1)??'N/A'} ms · textures ~${((this.textureMemory??0)/1048576).toFixed(1)} MiB\n${q.shadow}px shadows / ${q.shadowHz} Hz / ${q.shadow?this.lastShadowDraws??0:0} draws · ${this.shaderPrograms??0} programs`;
  }

  async loadAssets() {
    const [images,blenderAssets,production] = await Promise.all([loadImages(['leaves','horizon','effects']),loadBlenderAssets(),loadProductionTextures(this.renderer)]);
    this.blenderAssets=blenderAssets;this.productionAssets=production;
    const anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.surfaceMaps=production.surfaces;this.weaponMaps=production.weapons;this.leafMaps=[];
    this.textures.push(...production.textures);
    if(this.arena)this.productionLighting.setArena(this.arena,production.lightmaps);
    for (let i = 0; i < 4; i++) {
      const map = new THREE.CanvasTexture(tileCanvas(images.leaves, 2, i, 512));
      map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy;
      this.leafMaps.push(map); this.textures.push(map);
    }
    this.installAuthoredEffects(images.effects);
    this.environmentProbes=new EnvironmentProbes(this.renderer,cloudMask(images.horizon));
    this.environment=this.environmentProbes.setArena(this.arena.info);
    // The visible sky and reflections now share weather, horizon and sun.
    this.scene.background = this.environmentProbes.sky; this.scene.backgroundIntensity = 1;
    this.scene.environment = this.weaponScene.environment = this.environment.texture;
    this.scene.environmentIntensity = .88; this.weaponScene.environmentIntensity = 1.35;
    this.textureMemory=textureBytes([...this.textures,this.environment?.texture,this.environmentProbes?.sky,this.environmentProbes?.interior?.texture,this.lightingField?.texture.value]);
    if (this.arena) this.buildWorld();
    this.applyQuality();
    // Upload generated textures while the loading screen can still yield.
    await stageTextureUploads(this.renderer,this.textures);
    // Use the supported asynchronous shader warmup path when available.
    if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
    this.loaded = true;
    return this;
  }

  setArena(arena) {
    this.arena = arena; this.cameraY = null; this.cameraBobState = {}; this.movementFovState={}; this.weaponClearanceState={}; this.shadowClock = 1;
    if(this.qualityController){this.qualityController.warmup=2;this.qualityController.slow=this.qualityController.fast=0;}
    for (const effect of this.effects) effect.life = 0;
    this.decalSystem?.clear();
    this.explosionShock?.clear();
    this.environmentalFire?.clear();this.glassDamage?.clear();
    this.clearDynamic(this.actorBatches);
    const info = arena.info, overcast = info.weather === 'overcast'||info.weather==='rain';
    this.hazeSun?.value.set(...info.sun).normalize();if(this.hazeAmount)this.hazeAmount.value=overcast?.045:info.tag==='DESERT'||info.tag==='QUARRY'?.13:.075;
    this.scene.fog = new THREE.Fog(this.color.setRGB(...info.fog, THREE.SRGBColorSpace).clone(), 45, 155);
    this.sun.color.setHex(overcast ? 0xd6e4ef : 0xffefd8); this.sun.intensity = overcast ? 1.8 : 3.1;
    this.hemi.intensity = overcast ? 2.8 : 1.75;
    this.lightingField?.setArena(arena);this.productionLighting?.setArena(arena,this.productionAssets?.lightmaps);
    this.lightClock=0;
    this.lightPositions = arena.decor.filter(p => p.emissive > .5 && p.y > 1 && p.surface === 'white')
      .map(p => ({ x: p.x, y: p.y - .25, z: p.z }));
    if (this.loaded){
      if(this.environmentProbes){this.environment=this.environmentProbes.setArena(info);this.scene.environment=this.weaponScene.environment=this.environment.texture;this.scene.background=this.environmentProbes.sky;}
      this.buildWorld();
    }
  }

  partMatrix(p, target = this.matrix) {
    compose(this.rawMatrix, p.x, p.y, p.z, p.w, p.h, p.d, p.yaw ?? 0, p.pitch ?? 0, p.roll ?? 0);
    target.fromArray(this.rawMatrix); return target;
  }

  partMaterial(p) {
    let data = this.partData.get(p);
    if (!data) { const m = material(p); data = { ...m, finishTile: p.finishTile, keys: Object.create(null), bindings: Object.create(null) }; this.partData.set(p, data); }
    return data;
  }

  materialKey(p, category) {
    const m = this.partMaterial(p);
    if(p.objectiveBanner)return `${category}/objective-banner-v1`;
    return m.keys[category] ?? (m.keys[category] = `${category}/${p.surface==='snow'?'snow-grain-v1':p.surface==='water'&&p.surfaceLayer===2?'puddle-v1':'general-surface'}/${p.operatorWeapon?'operator-weapon':'general'}/${this.blenderAssets?.key(p,category)?'blender':['ridge','conifer','strata'].includes(p.mesh)?p.mesh:'regular'}/${p.blenderWind?'plant-wind':'still'}/${p.blenderVertexMaterial?'vertex-material':'uniform-material'}/${(category==='weapon'||p.operatorWeapon)&&p.blenderColour&&p.blenderVertexMaterial?'native-hero-reflectance':'general-reflectance'}/${category==='world'&&m.pattern===9&&p.blenderVertexMaterial?'authored-paint':'base-reflectance'}/${worldMaterialVariationEligible(p,category,m)?'isotropic-variation-v1':'authored-pattern'}/${p.productionGround?'baked-ground':'live-lighting'}/${p.productionEpoxy?'epoxy':'plain'}/${p.wet?'wet':'dry'}/${p.surfaceLayer??0}/${!this.blenderAssets&&category==='weapon'&&hardWeaponBevel(p)?'hard-bevel':'regular'}/${m.pattern}/${category === 'weapon'||p.operatorWeapon ? m.finishTile ?? -1 : -1}/${Math.round(m.rough * 10) / 10}/${Math.round(m.metal * 10) / 10}/${m.emissive > 0 ? m.emissive : 0}/${p.surface==='water'?2:p.surface === 'glass' ? 1 : 0}`);
  }

  makeMaterial(p, category) {
    const key = this.materialKey(p, category);
    if (this.materials.has(key)) return this.materials.get(key);
    const m = this.partMaterial(p), leaf = p.leaf !== undefined, water=p.surface==='water', snow=p.surface==='snow', puddle=water&&p.surfaceLayer===2, tile = Math.round(m.pattern - 1);
    const hero=category==='weapon'||p.operatorWeapon;
    const variation=worldMaterialVariationEligible(p,category,m);
    const finish = hero && Number.isInteger(m.finishTile) ? this.weaponMaps?.[m.finishTile] : null;
    const nativeHero=!!(hero&&finish&&p.blenderColour&&p.blenderVertexMaterial);
    const maps = p.objectiveBanner?null:snow?this.surfaceMaps[6]:finish ?? (!leaf && tile >= 0 ? this.surfaceMaps[tile] : null);
    const normalStrength=snow?.12:nativeHero?(m.finishTile===2?.55:.85):hero?.27:p.productionGround?.20:.48;
    const options = { dithering: true, color: 0xffffff, vertexColors:!!this.blenderAssets?.key(p,category)||['ridge','conifer','strata'].includes(p.mesh), roughness: snow?.98:p.wet?Math.max(.18,m.rough*.42):clamp(m.rough, .14, 1), metalness: snow?0:clamp(m.metal, 0, 1),
      map: snow?null:leaf ? this.leafMaps[p.leaf] : maps?.map ?? null, normalMap: maps?.normal ?? null,
      roughnessMap: maps?.roughness ?? null, normalScale: new THREE.Vector2(normalStrength,normalStrength), envMapIntensity: hero ? 1.15 : .65 };
    if(p.surfaceLayer)Object.assign(options,{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-p.surfaceLayer});
    if (leaf) Object.assign(options, { side: THREE.DoubleSide, alphaToCoverage:true, alphaTest: .58, metalness: 0, roughness: 1 });
    if(p.blenderWind)Object.assign(options,{side:THREE.DoubleSide,roughness:1,metalness:0});
    if (m.emissive > 0) Object.assign(options, { emissive: 0xffffff, emissiveIntensity: m.emissive * .7 });
    const mat = water ? waterMaterial(options,puddle) : p.surface === 'glass' ? new THREE.MeshPhysicalMaterial({ ...options, clearcoat: .9,
      clearcoatRoughness: .12, roughness: .18, metalness: 0 }) : new THREE.MeshStandardMaterial(options);
    if(p.objectiveBanner){mat.map=this.bannerTexture??(this.bannerTexture=objectiveBannerTexture());mat.roughness=.92;mat.metalness=0;mat.emissiveIntensity=0;mat.vertexColors=false;}
    // Per-instance dimensions give architecture a consistent material scale.
    if (!leaf && maps && (category === 'world' || finish)) {
      mat.onBeforeCompile = shader => patchMetricUV(shader,hero?18:.7);
      const patchUV=mat.onBeforeCompile;
      mat.onBeforeCompile=shader=>{
        patchUV(shader);
        if(category==='world'){
          shader.vertexShader='varying vec3 vBreachSurface; varying vec2 vBreachAge;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
            #ifdef USE_INSTANCING
            vBreachSurface=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;
            vBreachAge=vec2(fract(sin(dot(instanceMatrix[3].xz,vec2(12.9898,78.233)))*43758.5453),1.0-abs(normal.y));
            #else
            vBreachSurface=(modelMatrix*vec4(position,1.0)).xyz;vBreachAge=vec2(.5,1.0-abs(normal.y));
            #endif`);
          shader.fragmentShader='varying vec3 vBreachSurface; varying vec2 vBreachAge;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
            // Low-frequency mottling breaks repeated tiles without another texture read.
            ${p.productionEpoxy?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.215,.21),.62);':''}
            float patina=sin(vBreachSurface.x*.61+sin(vBreachSurface.z*.47))*sin(vBreachSurface.z*.39+vBreachSurface.y*.72);
            if(abs(vBreachAge.y)<.05)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),.16);
            float breachDirt=(1.0-smoothstep(.05,.85,vBreachSurface.y))*(.10+vBreachAge.x*.14)*vBreachAge.y;
            diffuseColor.rgb*=(.94+patina*.055+vBreachAge.x*.06)*(1.0-breachDirt);
            diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.88,.84,.75),breachDirt);

          `);
        }
      };
      mat.customProgramCacheKey = () => hero ? 'weapon-metric-uv-v3' : 'world-metric-uv-v4';
    }
    if (leaf) {
      this.patchWind(mat);
      const wind=mat.onBeforeCompile;
      mat.onBeforeCompile=shader=>{wind(shader);shader.uniforms.uBreachLeafSun=this.leafSun??{value:new THREE.Vector3(0,1,0)};
        shader.fragmentShader='uniform vec3 uBreachLeafSun;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
          // Thin-leaf sky transmission, deliberately capped to avoid luminous cards.
          float leafBack=max(0.0,dot(-normal,uBreachLeafSun));
          reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.045,.065,.025)*leafBack;
        `);
      };
      mat.customProgramCacheKey=()=>'foliage-wind-thin-leaf-v2';
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking,
        map: this.leafMaps[p.leaf], alphaTest: .58, side: THREE.DoubleSide });
      this.patchWind(depth); this.depthMaterials.set(key, depth);
    }
    if(p.blenderWind){const plant={};this.patchWind(plant);const before=mat.onBeforeCompile;mat.onBeforeCompile=shader=>{before(shader);plant.onBeforeCompile(shader);};mat.customProgramCacheKey=()=> 'blender-opaque-canopy-wind-v1';
      const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});this.patchWind(depth);this.depthMaterials.set(key,depth);
    }
    const previousPatch=mat.onBeforeCompile,previousKey=mat.customProgramCacheKey();
    mat.onBeforeCompile=shader=>{previousPatch(shader);if(!this.blenderAssets&&category==='weapon'&&hardWeaponBevel(p))patchWeaponBevel(shader);if(maps||water)patchSurfaceDetail(shader,maps?.baked,snow||!!p.blenderVertexMaterial,p.wet?.42:1);if(p.blenderVertexMaterial&&!p.objectiveBanner&&!snow&&!puddle)patchBlenderMaterial(shader,category==='world'&&tile===8,nativeHero);if(water)patchWater(shader,this.windTime,this.arena?.info?.size,puddle);else if(category!=='weapon'&&!leaf){if(p.productionGround)this.productionLighting?.patch(shader);else{this.lightingField?.patch(shader,category==='world');this.roomLights?.patch(shader);if(category==='world')this.productionLighting?.patchBounce(shader);}}if(category!=='weapon')patchAtmosphere(shader,this.hazeSun??{value:new THREE.Vector3(0,1,0)},this.hazeAmount??{value:.075});};
    // Cache by the actual shader interface. World bounce, actor lighting and
    // the viewmodel use different uniforms even when their Three defines match.
    // Epoxy's diffuse patch also differs from ordinary concrete.
    mat.customProgramCacheKey=()=>`${category}/${previousKey}/${puddle?'puddle-v1':water?'water-v2':snow?'snow-grain-v1':!this.blenderAssets&&category==='weapon'&&hardWeaponBevel(p)?'metric-bevel':''}/packed-orm-${maps?maps.baked?'blender-v2':'v2':'none'}/${p.blenderVertexMaterial&&!snow&&!puddle?'vertex-rm-v2':''}/${nativeHero?'native-hero-reflectance-v1':'general-reflectance'}/${category==='world'&&tile===8&&p.blenderVertexMaterial?'authored-paint-v1':'base-reflectance'}/${p.wet?'wet':'dry'}/${p.productionGround?'cycles-ground-v2':category==='world'?'room-ground-bounce-v4':category==='actor'?'room-lightfield-v2':'hero-lighting'}/${p.productionEpoxy?'epoxy':'plain'}/haze-v2`;
    if(variation){
      this.worldMaterialVariationEnabled??={value:1};
      this.worldMaterialVariationDetail??={value:this.quality==='low'?0:1};
      const before=mat.onBeforeCompile,programKey=mat.customProgramCacheKey();
      mat.onBeforeCompile=shader=>{before(shader);patchWorldMaterialVariation(shader,this.worldMaterialVariationEnabled,this.worldMaterialVariationDetail);};
      mat.customProgramCacheKey=()=>programKey+'/isotropic-variation-v1';
      mat.userData.worldMaterialVariation={eligible:true,maxSamplesPerMap:2,lowSamplesPerMap:1,phase:true,alignedPBR:true,explicitMipDerivatives:true};
    }
    if(p.objectiveBanner){const before=mat.onBeforeCompile,key=mat.customProgramCacheKey();
      mat.onBeforeCompile=shader=>{before(shader);patchObjectiveBanner(shader,this.windTime??{value:0});};
      mat.customProgramCacheKey=()=>key+'/objective-textile-v2';
    }
    this.materials.set(key, mat); return mat;
  }

  patchWind(mat) {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uBreachWind = this.windTime;
      shader.vertexShader = `uniform float uBreachWind;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float phase=uBreachWind*1.4+instanceMatrix[3].x*.6+instanceMatrix[3].z*.45;
        float sway=pow(max(position.y+.5,0.0),2.0)*.045;
        transformed.x+=sin(phase)*sway; transformed.z+=cos(phase*.79)*sway;
        #endif`);
    };
    mat.customProgramCacheKey = () => 'foliage-wind-v1';
  }

  instanceColor(p, category, override) {
    if(p.surface==='water'&&p.surfaceLayer===2)return this.color.setRGB(.19,.195,.19,THREE.SRGBColorSpace);
    if(p.blenderColour)return this.color.setRGB(1,1,1);
    const m = this.partMaterial(p), c = override ?? p.color ?? m.color;
    if(category==='world'&&p.surface==='snow')return this.color.setRGB(.85+c[0]*.15,.85+c[1]*.15,.85+c[2]*.15,THREE.SRGBColorSpace);
    // The authored cloth already owns its diffuse reflectance. Team colours tint
    // it gently, avoiding the former multiplication of two dark albedos.
    if(category==='actor'&&p.surface==='fabric')return this.color.setRGB(.68+c[0]*.32,.68+c[1]*.32,.68+c[2]*.32,THREE.SRGBColorSpace);
    if(category==='actor'&&p.surface==='rubber')return this.color.setRGB(.20+c[0]*.8,.20+c[1]*.8,.20+c[2]*.8,THREE.SRGBColorSpace);
    // Architectural textures contain their own albedo; retain a light tint rather than multiplying it twice.
    if ((category === 'weapon'||p.operatorWeapon) && m.finishTile >= 0) return this.color.setRGB(
      .14 + c[0] * .86, .14 + c[1] * .86, .14 + c[2] * .86, THREE.SRGBColorSpace);
    const painted=category==='world'&&m.pattern===9&&p.blenderVertexMaterial;
    const brighten = category === 'world' && m.pattern > 0 && !p.color&&!painted;
    this.color.setRGB(painted?.25+c[0]*.75:brighten ? .85 + c[0] * .15 : c[0],
      painted?.25+c[1]*.75:brighten ? .85 + c[1] * .15 : c[1], painted?.25+c[2]*.75:brighten ? .85 + c[2] * .15 : c[2], THREE.SRGBColorSpace);
    if(category==='world'&&this.arena&&!this.lightingField){m.occlusion??=sceneryOcclusion(p,this.arena);this.color.multiplyScalar(m.occlusion);}
    return this.color;
  }

  buildWorld() {
    for (const batch of this.worldBatches) { this.world.remove(batch); batch.dispose(); }
    this.worldBatches.length = 0;
    this.blenderWorldLODs=[];
    this.geometry.ridge?.dispose();
    if(!this.blenderAssets&&this.arena.info.id!==4){
      const id=this.arena.info.id,vertices=ridgeMesh(this.arena.info.size,id),geometry=bufferGeometry(vertices);
      const colors=new Float32Array(vertices.length/8*3),color=new THREE.Color();
      for(let i=0;i<vertices.length;i+=8){
        color.setRGB(...ridgeTint(vertices[i+1],id),THREE.SRGBColorSpace);
        colors.set(color.toArray(),i/8*3);
      }
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      this.geometry.ridge=installMetricUV(geometry,'ridge');
    }
    else delete this.geometry.ridge;
    for(const p of this.arena.decor){p.renderMicroDetail=!p.ground&&!p.emissive&&p.surface!=='glass'&&detailThickness(p)<.13;if(this.blenderAssets&&p.mesh==='ridge')p.blenderRidgeName=`ridge_${this.arena.info.ridgeTemplate??this.arena.info.id}`;}
    for(const p of this.arena.blocks)p.renderMicroDetail=false;
    const bins = new Map();
    const visuals=this.blenderAssets?blenderWorld(this.arena):null;
    for (const list of visuals?[visuals]:[this.arena.blocks, this.arena.decor, this.arena.foliage ?? []]) for (const p of list) {
      if (p.destroyed || p.invisible) continue;
      this.blenderAssets?.prepare(p,'world');
      const mesh = this.blenderAssets?.key(p,'world') ?? p.mesh ?? 'cube', materialKey = this.materialKey(p, 'world');
      // Two-triangle floor finishes are cheap to submit together; retain spatial
      // chunks for 3D architecture where frustum culling saves substantial work.
      const cell=this.arena.info.size>50?48:32;
      // Centre a spatial cell on the map origin. Splitting at zero needlessly
      // divides the central building into four otherwise identical batches.
      const chunk = p.ground ? 'ground' : p.mesh==='surface'?'surface':`${Math.floor((p.x + cell*.5) / cell)}/${Math.floor((p.z + cell*.5) / cell)}`;
      const key = `${chunk}/${mesh}/${materialKey}`;
      if (!bins.has(key)) bins.set(key, []); bins.get(key).push(p);
    }
    for (const parts of bins.values()) {
      const p = parts[0], leaf = p.leaf !== undefined;
      const batch = new THREE.InstancedMesh(this.partGeometry(p, 'world'),
        this.makeMaterial(p, 'world'), parts.length);
      for (let i = 0; i < parts.length; i++) { batch.setMatrixAt(i, this.partMatrix(parts[i]));
        batch.setColorAt(i, this.instanceColor(parts[i], 'world')); }
      batch.instanceMatrix.needsUpdate = true; if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
      // Tiny decorative strips do not warrant another shadow-caster draw call.
      batch.castShadow = !p.ground && p.mesh!=='surface' && p.mesh!=='ridge' && p.mesh!=='strata' && parts.some(q => Math.max(q.w, q.h, q.d) > .6); batch.receiveShadow = !p.productionGround&&p.mesh!=='ridge'&&p.mesh!=='strata';
      batch.userData.leaf = leaf; batch.userData.parts = parts; batch.userData.fullCount = parts.length;
      batch.userData.hasMicroDetail=parts.some(q=>q.renderMicroDetail);
      batch.onBeforeShadow=()=>{this.shadowDraws=(this.shadowDraws??0)+1;};
      if (leaf||p.blenderWind) batch.customDepthMaterial = this.depthMaterials.get(this.materialKey(p, 'world'));
      batch.computeBoundingBox(); batch.computeBoundingSphere();
      this.world.add(batch); this.worldBatches.push(batch);
      const kind=this.blenderAssets?.key(p,'world')?.split('/')[0];
      const canopy=['conifer','palm_crown','tree_crown'].includes(kind);
      const farGeometry=this.blenderAssets?.geometry(p,'world',true);
      const detailLOD=farGeometry&&!p.blenderMesh&&!kind?.startsWith('ridge_')&&!batch.userData.hasMicroDetail&&batch.geometry.index.count>960&&farGeometry.index.count<batch.geometry.index.count*.75;
      if(this.blenderAssets&&(canopy||detailLOD)){
        const far=new THREE.InstancedMesh(farGeometry,batch.material,parts.length);
        far.instanceMatrix.copy(batch.instanceMatrix);if(batch.instanceColor)far.instanceColor=batch.instanceColor.clone();
        far.boundingBox=batch.boundingBox.clone();far.boundingSphere=batch.boundingSphere.clone();
        far.castShadow=batch.castShadow;far.receiveShadow=batch.receiveShadow;far.onBeforeShadow=batch.onBeforeShadow;
        far.customDepthMaterial=batch.customDepthMaterial;
        const pair={near:batch,far,parts,kind,canopy,visibility:new WeakMap()};
        batch.userData.blenderPair=pair;far.userData={...batch.userData,blenderFar:true};
        far.count=0;this.world.add(far);this.worldBatches.push(far);this.blenderWorldLODs.push(pair);
        for(const b of [batch,far]){b.instanceMatrix.setUsage(THREE.DynamicDrawUsage);b.instanceColor?.setUsage(THREE.DynamicDrawUsage);}
      }
    }
    this.glassDamage?.setPanels([...bins.values()].flat(),p=>this.blenderAssets?.geometry(p,'world'));
    this.buildStaticContacts();this.applyQuality(true); this.shadowClock = 1;
  }

  buildStaticContacts(){
    if(this.staticContacts){this.scene.remove(this.staticContacts);this.staticContacts.dispose();this.staticContacts=null;}
    if(!this.contactShadows)return; // CPU-only renderer validation omits texture construction.
    const s=this.arena.info.size,parts=this.arena.blocks.filter(p=>!p.ground&&!p.destroyed&&!p.invisible&&p.h>.5&&p.w>.5&&p.d>.5&&Math.abs(p.y-p.h*.5)<.08&&Math.abs(p.x)<s-2&&Math.abs(p.z)<s-2);
    const mesh=new THREE.InstancedMesh(this.contactShadows.geometry,this.contactShadows.material,Math.max(1,parts.length));
    for(let i=0;i<parts.length;i++){const p=parts[i];compose(this.rawMatrix,p.x,visualGroundHeight(this.arena,p.x,p.z)+.006,p.z,p.w+1.1,p.d+1.1,1,0,-Math.PI/2,0);this.matrix.fromArray(this.rawMatrix);mesh.setMatrixAt(i,this.matrix);}
    mesh.count=parts.length;mesh.userData.parts=parts;mesh.renderOrder=1;mesh.computeBoundingSphere();mesh.instanceMatrix.needsUpdate=true;this.scene.add(mesh);this.staticContacts=mesh;
  }

  refreshDestroyed() {
    // Explosions update only affected prop instances; do not rebuild a whole map.
    let changed=false;
    for(const batch of this.worldBatches){const parts=batch.userData.parts;
      if(!parts||!parts.some(p=>p.destroyed&&!p.renderDestroyed))continue;
      if(batch.userData.blenderPair){
        const pair=batch.userData.blenderPair;
        for(const p of parts)if(p.destroyed)p.renderDestroyed=true;
        pair.near.userData.blenderSelection=pair.far.userData.blenderSelection=null;
        changed=true;continue;
      }
      changed=true;let count=0;
      for(const p of parts){if(p.destroyed){p.renderDestroyed=true;continue;}batch.setMatrixAt(count,this.partMatrix(p));batch.setColorAt(count,this.instanceColor(p,'world'));count++;}
      batch.count=count;batch.userData.fullCount=count;batch.userData.lodParts=null;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
      batch.computeBoundingSphere();batch.computeBoundingBox();
    }
    if(!changed)return;
    this.buildStaticContacts();this.lightingField?.invalidate(this.arena);if(this.sceneLOD)this.sceneLOD.clock=0;
    if(this.blenderAssets){this.blenderAssets.lodClock=0;this.blenderAssets.updateLOD(this,0);}
    this.shadowClock=1;
  }

  partGeometry(p, category) {
    const authored=this.blenderAssets?.geometry(p,category,p.blenderFar);
    if(authored)return authored;
    if(this.blenderAssets)throw Error(`Missing required Blender geometry: ${category}/${p.blenderMesh??p.blenderKind??p.mesh??'cube'}`);
    if (p.mesh === 'bevel') {
      const simpler = category === 'actor' ? this.geometry.bevelActor : category === 'world' ? this.geometry.bevelWorld : null;
      if (simpler) return simpler;
    }
    return this.geometry[p.mesh ?? 'cube'] ?? this.geometry.cube;
  }

  clearDynamic(map) {
    for (const entry of map.values()) { entry.alive = false; entry.mesh.parent?.remove(entry.mesh); entry.mesh.dispose(); }
    map.clear();
  }
  resetDynamic(map) { for (const entry of map.values()) { entry.used = 0; entry.matrixDirty = false; entry.colorDirty = false; } }

  addDynamic(map, group, p, category, parent, color) {
    this.blenderAssets?.prepare(p,category);
    const data = this.partMaterial(p);
    const geometryKey=this.blenderAssets?.key(p,category)??p.mesh??'cube';
    let binding = data.bindings?.[category], entry = binding?.entry;
    if (!entry?.alive || binding.map !== map || binding.geometryKey!==geometryKey) {
      const key = `${geometryKey}/${this.materialKey(p, category)}`;
      entry = map.get(key);
      if (!entry) {
        const capacity = 64;
        const mesh = new THREE.InstancedMesh(this.partGeometry(p, category), this.makeMaterial(p, category), capacity);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
        mesh.onBeforeShadow=()=>{this.shadowDraws=(this.shadowDraws??0)+1;};
        mesh.castShadow = category === 'actor'; mesh.receiveShadow = category === 'actor';
        group.add(mesh); entry = { mesh, used: 0, capacity, alive: true, version: 0, matrixDirty: false, colorDirty: false, slots: [] };
        map.set(key, entry);
      }
      binding = { map, entry, geometryKey, slot: -1, version: -1, matrix: new THREE.Matrix4(), pose: new Float64Array(9).fill(NaN), color: new THREE.Color(-1,-1,-1) };
      (data.bindings ?? (data.bindings = Object.create(null)))[category] = binding;
    }
    if (entry.used >= entry.capacity) {
      const old = entry.mesh, capacity = entry.capacity * 2;
      const mesh = new THREE.InstancedMesh(old.geometry, old.material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      if (old.instanceColor) { mesh.setColorAt(0, this.color); mesh.instanceColor.array.set(old.instanceColor.array); }
      mesh.frustumCulled = old.frustumCulled; mesh.castShadow = old.castShadow; mesh.receiveShadow = old.receiveShadow;
      mesh.onBeforeShadow=old.onBeforeShadow;
      group.remove(old); old.dispose(); group.add(mesh); entry.mesh = mesh; entry.capacity = capacity; entry.version++;
    }
    const pose = binding.pose, yaw = p.yaw ?? 0, pitch = p.pitch ?? 0, roll = p.roll ?? 0;
    const moved = pose[0] !== p.x || pose[1] !== p.y || pose[2] !== p.z || pose[3] !== p.w || pose[4] !== p.h || pose[5] !== p.d || pose[6] !== yaw || pose[7] !== pitch || pose[8] !== roll;
    if (moved) {
      this.partMatrix(p, binding.matrix);
      pose[0]=p.x; pose[1]=p.y; pose[2]=p.z; pose[3]=p.w; pose[4]=p.h; pose[5]=p.d; pose[6]=yaw; pose[7]=pitch; pose[8]=roll;
    }
    const slotChanged = entry.slots[entry.used] !== p || binding.slot !== entry.used || binding.version !== entry.version;
    if (parent || moved || slotChanged) {
      if (parent) this.matrix.multiplyMatrices(parent, binding.matrix); else this.matrix.copy(binding.matrix);
      entry.mesh.setMatrixAt(entry.used, this.matrix); entry.matrixDirty = true;
    }
    const tint = this.instanceColor(p, category, color);
    if (slotChanged || !binding.color.equals(tint)) {
      entry.mesh.setColorAt(entry.used, tint); binding.color.copy(tint); entry.colorDirty = true;
    }
    entry.slots[entry.used] = p; binding.slot = entry.used; binding.version = entry.version; entry.used++;
  }
  uploadDynamic(map) {
    for (const entry of map.values()) {
      entry.mesh.count = entry.used;
      if (!entry.used) continue;
      if (entry.matrixDirty) {
        entry.mesh.instanceMatrix.clearUpdateRanges(); entry.mesh.instanceMatrix.addUpdateRange(0, entry.used * 16);
        entry.mesh.instanceMatrix.needsUpdate = true;
      }
      if (entry.colorDirty && entry.mesh.instanceColor) {
        entry.mesh.instanceColor.clearUpdateRanges(); entry.mesh.instanceColor.addUpdateRange(0, entry.used * 3);
        entry.mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  applyQuality(force = false) {
    const q = QUALITY[this.quality] ?? QUALITY.medium;
    if (!force && this.appliedQuality === this.quality) return;
    this.appliedQuality = this.quality; this.renderer.shadowMap.enabled = q.shadow > 0;
    if(this.worldMaterialVariationDetail)this.worldMaterialVariationDetail.value=this.quality==='low'?0:1;
    if (q.shadow && this.sun.shadow.mapSize.x !== q.shadow) {
      this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(q.shadow, q.shadow); this.sun.shadow.needsUpdate = true;
    }
    for (const batch of this.worldBatches) if (batch.userData.leaf) {
      batch.count = Math.min(batch.userData.fullCount, Math.max(1, Math.floor(batch.userData.fullCount * q.foliage)));
      batch.castShadow = ['high','ultra'].includes(this.quality);
    }
    this.scene.environmentIntensity = this.quality === 'low' ? .48 : .58;
    const half = q.shadowHalf;
    const bias=shadowBias(q.shadow,q.shadowHalf);this.sun.shadow.bias=bias.bias;this.sun.shadow.normalBias=bias.normalBias;
    const anisotropy=Math.min(q.anisotropy,this.renderer.capabilities?.getMaxAnisotropy?.()??4);
    for(const t of this.textures??[])if(t.wrapS===THREE.RepeatWrapping&&t.anisotropy!==anisotropy){t.anisotropy=anisotropy;t.needsUpdate=true;}
    Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.shadowClock = 1;
  }

  resize() {
    const q = QUALITY[this.quality] ?? QUALITY.medium;
    const width = Math.max(2, this.canvas.clientWidth), height = Math.max(2, this.canvas.clientHeight);
    const size=framebufferSize(width,height,Math.min(window.devicePixelRatio || 1,q.dpr),q.scale*this.renderScale,q.pixels);
    const pixelWidth=size.width,pixelHeight=size.height;
    if (pixelWidth !== this.width || pixelHeight !== this.height) {
      this.width = pixelWidth; this.height = pixelHeight;
      this.renderer.setPixelRatio(1); this.renderer.setSize(pixelWidth, pixelHeight, false);
    }
    return width / height;
  }

  createEffectPool() {
    const geometry = new THREE.InstancedBufferGeometry();
    this.fxAttributes = {};
    for (const [name, size] of [['instancePosition', 3], ['instanceTint', 3], ['instanceSize', 2], ['instanceAlpha', 1], ['instanceKind', 1]]) {
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(FX_CAPACITY * size), size);
      attr.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute(name, attr); this.fxAttributes[name] = attr;
    }
    geometry.instanceCount = 0;
    const material = new THREE.ShaderMaterial({ uniforms:{uBreachEffects:{value:null}},vertexShader: billboardVertex, fragmentShader: billboardFragment,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass:true, toneMapped: true });
    this.fxAttributeList = Object.values(this.fxAttributes);
    this.fxMesh = new THREE.Mesh(geometry, material); this.fxMesh.frustumCulled = false; this.fxMesh.renderOrder = 3;
    this.scene.add(this.fxMesh);
    this.contactShadows = new THREE.InstancedMesh(new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color:0x000000,opacity:.38,transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits:-4, toneMapped: false }), 64);
    this.contactShadows.count = 0;
    this.contactShadows.frustumCulled = false; this.contactShadows.renderOrder = 1; this.scene.add(this.contactShadows);
  }

  createMuzzle() {
    this.muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffe9a9, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, transparent: true }));
    this.muzzle.visible = false; this.weaponRoot.add(this.muzzle);
  }

  installAuthoredEffects(image){
    const quad=this.blenderAssets.geometries.get('billboard__near');
    for(const key of ['position','uv'])this.fxMesh.geometry.setAttribute(key,quad.getAttribute(key));
    this.fxMesh.geometry.setIndex(quad.index);
    this.contactShadows.geometry.dispose();this.contactShadows.geometry=quad;
    const atlas=new THREE.Texture(image);atlas.needsUpdate=true;atlas.colorSpace=THREE.SRGBColorSpace;
    this.fxMesh.material.uniforms.uBreachEffects.value=atlas;this.textures.push(atlas);
    const tile=index=>{const map=new THREE.CanvasTexture(tileCanvas(image,2,index,256));map.colorSpace=THREE.SRGBColorSpace;this.textures.push(map);return map;};
    this.contactShadows.material.map=tile(2);this.contactShadows.material.color.setHex(0xffffff);this.contactShadows.material.needsUpdate=true;
    this.muzzle.material.map=tile(1);this.muzzle.material.needsUpdate=true;
    this.decalSystem.mesh.material.map=tile(3);this.decalSystem.mesh.material.needsUpdate=true;
    this.decalSystem.mesh.material.onBeforeCompile=()=>{};this.decalSystem.mesh.material.customProgramCacheKey=()=>'blender-impact-stamp-v1';
    this.decalSystem.mesh.geometry.dispose();this.decalSystem.mesh.geometry=quad.clone();
  }

  particle(position, kind, color, size, life, vx = 0, vy = 0, vz = 0) {
    const effect = this.effects[this.effectCursor++ % (QUALITY[this.quality] ?? QUALITY.medium).effects];
    effect.x = position.x; effect.y = position.y; effect.z = position.z;
    effect.kind = kind; effect.r = color[0]; effect.g = color[1]; effect.b = color[2];
    effect.seed = (this.effectCursor * .61803398875) % 1;
    effect.size = size; effect.life = effect.max = life; effect.vx = vx; effect.vy = vy; effect.vz = vz;
  }

  events(events, game) {
    for (const event of events) {
      const p = event.position ?? game.eye(game.player);
      if(event.type==='round'){this.explosionShock?.clear();this.environmentalFire?.clear();this.glassDamage?.clear();}
      if (event.type === 'shot') {
        this.glassDamage?.shot(event);
        if (event.source === game.player.id) {
          const aim = direction(game.player.yaw, game.player.pitch);
          // A killing Gun Game shot can promote the held weapon before its
          // event is consumed. Gas belongs to the firing event's weapon.
          const gasWeapon=this.muzzleGasWeapon??(this.muzzleGasWeapon={});
          gasWeapon.def=WEAPONS[event.weapon];gasWeapon.suppressed=event.suppressed;
          const gas=muzzleGas(gasWeapon,this.muzzleGasState??(this.muzzleGasState={}));
          this.particle({ x: p.x + aim.x * .85, y: p.y + aim.y * .85 - .13, z: p.z + aim.z * .85 },
            0, [.43, .46, .45], gas.size, gas.life, aim.x * gas.forward, gas.lift+aim.y*gas.forward, aim.z * gas.forward);
        } else if (event.end) {
          const source=game.actors.find(a=>a.id===event.source),start=source?operatorMuzzle(source,{def:WEAPONS[event.weapon],barrel:event.suppressed?1:0}):p;
          if(!event.suppressed)this.particle(start,2,[2.3,1.3,.45],.08,.045);
          for (let i = 1; i <= 3; i++) { const t = i * .15;
            this.particle({ x: lerp(start.x, event.end.x, t), y: lerp(start.y, event.end.y, t), z: lerp(start.z, event.end.z, t) },
              2, [1.8, 1.14, .38], .025, .055); }
        }
      } else if (event.type === 'impact') {
        const steel = ['steel','rust','dark','blue','brass'].includes(event.surface),glass=event.surface==='glass',water=event.surface==='water',wood=event.surface==='wood';
        const n=event.normal??{x:0,y:1,z:0},tint=steel?[2,1.2,.3]:glass?[.57,.76,.79]:water?[.49,.65,.71]:wood?[.46,.31,.17]:[.48,.46,.41];
        // Debris follows the actual struck face, with a separate chip/spark
        // silhouette. Glass and water avoid the old brown concrete dust puff.
        for (let i = 0; i < Math.min(6, event.value ?? 3); i++)this.particle(p,steel?2:glass||water?4:1,
          tint,water?.038:.018+Math.random()*.016,.16+Math.random()*.24,
          n.x*1.1+(Math.random()-.5)*1.7,n.y*1.1+Math.random()*1.5,n.z*1.1+(Math.random()-.5)*1.7);
        if(!glass&&!water)this.particle(p,0,wood?[.45,.33,.21]:[.47,.46,.43],.11,.6,n.x*.15,.22+n.y*.15,n.z*.15);
        if(!water)this.decalSystem?.add(p,n,event.surface,n.y>.9?visualGroundHeight(this.arena,p.x,p.z,p.y):p.y);
      } else if (event.type === 'blood') {
        for (let i = 0; i < Math.min(6, event.value ?? 4); i++) this.particle(p, 1, [.27, .025, .016], .035, .28,
          (Math.random() - .5) * 1.5, Math.random(), (Math.random() - .5) * 1.5);
      } else if (event.type === 'explosion') {
        this.refreshDestroyed();
        const floor=visualGroundHeight(this.arena,p.x,p.z,this.arena.floorAt(p,p.y));
        this.explosionShock?.add(p,event.value,floor);
        if(event.environmentalFire)this.environmentalFire?.add(p,floor);
        for (let i = 0; i < 30; i++) { const angle = Math.random() * 6.28, speed = Math.random() * 5;
          this.particle(p, i < 12 ? 2 : 0, i < 12 ? [2.4, .65, .08] : [.25, .24, .21],
            i < 12 ? .25 : .4, .45 + Math.random() * 1.1, Math.cos(angle) * speed, Math.random() * 4, Math.sin(angle) * speed); }
      } else if (event.type === 'flash') this.particle(p, 2, [3, 3, 2.7], .7, .12);
    }
  }

  writeBillboard(index, x, y, z, sizeX, sizeY, r, g, b, alpha, kind) {
    if (index >= FX_CAPACITY) return index;
    const a = this.fxAttributes;
    a.instancePosition.setXYZ(index, x, y, z); a.instanceTint.setXYZ(index, r, g, b);
    a.instanceSize.setXY(index, sizeX, sizeY); a.instanceAlpha.setX(index, alpha); a.instanceKind.setX(index, kind);
    return index + 1;
  }

  updateEffects(dt, game) {
    this.decalSystem?.update(dt);
    this.explosionShock?.update(dt,this.quality,this.eye);
    this.environmentalFire?.update(dt,this.quality,this.eye);this.glassDamage?.update();
    let count = 0, shadowCount = 0;
    for (const a of game.actors) if (!a.dead && a.grounded && shadowCount < 64) {
      compose(this.rawMatrix, a.x, visualGroundHeight(this.arena,a.x,a.z,a.y)+.006, a.z, 1.15, .82, 1, 0, -Math.PI / 2, 0); this.matrix.fromArray(this.rawMatrix);
      this.contactShadows.setMatrixAt(shadowCount++, this.matrix);
    }
    this.contactShadows.count = shadowCount;
    if (shadowCount) {
      this.contactShadows.instanceMatrix.clearUpdateRanges();
      this.contactShadows.instanceMatrix.addUpdateRange(0, shadowCount * 16);
      this.contactShadows.instanceMatrix.needsUpdate = true;
    }
    for (const e of this.effects) {
      if (e.life <= 0) continue;
      e.life -= dt; if (e.life <= 0) continue;
      e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
      if (e.kind > .5) e.vy -= dt * 8;
      if (e.y < .025) { e.y = .025; e.vy = 0; e.vx *= .8; e.vz *= .8; }
      const age = 1 - e.life / e.max, soft = e.kind < .5;
      const size = e.size * (soft ? 2 + age * 4 : 2);
      count = this.writeBillboard(count, e.x, e.y, e.z, size, e.kind === 3 ? size * .35 : size,
        e.r, e.g, e.b, Math.min(1, e.life * 7) * (soft ? .28 : 1), e.kind + ((e.seed ?? 0) + age * (soft ? .07 : .55)) % 1);
    }
    // Engine-owned cosmetic positions synchronize visible cases with landing
    // audio, including raised decks and delayed pump/bolt ejection.
    for(const c of game.casings??[]){
      if(c.delay>0)continue;
      const size=c.shell?.066:.048;
      count=this.writeBillboard(count,c.x,c.y,c.z,size,size*(c.shell?.38:.35),c.shell?.54:.63,c.shell?.19:.43,.12,Math.min(1,c.life*5),3+((c.life*.4+c.weapon*.13)%1));
    }
    count=grenadeSmokeBillboards(this,count,game.smokes);
    this.weatherField??={active:[],slots:Array.from({length:36},()=>({color:[0,0,0]}))};
    for(const p of weatherParticles(this,game.time??0,this.weatherField))count=this.writeBillboard(count,p.x,p.y,p.z,p.sizeX,p.sizeY,...p.color,p.alpha,p.kind+(p.yaw/(Math.PI*2)+1)%1);
    count=ambientDust(this,count,game.time??0);
    this.fxMesh.geometry.instanceCount = count;
    if (count) for (const attr of this.fxAttributeList) {
      attr.clearUpdateRanges(); attr.addUpdateRange(0, count * attr.itemSize); attr.needsUpdate = true;
    }
    for (const grenade of game.grenades) {
      const model = grenade.renderPart ?? (grenade.renderPart = part(0, 0, 0, .13, .17, .13, 'green', { mesh: 'sphere' }));
      model.x = grenade.x; model.y = grenade.y; model.z = grenade.z;
      this.addDynamic(this.actorBatches, this.scene, model, 'actor');
    }
  }

  updateActors(game, preparing = false) {
    this.resetDynamic(this.actorBatches);
    const player = game.player;
    for (const a of game.actors) {
      const actorDistance = distance(a, player);
      if (a.id === player.id || actorDistance > this.camera.far) continue;
      if (!preparing && this.frustum && actorDistance > 3) {
        // Include the held rifle and posed limbs, even if the body centre is
        // outside the view. Falling operators need room for their root lean.
        this.actorBounds.radius = a.dead ? 2.5 : 2;
        this.actorBounds.center.set(a.x, a.y + .9, a.z);
        if (!this.frustum.intersectsSphere(this.actorBounds)) continue;
      }
      const detailRange=(this.quality==='low'?24:38)*Math.tan(27.5*RAD)/Math.tan(this.camera.fov*RAD/2);
      a.renderLOD=actorDetailLevel(a.renderLOD,actorDistance,detailRange);const distant=!preparing&&a.renderLOD===1;
      // Keep the anatomical silhouette; sub-pixel seams, laces and lens rims
      // use the authored simplified meshes before whole equipment is omitted.
      const bodyPixels=this.quality==='low'?110:this.quality==='medium'?85:this.quality==='ultra'?60:70;
      const bodyRange=1.8*(this.height??600)/(2*Math.tan(this.camera.fov*RAD/2)*bodyPixels);
      a.renderBodyLOD=actorDetailLevel(a.renderBodyLOD,actorDistance,bodyRange);
      const bodyFar=!preparing&&a.renderBodyLOD===1;
      const death = actorDeathProgress(a,game.time);
      if (a.dead && death >= 1) continue;
      compose(this.rawMatrix, a.x, a.y, a.z, 1, 1, 1, -a.yaw); this.parentMatrix.fromArray(this.rawMatrix);
      const identity = identityFor(a, player, game.rules), parts = actorModel(a, game.time, identity);
      const nativeRange=this.quality==='low'?7:12;
      a.nativeWeaponVisible=!!this.blenderAssets&&actorDistance<(a.nativeWeaponVisible?nativeRange*1.18:nativeRange*.92);
      for (let i = 0; i < parts.length; i++) {
        const q = parts[i]; let color;
        if(this.blenderAssets){q.blenderBodyIndex=i<a.operatorBodyCount?i:undefined;q.blenderFar=distant||bodyFar;}
        if (q.hidden || a.nativeWeaponVisible&&q.carried || distant && !FAR_ACTOR_PARTS.has(i) && !q.actorFar) continue;
        // Navy/cyan versus warm charcoal/crimson is stable after sides switch and in FFA.
        if (q.surface === 'fabric') color = q.operatorNeutral ? q.color ?? [.65,.64,.52] : identity.cloth;
        if (q.surface === 'white' || q.teamBand) color = identity.band;
        this.addDynamic(this.actorBatches, this.scene, q, 'actor', this.parentMatrix, color);
      }
      if(a.nativeWeaponVisible){
        const groups=nativeOperatorWeapon(a,this.blenderAssets,game.time),mount=operatorWeaponMount(a,this.operatorWeaponPose);
        compose(this.rawMatrix,mount.x,mount.y,mount.z,1,1,1,mount.yaw,mount.pitch,mount.roll);this.operatorWeaponLocal.fromArray(this.rawMatrix);
        this.operatorWeaponMatrix.multiplyMatrices(this.parentMatrix,this.operatorWeaponLocal);
        for(const q of groups)if(!q.hidden)this.addDynamic(this.actorBatches,this.scene,q,'actor',this.operatorWeaponMatrix);
        for(const q of a.nativeWeaponAccessories)if(!q.hidden)this.addDynamic(this.actorBatches,this.scene,q,'actor',this.operatorWeaponMatrix);
      }
      // Sewn arm identifiers follow the rig. Retain small front/back vest tabs.
      const identifiers = a.renderIdentifiers ?? (a.renderIdentifiers = [
        part(0, 1.18, -.244, .13, .035, .006, 'white', { tile: -1 }),
        part(0, 1.18, .253, .13, .035, .006, 'white', { tile: -1 })]);
      for (let i = 0; i < identifiers.length; i++) { const q = identifiers[i];
        q.x=0;q.y=1.18-(a.animDuck??0);q.z=i===0?-.244:.253;q.yaw=q.pitch=q.roll=0;
        transformOperatorPose(a,q);q.blenderFar=distant||bodyFar;
        this.addDynamic(this.actorBatches, this.scene, q, 'actor', this.parentMatrix, identity.band);
      }
    }
    const rules = game.rules, id = rules.mode.id;
    if (['domination', 'sabotage', 'hardpoint','hill','frontline'].includes(id)) for (let i = 0; i < rules.points.length; i++) {
      if (id === 'sabotage' && i === 1 || ['hardpoint','hill','frontline'].includes(id) && i !== rules.activePoint) continue;
      const point = rules.points[i], color = point.owner === (rules.mode.teams?player.team:player.id) ? FRIEND : point.owner >= 0 ? ENEMY : [.8, .72, .38];
      const parts = point.renderParts ?? (point.renderParts = [
        part(point.x, point.y+.035, point.z, 4.7, .025, 4.7, 'dark', { mesh: 'tube', tile: -1, emissive: .18 }),
        part(point.x, point.y+1, point.z, .04, 2, .04, 'steel'),
        part(point.x + .3, point.y+1.65, point.z, .6, .38, .025, 'white', { tile: 9, rough:.92,objectiveBanner:true })]);
      for (let j = 0; j < parts.length; j++) this.addDynamic(this.actorBatches, this.scene, parts[j], 'actor', null, j === 1 ? undefined : color);
    }
    for (const tag of rules.tags ?? []) {
      const color = tag.team === player.team ? FRIEND : ENEMY;
      const q = tag.renderPart ?? (tag.renderPart = part(tag.x, tag.y, tag.z, .23, .34, .045, 'steel',
        { mesh: 'bevel', tile: -1, emissive: .35 }));
      q.y = tag.y + .55 + Math.sin(game.time * 3 + tag.id) * .07; q.yaw = game.time;
      this.addDynamic(this.actorBatches, this.scene, q, 'actor', null, color);
    }
    if(id==='ctf')for(const flag of rules.flags){
      const carrier=flag.carrier===null?null:game.actors.find(a=>a.id===flag.carrier&&!a.dead);
      const x=carrier?carrier.x+Math.cos(carrier.yaw)*.28:flag.x,z=carrier?carrier.z+Math.sin(carrier.yaw)*.28:flag.z,y=carrier?carrier.y+.65:flag.y,yaw=carrier?.yaw??0;
      const parts=flag.renderParts??(flag.renderParts=[
        part(x,y+.88,z,.075,1.76,.075,'steel',{mesh:'cylinder',tile:-1}),
        part(x+.31,y+1.43,z,.68,.43,.025,'white',{tile:9,rough:.92,objectiveBanner:true})
      ]);
      parts[0].x=x;parts[0].y=y+.88;parts[0].z=z;
      const flap=yaw+Math.sin(game.time*4+flag.team*2)*.13;
      for(const q of parts.slice(1)){q.x=x+.31*Math.cos(yaw);q.y=y+1.43;q.z=z+.31*Math.sin(yaw);q.yaw=flap;}
      const color=flag.team===player.team?FRIEND:ENEMY;
      for(let i=0;i<parts.length;i++)this.addDynamic(this.actorBatches,this.scene,parts[i],'actor',null,i===1?color:undefined);
    }
  }

  updateLighting(dt) {
    const eye = this.eye, sun = this.arena.info.sun;
    positionSun(this.sun,eye,sun);
    this.leafSun?.value.set(...sun).transformDirection(this.camera.matrixWorldInverse);
    // Three unshadowed bulbs at most, selected from authored interior fixtures at 5 Hz.
    this.lightClock = (this.lightClock ?? 0) - dt;
    if (this.lightClock <= 0) {
      this.lightClock = .2;
      const nearest = this.nearestLights, distances = this.lightDistances;
      nearest.fill(null); distances.fill(32 * 32);
      for (const p of this.lightPositions ?? []) { const d = (p.x - eye.x) ** 2 + (p.z - eye.z) ** 2;
        for (let i = 0; i < 3; i++) if (d < distances[i]) {
          for (let j = 2; j > i; j--) { distances[j] = distances[j - 1]; nearest[j] = nearest[j - 1]; }
          distances[i] = d; nearest[i] = p; break;
        }
      }
      this.weaponSunVisible=this.arena.visible?.(eye,{x:eye.x+sun[0]*70,y:eye.y+sun[1]*70,z:eye.z+sun[2]*70})!==false;
      this.weaponLampVisible=nearest[0]&&this.arena.visible?.(eye,nearest[0])!==false;
      for (let i = 0; i < this.interiorLights.length; i++) {
        const light = this.interiorLights[i], selected = nearest[i];
        this.roomLights?.assign(i,this.arena,selected);
        light.intensity = selected && this.quality !== 'low' ? 17 : 0;
        if (selected) light.position.set(selected.x, selected.y, selected.z);
      }
    }
    const inside = this.arena.indoors(eye), sky=this.lightingField?.sample(eye)??(inside?.38:1);
    if(this.environmentProbes?.interior){
      this.weaponRoomProbe=roomProbeSelected(this.weaponRoomProbe,sky);
      this.weaponScene.environment=this.weaponRoomProbe?this.environmentProbes.interior.texture:this.environment.texture;
    }
    // The hemisphere also stays upright in world space when the player pitches.
    this.weaponFill.position.set(0,1,0).transformDirection(this.camera.matrixWorldInverse);
    const lamp=this.nearestLights[0],local=this.weaponLocalLight;
    if(local){
      if(lamp)local.position.set(lamp.x,lamp.y,lamp.z).applyMatrix4(this.camera.matrixWorldInverse);
      const unobstructed=this.weaponLampVisible;
      local.intensity=lerp(local.intensity,unobstructed&&this.quality!=='low'?17:0,1-Math.exp(-dt*8));
    }
    this.weaponKeyLight.color.copy(this.sun.color);
    if(this.weaponScene.environmentRotation)orientWeaponEnvironment(this.weaponScene,this.camera);

    // Rotate view-model sunlight with the player's heading, so the gun belongs
    // to the world instead of wearing a camera-fixed studio highlight.
    this.target.set(this.sun.position.x - this.sun.target.position.x, sun[1]*65, this.sun.position.z - this.sun.target.position.z);
    this.target.transformDirection(this.camera.matrixWorldInverse);
    this.weaponKeyLight.position.copy(this.target).multiplyScalar(5);
    this.weaponScene.environmentIntensity = lerp(this.weaponScene.environmentIntensity, .48+sky*1.0, clamp(dt * 5, 0, 1));
    this.weaponFill.intensity = lerp(this.weaponFill.intensity, .8+sky*1.1, clamp(dt * 5, 0, 1));
    this.weaponKeyLight.intensity = lerp(this.weaponKeyLight.intensity, this.weaponSunVisible===false ? .08 : this.sun.intensity, clamp(dt * 5, 0, 1));
    const q = QUALITY[this.quality] ?? QUALITY.medium;
    if (shadowDue(this,dt,q.shadowHz)) { this.renderer.shadowMap.needsUpdate = true; this.sun.shadow.needsUpdate = true;
    }
  }

  async prepareMatch(game) {
    if(this.lost||!this.loaded)throw new Error('Graphics are not ready. Reload to retry.');
    this.applyQuality();const aspect=this.resize(),p=game.player,slot=p.slot;
    this.updateActors(game,true);this.uploadDynamic(this.actorBatches);
    if(this.lightingField?.texture.value)this.renderer.initTexture?.(this.lightingField.texture.value);
    try{
      // Both slots and the populated world are ready before controls activate.
      for(let i=0;i<p.weapons.length;i++){
        p.slot=i;this.prepareWeapon(game,aspect,false);
        if(this.renderer.compileAsync)await this.renderer.compileAsync(this.weaponScene,this.weaponCamera);
      }
      if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);
      if(this.lost)throw new Error('Graphics context unavailable');
    }finally{p.slot=slot;this.prepareWeapon(game,aspect,false);}
  }

  prepareWeapon(game, aspect, menu) {
    const p = game.player, w = p.weapon;
    const key = `${w.def.id}/${w.optic}/${w.barrel}/${w.grip}/${w.magazine}/${w.ammunition}`;
    if (key !== this.weaponKey) {
      this.weaponKey = key; this.weaponParts = weaponModel(w,{reloadExchange:true});this.blenderWeaponGroups=this.blenderAssets?.weaponGroups(this.weaponParts,w.def.id);this.blenderHandGroups=this.blenderAssets?.handGroups(this.weaponParts,w.def.id); this.clearDynamic(this.weaponBatches);
    }
    animateWeaponParts(this.weaponParts, w, p, game.time, menu);
    this.resetDynamic(this.weaponBatches);
    if(this.blenderWeaponGroups){
      syncBlenderWeapon(this.blenderWeaponGroups,this.weaponParts);
      for(const q of this.blenderWeaponGroups)if(!q.hidden)this.addDynamic(this.weaponBatches,this.weaponRoot,q,'weapon');
    }
    if(this.blenderHandGroups&&!menu){syncBlenderWeapon(this.blenderHandGroups,this.weaponParts);for(const q of this.blenderHandGroups)if(!q.hidden)this.addDynamic(this.weaponBatches,this.weaponRoot,q,'weapon');}
    for (let i=this.blenderWeaponGroups?this.weaponParts.coreCount:0;i<this.weaponParts.length;i++){
      const q=this.weaponParts[i];if(this.blenderWeaponGroups&&q.reloadNativeCore)continue;if((this.blenderHandGroups||menu)&&/^(rightHand|supportHand|pumpHand)$/.test(q.tag??''))continue;if(!q.hidden)this.addDynamic(this.weaponBatches,this.weaponRoot,q,'weapon');
    }
    this.uploadDynamic(this.weaponBatches);
    const pose = weaponPose(p, game.time, this.settings.motion !== false, menu, this.weaponPoseState ?? (this.weaponPoseState = {}));
    this.weaponRoot.position.set(pose.x, pose.y, pose.z);
    this.weaponRoot.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ'); this.weaponRoot.scale.setScalar(pose.scale);
    const muzzle = this.weaponParts.muzzle;
    this.muzzle.position.set(muzzle.x, muzzle.y, muzzle.z);
    const flash=muzzleFlash(w,menu,this.muzzleFlashState??(this.muzzleFlashState={}));
    this.muzzle.visible = flash.visible;
    this.muzzle.scale.set(flash.width, flash.height, 1);this.muzzle.material.opacity=flash.opacity;this.muzzle.material.rotation=flash.rotation;
    this.muzzleLight.intensity = flash.light;
    this.muzzleLight.position.copy(this.muzzle.position); this.weaponRoot.localToWorld(this.muzzleLight.position);
    this.weaponCamera.aspect = aspect; this.weaponCamera.updateProjectionMatrix();
  }

  renderWeapon(game, aspect, menu) {
    this.prepareWeapon(game,aspect,menu);
    this.renderer.clearDepth(); this.renderer.render(this.weaponScene, this.weaponCamera);
  }

  render(game, dt, menu = false, elapsed = dt) {
    if (this.lost || !this.loaded) return;
    this.frames++; this.lastFPS += elapsed;
    if (this.lastFPS >= .6) { this.fps = Math.round(this.frames / this.lastFPS); this.frames = 0; this.lastFPS = 0; }
    this.applyQuality(); const aspect = this.resize(), p = game.player;
    if(menu)p.weaponObstruction=0;else updateWeaponClearance(this.weaponClearanceState??(this.weaponClearanceState={}),this.arena,p,game.paused?0:dt);
    let yaw = p.yaw, pitch = p.pitch, fov;
    if (menu) {
      const t = game.time * .04; this.eye.x = 15 + Math.sin(t) * 2; this.eye.y = 6.5; this.eye.z = 25;
      this.target.set(-4, 2, -8); fov = 55;
    } else {
      const eye = game.eye(p), speed = Math.hypot(p.vx, p.vz);
      const bob = cameraBob(this.cameraBobState??(this.cameraBobState={}),speed,p.grounded,p.ads,game.paused?0:dt,this.settings.motion!==false);
      if (this.cameraY === null) this.cameraY = eye.y;
      this.cameraY = lerp(this.cameraY, eye.y, clamp(dt * 18, 0, 1));
      this.eye.x = eye.x; this.eye.y = lerp(this.cameraY, eye.y, p.ads) + bob - p.landKick -
        (p.dead ? Math.min(1.2, (3 - p.respawnLeft) * .9) : 0); this.eye.z = eye.z;
      pitch += this.settings.motion !== false ? p.visualKick * .10 * (1 - p.ads) : 0;
      const d = direction(yaw, pitch); this.target.set(this.eye.x + d.x, this.eye.y + d.y, this.eye.z + d.z);
      const horizontal=movementFov(this.movementFovState??(this.movementFovState={}),p,this.settings.fov??80,game.paused?0:dt,this.settings.motion!==false);
      fov = verticalFov(aimFov(horizontal, p.weapon, p.ads), aspect) / RAD;
    }
    this.weatherYaw=yaw;this.weatherPitch=pitch;
    this.camera.position.set(this.eye.x, this.eye.y, this.eye.z); this.camera.lookAt(this.target);
    this.camera.fov = fov; this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.worldVP.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum?.setFromProjectionMatrix(this.worldVP);
    this.lightingField?.update();this.sceneLOD?.update(this,dt);this.blenderAssets?.updateLOD(this,dt);
    this.windTime.value = game.time;
    this.updateActors(game); this.updateEffects(menu || game.paused ? 0 : dt, game); this.uploadDynamic(this.actorBatches);
    this.updateLighting(dt);
    this.shadowDraws=0;
    const renderStart=performance.now();this.profiler?.begin();
    this.renderer.info.reset(); this.renderer.setRenderTarget(null); this.renderer.clear(true, true, false);
    this.renderer.render(this.scene, this.camera);this.renderPasses=1;
    // A magnified optic sees only the world scene. The shared HUD draws the clear reticle.
    if (!p.dead && (menu || !scopeVisible(p))) {this.renderWeapon(game, aspect, menu);this.renderPasses++;}
    this.profiler?.end();if(this.profiler)this.profiler.renderCpuMs=performance.now()-renderStart;
    if(this.shadowDraws)this.lastShadowDraws=this.shadowDraws;
    this.drawCalls = this.renderer.info.render.calls;this.triangles=this.renderer.info.render.triangles??0;this.shaderPrograms=this.renderer.info.programs?.length??0;
    return true;
  }

  project(point) {
    this.projected.set(point.x, point.y, point.z, 1).applyMatrix4(this.worldVP);
    if (this.projected.w <= 0) return null;
    return { x: this.projected.x / this.projected.w * .5 + .5,
      y: .5 - this.projected.y / this.projected.w * .5 };
  }

  dispose() {
    this.blenderAssets?.dispose();
    this.profiler?.dispose();this.lightingField?.dispose();this.decalSystem?.dispose();
    this.explosionShock?.dispose();
    this.environmentalFire?.dispose();this.glassDamage?.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.clearDynamic(this.actorBatches); this.clearDynamic(this.weaponBatches);
    for (const batch of this.worldBatches) batch.dispose();
    for (const geometry of Object.values(this.geometry)) geometry.dispose();
    for (const mat of this.materials.values()) mat.dispose();
    for (const mat of this.depthMaterials.values()) mat.dispose();
    for (const texture of this.textures) texture.dispose();
    this.fxMesh.geometry.dispose(); this.fxMesh.material.dispose();
    this.staticContacts?.dispose();
    this.contactShadows.geometry.dispose(); this.contactShadows.material.dispose(); this.contactShadows.dispose();
    this.muzzle.material.dispose(); this.environmentProbes?.dispose(); this.sun.shadow.map?.dispose(); this.renderer.dispose();
  }
}
