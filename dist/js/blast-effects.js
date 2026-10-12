import {clamp} from './math.js?v=61';

// A shallow, depth-tested dust front expands in the blast plane. It reuses the
// existing two-triangle effect batch and never distorts the whole framebuffer.
export function emitBlast(renderer, event, random = Math.random) {
  const p = event.position;
  if (!p || ![p.x,p.y,p.z].every(Number.isFinite)) return;
  const radius = clamp(Number.isFinite(event.value) ? event.value : 8, 1, 16);
  const low = renderer.quality === 'low', count = low ? 13 : 25;
  renderer.particle({x:p.x,y:p.y+.045,z:p.z},8,[.66,.61,.51],radius*.5,.48);
  renderer.particle({x:p.x,y:p.y+.22,z:p.z},9,[2.1,.42,.055],.7,.26,0,.8,0);
  // The brief hot core and rising smoke have separate lifetimes; debris moves
  // outwards rather than making an undifferentiated cloud of sparks.
  for (let i = 0; i < count; i++) {
    const angle = (i+.25+random()*.5)*Math.PI*2/count;
    const hot = i < (low ? 4 : 7), debris = !hot && i % 3 === 0;
    const speed = hot ? .7+random()*2 : debris ? 3+random()*4 : .5+random()*1.6;
    const kind = hot ? 2 : debris ? 1 : 0;
    renderer.particle(p,kind,hot?[2.7,1.05,.19]:debris?[.46,.40,.31]:[.30,.29,.27],
      hot?.19:debris?.038:.24+random()*.13,
      hot?.12+random()*.15:debris?.55+random()*.4:.8+random()*.8,
      Math.cos(angle)*speed,hot?1+random()*2:debris?2+random()*4:.65+random()*1.2,
      Math.sin(angle)*speed);
  }
}

export function blastFront(effect) {
  const age = clamp(1-effect.life/effect.max,0,1);
  return {size:effect.size*(.12+3.7*(1-Math.pow(1-age,2))),alpha:.72*Math.pow(1-age,2)};
}
