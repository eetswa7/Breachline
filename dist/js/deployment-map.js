// The briefing draws the same floorplan, spawn points and objectives used by
// the match. It renders once per selection, independently of the 3D preview.
const INSET=27;
export function tacticalMapPosition(canvas,arena,u,v){
 const scale=(canvas.width-2*INSET)/(arena.info.size*2);
 return {x:(u-.5)*canvas.width/scale,y:0,z:(v-.5)*canvas.width/scale};
}
export function drawDeploymentMap(canvas, arena, rules, tactical=null) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const size = arena.info.size, width = canvas.width, inset = INSET;
  const scale = (width - 2 * inset) / (size * 2);
  const x = value => width / 2 + value * scale;
  const z = value => width / 2 + value * scale;
  context.clearRect(0, 0, width, width);
  context.fillStyle = '#141f21';
  context.fillRect(0, 0, width, width);
  context.strokeStyle = '#5b77763b';
  context.lineWidth = 1;
  context.beginPath();
  for (let position = -size; position <= size; position += 10) {
    context.moveTo(x(position), inset);
    context.lineTo(x(position), width - inset);
    context.moveTo(inset, z(position));
    context.lineTo(width - inset, z(position));
  }
  context.stroke();
  context.strokeStyle = '#81999966';
  context.strokeRect(inset, inset, width - 2 * inset, width - 2 * inset);

  // Room footprints precede their wall segments so open passages remain
  // visible from above. Raised routes receive their own midtone.
  for (const rooms of [true, false]) {
    for (const block of arena.blocks) {
      if (block.ground || block.destroyed || block.invisible || block.h < .20 ||
          rooms !== Boolean(block.roof && block.room)) continue;
      context.fillStyle = rooms ? '#365154' : block.catwalk ? '#688487' :
        block.y > 2.7 ? '#4a6669' : '#859b9b';
      const w = Math.max(1, block.w * scale), d = Math.max(1, block.d * scale);
      context.fillRect(x(block.x) - w / 2, z(block.z) - d / 2, w, d);
    }
  }
  for (const spawn of arena.spawns) {
    context.fillStyle = rules.mode.teams ? (spawn.team ? '#f1a78d' : '#9fe4f5') : '#d6e0d7';
    context.beginPath();
    context.arc(x(spawn.x), z(spawn.z), rules.mode.teams ? 3 : 2.5, 0, 2 * Math.PI);
    context.fill();
  }

  if (rules.convoy) {
    context.beginPath();
    context.strokeStyle = '#ffd46b';
    context.lineWidth = 4;
    rules.convoy.route.forEach((point,index) => {
      if(index)context.lineTo(x(point.x),z(point.z));
      else context.moveTo(x(point.x),z(point.z));
    });
    context.stroke();
  }
  const mode = rules.mode.id;
  const points = rules.raid ? [...rules.raid.caches.filter(cache=>!tactical||!cache.opened),{...rules.raid.exit,name:'X',color:'#80f4c6'}] : mode === 'ctf' ? rules.flags.map(flag => ({
    ...flag, name: flag.team ? 'R' : 'B', color: flag.team ? '#f1a78d' : '#9fe4f5'
  })) : ['domination','warfront', 'frontline', 'hardpoint', 'hill', 'sabotage'].includes(mode) ?
    rules.points.filter((_, i) => mode !== 'sabotage' || i === 0 || i === 2) : [];
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 17px system-ui, sans-serif';
  for (const point of points) {
    const px = x(point.x), pz = z(point.z);
    context.fillStyle = '#0b1316';
    context.strokeStyle = point.color ?? (tactical&&point.contested?'#ffca73':tactical&&point.owner>=0?point.owner===tactical.game.player.team?'#80ddf1':'#f1a78d':'#d9e894');
    context.lineWidth = 2;
    context.beginPath();
    context.arc(px, pz, 13, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    context.fillStyle = context.strokeStyle;
    context.fillText(point.name, px, pz);
  }
  if(tactical){
    const {game,mark}=tactical,player=game.player;
    const dot=(point,color,radius)=>{
      context.fillStyle=color;context.beginPath();context.arc(x(point.x),z(point.z),radius,0,Math.PI*2);context.fill();
    };
    for(const actor of game.actors){
      if(actor.dead)continue;
      if(actor===player)dot(actor,'#fff4ad',5);
      else if(rules.mode.teams&&actor.team===player.team)dot(actor,'#80ddf1',4);
      else if(game.time-actor.lastShot<1.8||game.sensorDetects(actor))dot(actor,'#ff886d',3);
    }
    if(rules.convoy)dot(rules.convoy.position,'#ffd46b',5);
    if(rules.raid?.stash)dot(rules.raid.stash,'#ffd46b',5);
    if(rules.payload?.position)dot(rules.payload.position,'#ffd46b',5);
    if(rules.droppedCharge)dot(rules.droppedCharge,'#ffd46b',5);
    const selected=mark??game.activeSquadOrder?.point;
    if(selected){
      context.strokeStyle='#a9ffc0';context.lineWidth=3;context.strokeRect(x(selected.x)-7,z(selected.z)-7,14,14);
    }
  }
  context.font = '13px system-ui, sans-serif';
  context.fillStyle = '#c3d5d3';
  context.fillText('N', width / 2, 13);
}
