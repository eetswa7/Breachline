// Original, looped environmental beds. Each map owns a stereo exterior and an
// interior layer. The two loops share a crossfade, with no per-emitter graph.
const SAMPLE_RATE = 11025;
const LOOP_SECONDS = 12;
const SEAM_SECONDS = .32;
const TAU = 2 * Math.PI;

const locations = [
  { wind: .29, traffic: .38 },                    // Old Quarter
  { wind: .22, machinery: .57, motorHz: 58 },    // Foundry
  { wind: .77, sand: .22 },                      // Dustline
  { wind: .54, birds: .17 },                     // Relay
  { wind: .31, surf: .78 },                      // Breakwater
  { wind: .64, birds: .12 },                     // Citadel
  { wind: .24, machinery: .42, motorHz: 46 },    // Switchyard
  { wind: .25, birds: .45, insects: .27 },       // Canopy
  { wind: .79, sand: .07 },                      // Frostline
  { wind: .54, sand: .28, machinery: .15, motorHz: 42 }, // Iron Quarry
  { wind: .22, traffic: .57 },                    // Skybridge
  { wind: .25, rain: .87, insects: .10 },         // Monsoon
  { wind: .24, machinery: .68, motorHz: 51 },    // Emberworks
  { wind: .27, traffic: .70 },                    // Crossfire District
  { wind: .33, machinery: .71, motorHz: 62 },    // Blacksite
  { wind: .30, insects: .36, birds: .20 }         // Test neighbourhood
];

function makeBed(context, profile, seed, indoor) {
  const length = LOOP_SECONDS * SAMPLE_RATE;
  const seamLength = Math.round(SEAM_SECONDS * SAMPLE_RATE);
  const buffer = context.createBuffer(2, length, SAMPLE_RATE);
  const { wind = 0, traffic = 0, machinery = 0, motorHz = 55, surf = 0,
    sand = 0, rain = 0, birds = 0, insects = 0 } = profile;
  const motor = (indoor ? .21 : 0) + machinery * (indoor ? 1.1 : .58);
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    let random = seed + channel * 7351;
    let bass = 0, low = 0, mid = 0;
    for (let i = 0; i < length + seamLength; i++) {
      const t = i / SAMPLE_RATE;
      random ^= random << 13;
      random ^= random >>> 17;
      random ^= random << 5;
      const noise = (random >>> 0) / 2147483648 - 1;
      bass += .006 * (noise - bass);
      low += .025 * (noise - low);
      mid += .19 * (noise - mid);
      const gust = .65 + .23 * Math.sin(t * 1.7 + channel * .5) + .12 * Math.sin(t * 3.1);
      const wave = .48 + .38 * Math.sin(t * 1.38 + channel * .4) + .14 * Math.sin(t * 2.56);
      const windNoise = wind * gust * (1.5 * low + .23 * mid);
      const waveNoise = surf * wave * (.8 * low + .48 * mid);
      const rainNoise = rain * (indoor ? .46 * mid : .42 * mid + .11 * noise);
      const grit = sand * gust * (mid - low) * .36;
      const road = traffic * (1.8 * bass + .3 * low) * (.68 + .32 * Math.sin(t * .93 + channel));
      const hum = motor * ((.060 * Math.sin(TAU * motorHz * t) + .031 * Math.sin(TAU * (2 * motorHz + .8) * t))
        * (.84 + .16 * Math.sin(t * 3.4)) + 1.05 * bass + .14 * mid);
      const insect = insects * (mid - low) * (.8 + .2 * Math.sin(t * 37 + channel)) * .21;
      // Stagger short, curved contact calls across the stereo field.
      const call = (t + channel * 1.5 + seed * .001) % 4.9;
      const bird = birds && call < .26 ? birds * .08 * Math.sin(Math.PI * call / .26) ** 2
        * Math.sin(TAU * (1440 * call + 3800 * call * call - 10000 * call ** 3)) : 0;
      const outside = windNoise + waveNoise + grit + road + insect + bird;
      const sample = hum + rainNoise + outside * (indoor ? .12 : 1);
      // Blend a continuation of the tail into the loop head. The waveform
      // and slope are continuous across the scheduled buffer boundary.
      if (i < length) samples[i] = sample;
      else {
        const head = i - length;
        const mix = .5 - .5 * Math.cos(Math.PI * head / (seamLength - 1));
        samples[head] = sample * (1 - mix) + samples[head] * mix;
      }
    }
  }
  return buffer;
}

export class Ambience {
  prepare(context, map) {
    if (this.map === map && this.context === context) return;
    this.stop();
    this.map = map;
    this.context = context;
    const profile = locations[map] ?? locations[0];
    this.buffers = [false, true].map(indoor => makeBed(context, profile, 8311 + (map ?? 0) * 7919, indoor));
  }

  update(context, destination, map, level, enclosure) {
    if (level <= 0) { this.stop(); return; }
    this.prepare(context, map);
    const now = context.currentTime;
    if (!this.layers) {
      this.layers = this.buffers.map(buffer => {
        const source = context.createBufferSource(), gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(destination);
        return { source, gain };
      });
      for (const { source } of this.layers) source.start();
    }
    const target = [level * .36 * (1 - enclosure), level * .29 * enclosure];
    for (let i = 0; i < target.length; i++) {
      if (target[i] !== this.target?.[i]) this.layers[i].gain.gain.setTargetAtTime(target[i], now, .16);
    }
    this.target = target;
  }

  stop() {
    for (const { source, gain } of this.layers ?? []) {
      source.stop();
      source.disconnect();
      gain.disconnect();
    }
    this.layers = null;
    this.target = null;
  }
}
