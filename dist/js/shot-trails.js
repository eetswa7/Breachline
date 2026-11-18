import * as THREE from '../vendor/three.module.min.js';

const CAPACITY = 48;
const SPEED = 390; // Presentation only. The simulation has resolved the hit.
const tailLife = .033;

const vertexShader = `
attribute vec3 trailStart;
attribute vec3 trailEnd;
attribute vec2 trailStyle;
varying vec2 vUv;
varying float vAlpha;
void main(){
  vUv=uv;
  vAlpha=trailStyle.y;
  vec3 a=(modelViewMatrix*vec4(trailStart,1.0)).xyz;
  vec3 b=(modelViewMatrix*vec4(trailEnd,1.0)).xyz;
  if(a.z>-.055&&b.z>-.055){
    gl_Position=vec4(2.0,2.0,2.0,1.0);
    return;
  }
  if(a.z>-.055)a=mix(a,b,(-.055-a.z)/(b.z-a.z));
  if(b.z>-.055)b=mix(b,a,(-.055-b.z)/(a.z-b.z));
  vec2 projected=b.xy/max(.055,-b.z)-a.xy/max(.055,-a.z);
  vec2 normal=length(projected)>.0001?normalize(vec2(-projected.y,projected.x)):vec2(1.0,0.0);
  vec3 point=mix(a,b,uv.x);
  point.xy+=normal*position.y*trailStyle.x;
  gl_Position=projectionMatrix*vec4(point,1.0);
}`;

const fragmentShader = `
varying vec2 vUv;
varying float vAlpha;
void main(){
  float width=1.0-abs(vUv.y*2.0-1.0);
  float taper=smoothstep(.0,.34,vUv.x)*(1.0-smoothstep(.87,1.0,vUv.x));
  float alpha=width*width*taper*vAlpha;
  if(alpha<.015)discard;
  gl_FragColor=vec4(mix(vec3(1.2,.39,.12),vec3(2.6,1.81,.89),width),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class ShotTrails {
  constructor(scene) {
    this.scene = scene;
    this.entries = Array.from({ length: CAPACITY }, () => ({ life: 0 }));
    this.cursor = 0;
    this.shots = new Map();
    this.geometry = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    for (const attribute of ['position', 'uv']) this.geometry.setAttribute(attribute, quad.getAttribute(attribute));
    this.geometry.setIndex(quad.index);
    quad.dispose();
    this.attributes = [
      ['trailStart', 3], ['trailEnd', 3], ['trailStyle', 2]
    ].map(([name, size]) => {
      const attribute = new THREE.InstancedBufferAttribute(new Float32Array(size * CAPACITY), size);
      attribute.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute(name, attribute);
      return attribute;
    });
    this.geometry.instanceCount = 0;
    this.mesh = new THREE.Mesh(this.geometry, new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  add(event, own, quality) {
    if(event.suppressed || !event.position || !event.end) return;
    const fired = (this.shots.get(event.source) ?? 0) + 1;
    this.shots.set(event.source, fired);
    const cadence = own ? (quality === 'low' ? 8 : 5) : (quality === 'low' ? 6 : 3);
    if(fired % cadence !== 1) return;
    const a = event.position, b = event.trailEnd ?? event.end;
    const x = b.x - a.x, y = b.y - a.y, z = b.z - a.z, length = Math.hypot(x, y, z);
    const offset = own ? 4 : 1.1;
    if(!Number.isFinite(length) || length <= offset + .8) return;
    const dx = x / length, dy = y / length, dz = z / length;
    const travel = Math.min(length - offset, 118);
    const trail = this.entries[this.cursor++ % CAPACITY];
    trail.x = a.x + dx * offset;
    trail.y = a.y + dy * offset;
    trail.z = a.z + dz * offset;
    Object.assign(trail, { dx, dy, dz, age: 0, travel, life: travel / SPEED + tailLife, own });
  }

  update(dt) {
    const [start, end, style] = this.attributes;
    let count = 0;
    for (const e of this.entries) {
      if(e.life <= 0) continue;
      e.age = Math.min(e.life, e.age + dt);
      const head = Math.min(e.travel, Math.max(.5, e.age * SPEED));
      const tail = Math.max(0, head - Math.min(e.own ? 2.6 : 4.3, e.travel * .78));
      const alpha = Math.min(1, (e.life - e.age) / tailLife) * (e.own ? .36 : .68);
      if(e.age >= e.life) { e.life = 0; continue; }
      start.setXYZ(count, e.x + e.dx * tail, e.y + e.dy * tail, e.z + e.dz * tail);
      end.setXYZ(count, e.x + e.dx * head, e.y + e.dy * head, e.z + e.dz * head);
      style.setXY(count++, e.own ? .035 : .047, alpha);
    }
    this.geometry.instanceCount = count;
    if(count) for (const attribute of this.attributes) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  clear() {
    for (const entry of this.entries) entry.life = 0;
    this.geometry.instanceCount = 0;
    this.shots.clear();
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.mesh.material.dispose();
  }
}
