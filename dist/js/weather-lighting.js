// Sun, cloud and haze describe the same air mass. Baked ground irradiance
// remains authoritative where available. Colors below are authored in sRGB.
const clear = {
  sunColor: 0xffeacd, sunPower: 3.1, fillPower: 1.75, fogNear: 49, fogFar: 165,
  haze: .073, hazeColor: [1, .87, .68],
  cloudBase: .05, cloudWeight: .68, cloudTint: [.88, .94, 1], cloudLight: 1.0,
  cloudStretch: 1, solarPower: 21, solarFocus: 1120, coronaPower: .24
};
const marine = {
  ...clear, sunColor: 0xfff1d8, sunPower: 3.0, fillPower: 1.88,
  fogNear: 35, fogFar: 138, haze: .11, hazeColor: [.91, .91, .84],
  cloudBase: .12, cloudWeight: .76, cloudTint: [.89, .96, 1],
  cloudStretch: 1.25, coronaPower: .28
};
const dry = {
  ...clear, sunColor: 0xffdfb5, sunPower: 3.42, fillPower: 1.74,
  fogNear: 42, fogFar: 151, haze: .16, hazeColor: [1, .72, .47],
  cloudBase: .015, cloudWeight: .36, cloudTint: [1, .88, .72], cloudStretch: .94,
  solarPower: 25, coronaPower: .40
};
const highland = {
  ...clear, sunColor: 0xdeeeff, sunPower: 2.0, fillPower: 2.42,
  fogNear: 48, fogFar: 147, haze: .065, hazeColor: [.79, .87, .98],
  cloudBase: .46, cloudWeight: .48, cloudTint: [.84, .93, 1], cloudLight: .72,
  cloudStretch: 1.19, solarPower: 1.5, solarFocus: 45, coronaPower: .33
};
const overcast = {
  ...highland, sunColor: 0xdce9f4, sunPower: 1.63, fillPower: 2.58,
  fogNear: 40, fogFar: 137, haze: .066, hazeColor: [.79, .86, .90],
  cloudBase: .57, cloudWeight: .43, cloudTint: [.79, .88, .97], cloudLight: .69,
  cloudStretch: 1.08, solarPower: .68, solarFocus: 32, coronaPower: .18
};
const storm = {
  ...overcast, sunColor: 0xaac9d3, sunPower: 1.31, fillPower: 2.46,
  fogNear: 28, fogFar: 104, haze: .18, hazeColor: [.59, .78, .83],
  cloudBase: .78, cloudWeight: .22, cloudTint: [.63, .81, .89], cloudLight: .59,
  cloudStretch: .82, solarPower: .16, solarFocus: 16, coronaPower: .12
};

const maps = [
  { ...marine, cloudOffset: .17 },
  { ...overcast, cloudOffset: .29, cloudTint: [.83, .89, .93] },
  { ...dry, cloudOffset: .43, cloudWeight: .20 },
  { ...clear, cloudOffset: .53, cloudWeight: .80 },
  { ...marine, cloudOffset: .69, fogNear: 31, cloudWeight: .85 },
  { ...highland, cloudOffset: .75, cloudStretch: .90 },
  { ...overcast, cloudOffset: .87, cloudLight: .77 },
  { ...clear, cloudOffset: .05, cloudTint: [.91, .97, .93], solarPower: 17 },
  { ...highland, cloudOffset: .12, fogNear: 36, cloudTint: [.91, .96, 1], cloudLight: .86 },
  { ...dry, cloudOffset: .25, cloudTint: [1, .82, .68], haze: .19 },
  { ...clear, cloudOffset: .36, cloudWeight: .48 },
  { ...storm, cloudOffset: .54 },
  { ...dry, cloudOffset: .63, sunPower: 3.0, hazeColor: [1, .69, .44] },
  { ...marine, cloudOffset: .76, fogFar: 169 },
  { ...overcast, cloudOffset: .88, cloudLight: .64, hazeColor: [.73, .82, .93] },
  { ...dry, cloudOffset: .96, cloudWeight: .22, haze: .10 }
];

export function weatherLighting(info) {
  const authored = maps[info.id];
  if (authored) return authored;
  if (info.weather === 'rain') return storm;
  if (info.weather === 'overcast') return overcast;
  return clear;
}
