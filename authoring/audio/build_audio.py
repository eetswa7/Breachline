"""Deterministic original sound production, with no third-party samples.

Editable weapon voicing, pressure waveforms, band-limited turbulence, granular
foley and short modal mechanical contacts are rendered offline. Gameplay only
plays decoded AAC buffers; none of these filters run in the game audio thread.
"""
from pathlib import Path
import concurrent.futures, hashlib, json, math, shutil, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt

RATE = 44100
root = Path('dist/assets/audio'); root.mkdir(parents=True, exist_ok=True)
work = Path(tempfile.mkdtemp(prefix='breachline-sound-'))
weapons = json.loads(Path('authoring/audio/weapons.json').read_text())
voicing = json.loads(Path('authoring/audio/weapon-voicing.json').read_text())
sounds = []

def filtered(x, hz, mode='lowpass', order=2):
    return sosfilt(butter(order, hz, fs=RATE, btype=mode, output='sos'), x)

def noise(rng, count, hz, mode='bandpass'):
    x = filtered(rng.normal(0, 1, count), hz, mode)
    return x / max(.05, np.std(x))

def envelope(t, start, attack, decay):
    u = np.maximum(0, t-start)
    return (t >= start) * (1-np.exp(-u/attack)) * np.exp(-u/decay)

def contact(t, rng, start, weight=1, tone=2200, decay=.016, hardness=.65):
    """A noisy contact with quiet inharmonic modes, rather than a pitched beep."""
    u = np.maximum(0, t-start)
    x = noise(rng, len(t), [max(65, tone*.12), min(16000, tone*3.1)])
    modes = sum(np.sin(math.tau*tone*f*u + rng.random()*math.tau)*g
                for f, g in ((1,.12),(1.431,.06),(2.173,.035)))
    return weight * envelope(t, start, .00035, decay) * (x*hardness + modes)

def granular(t, rng, start, span, grains, weight, band, decay=.004):
    x = np.zeros(len(t))
    for i in range(grains):
        x += contact(t, rng, start+rng.random()*span,
                     weight*rng.uniform(.45,1), rng.uniform(*band),
                     decay*rng.uniform(.55,1.4), .72)
    return x

def register(key, variant, x):
    # The 48 Hz roll-off protects phone speaker headroom without removing
    # low-mid punch. A 0.15 ms entrance preserves firearm attack transients.
    x = np.tanh(filtered(x, 48, 'highpass')*.79)
    peak = np.max(np.abs(x))
    if peak > .9: x *= .9/peak
    edge = min(len(x)//2, int(RATE*.00015)); x[:edge] *= np.linspace(0,1,edge)
    x[-int(RATE*.012):] *= np.linspace(1,0,int(RATE*.012))
    if not np.all(np.isfinite(x)): raise ValueError('Nonfinite PCM '+key)
    sounds.append((key, variant, x.astype(np.float32)))

def shot(w, variant, suppressed=False):
    rng = np.random.default_rng(72317+w['id']*1289+variant*3989+int(suppressed)*1921)
    p = voicing[str(w['id'])]; kind = w['kind']
    duration = p['duration']; t = np.arange(int(RATE*duration))/RATE
    key = ('suppressed' if suppressed else 'shot')+str(w['id'])
    if kind == 'MELEE':
        register(key, variant, noise(rng,len(t),[280,5000])*envelope(t,.015,.055,.065)*.13
                 + contact(t,rng,.07,.07,1700,.009)); return
    # A single bipolar muzzle pressure front avoids the audible synthesized
    # bass note used in the previous bank. Low-band turbulence gives it mass.
    width = .38/p['pressureHz'] * rng.uniform(.96,1.04)
    pressure = (1-2*t/width)*np.exp(-t/width)*(1-np.exp(-t/.00010))
    body = noise(rng,len(t),[75,p['pressureHz']*3.8])*envelope(t,0,.00025,p['blastMs']/1000)
    crack = noise(rng,len(t),[p['crackHz']*.56,min(15000,p['crackHz']*2.8)])*envelope(t,0,.00008,.0018)
    air = noise(rng,len(t),[420,5500])*envelope(t,.002,.0007,p['blastMs']/1700)
    if suppressed:
        # Short, low-passed gas release; mechanical identity stays audible.
        x = pressure*p['body']*.12 + body*p['body']*.06 + filtered(crack,3400)*.033 + filtered(air,2700)*.025
        x += noise(rng,len(t),[300,1700])*envelope(t,.001,.001,.015)*.045
    else:
        x = pressure*p['body']*.57 + body*p['body']*.22 + crack*p['crack']*.37 + air*.10
    action = p['action']; delay = p['actionDelay']+rng.uniform(-.0018,.0018)
    x += contact(t,rng,delay,p['actionWeight'],p['actionHz'],.008)
    if action in ('roller','closed','slide','belt','gas'):
        x += contact(t,rng,delay+.021,p['actionWeight']*.66,p['actionHz']*.63,.012)
        # Ejection/chamber closure are part of the recording, never extra voices.
        x += granular(t,rng,delay+.069,.027,3,.006,(2800,6200),.006)
    if action == 'belt':
        x += granular(t,rng,.039,.038,5,.021,(1600,3900),.008)
    if action == 'pump':
        x += noise(rng,len(t),[430,3700])*envelope(t,.22,.018,.025)*.038
        x += contact(t,rng,.24,.14,1300,.017)+contact(t,rng,.43,.19,1850,.010)
    if action == 'bolt':
        x += contact(t,rng,.27,.11,850,.012)
        x += noise(rng,len(t),[380,3100])*envelope(t,.30,.015,.035)*.03
        x += contact(t,rng,.50,.13,1400,.010)
    if action == 'revolver':
        x += contact(t,rng,.034,.045,2100,.006)
    dry = x.copy()
    # Quiet, irregular baked exterior returns. Shared runtime room acoustics
    # add interior identity without adding a convolution node per shot.
    for seconds,gain in ((.048,.080),(.092,.045),(.163,.025)):
        seconds += rng.uniform(-.007,.007); delay = int(seconds*RATE)
        x[delay:] += filtered(dry[:-delay],2300)*gain*(.18 if suppressed else 1)
    x += noise(rng,len(t),[260,3500])*envelope(t,.010,.006,p['tail'])*(.006 if suppressed else .018)
    register(key,variant,x)

def actions(w):
    rng = np.random.default_rng(8849+w['id']*193); p = voicing[str(w['id'])]
    duration = max(.22,w['reload']*.91); t = np.arange(int(RATE*duration))/RATE
    metal = p['actionHz']; plastic = metal*.42
    if w['shellReload']:
        x = contact(t,rng,.020,.10,plastic,.015)+contact(t,rng,.20,.16,metal,.008)
        x += noise(rng,len(t),[300,2600])*envelope(t,.10,.015,.035)*.025
    else:
        x = contact(t,rng,duration*.105,.09,metal,.006)
        x += contact(t,rng,duration*.18,.14,plastic,.013)
        # Local friction strokes produce handling instead of continuous hiss.
        for start,span in ((.19,.065),(.52,.13),(.68,.04)):
            x += noise(rng,len(t),[260,3400])*envelope(t,duration*start,.012,span)*.017
        x += contact(t,rng,duration*.61,.09,plastic*.71,.015)
        x += contact(t,rng,duration*.72,.20,metal*.71,.010)
        if w['kind']=='LMG':
            x += contact(t,rng,duration*.40,.13,metal*.92,.014)
            x += granular(t,rng,duration*.49,duration*.10,12,.012,(1500,3900),.006)
            x += contact(t,rng,duration*.85,.17,metal*.51,.012)
        if w['revolver']:
            x += granular(t,rng,duration*.36,.08,6,.034,(2900,5700),.004)
            x += contact(t,rng,duration*.81,.13,metal,.012)
    register('reload'+str(w['id']),0,x)
    for key,duration in (('seat',.19),('rack',.28)):
        t = np.arange(int(RATE*duration))/RATE
        x = contact(t,rng,.008,.18,metal*.56,.010)
        if key=='rack':
            x += noise(rng,len(t),[400,3900])*envelope(t,.025,.012,.025)*.06
            x += contact(t,rng,.105,.23,metal,.008)
        register(key+str(w['id']),0,x)

for w in weapons:
    for variant in range(4): shot(w,variant)
    for variant in range(3): shot(w,variant,True)
    actions(w)

# Weight transfer, sole compression, toe scuff and individual surface contacts.
# Material layers receive independent noise, timing and pitch on all five takes.
for surface in ('Hard','Gravel','Soft','Snow','Quarry','Metal','Water','Wood'):
    for variant in range(5):
        rng = np.random.default_rng(19371+variant*997+sum(map(ord,surface)))
        t = np.arange(int(RATE*.34))/RATE
        heel = rng.uniform(.004,.010); toe = rng.uniform(.058,.089)
        x = noise(rng,len(t),[75,390])*envelope(t,heel,.0015,.018)*.10
        x += noise(rng,len(t),[120,680])*envelope(t,toe,.003,.020)*.045
        if surface=='Hard':
            x += contact(t,rng,heel,.072,1050,.005)+contact(t,rng,toe,.037,1350,.007)
            x += noise(rng,len(t),[600,3600])*envelope(t,.10,.015,.023)*.009
        elif surface in ('Gravel','Quarry'):
            x += granular(t,rng,.014,.15,22 if surface=='Gravel' else 13,.022,(1300,6000),.004)
            x += noise(rng,len(t),[300,3700])*envelope(t,.024,.010,.05)*.023
            if surface=='Quarry': x += contact(t,rng,toe,.07,550,.013)
        elif surface=='Soft':
            x = filtered(x,900)*.80
            x += noise(rng,len(t),[150,2200])*envelope(t,.022,.012,.049)*.031
            x += granular(t,rng,.05,.08,7,.010,(500,1600),.009)
        elif surface=='Snow':
            x = filtered(x,1000)*.8
            crunch = noise(rng,len(t),[900,7800])
            modulation = .38+.62*np.abs(filtered(rng.normal(0,1,len(t)),90))*5
            x += crunch*modulation*envelope(t,.018,.007,.067)*.042
            x += granular(t,rng,.022,.12,18,.011,(1600,5200),.003)
        elif surface=='Metal':
            x += contact(t,rng,heel,.085,1900,.018)
            x += sum(np.sin(math.tau*f*t)*envelope(t,heel,.001,decay)*.008
                     for f,decay in ((370,.05),(831,.032),(1717,.026)))
            x += noise(rng,len(t),[430,2900])*envelope(t,toe,.002,.022)*.02
        elif surface=='Water':
            x = filtered(x,800)*.45
            x += noise(rng,len(t),[420,6200])*envelope(t,.013,.007,.066)*.08
            x += granular(t,rng,.068,.14,11,.017,(1100,5900),.007)
        elif surface=='Wood':
            x += contact(t,rng,heel,.045,360,.021)+contact(t,rng,toe,.022,710,.013)
            x += noise(rng,len(t),[230,2000])*envelope(t,.080,.012,.025)*.016
        register('step'+surface,variant,x*1.5)

for surface in ('Metal','Stone','Wood','Glass','Water'):
    for variant in range(4):
        rng = np.random.default_rng(39987+variant*1301+sum(map(ord,surface)))
        t = np.arange(int(RATE*.48))/RATE
        x = contact(t,rng,.001,.24,2600+variant*211,.006)
        if surface=='Metal':
            # Short inharmonic ring and falling fragments, no sustained chime.
            x += sum(np.sin(math.tau*f*t)*envelope(t,.002,.0002,.021+i*.004)*.015
                     for i,f in enumerate((2491,3847,5729)))
            x += granular(t,rng,.022,.092,5,.026,(1700,5200),.005)
        elif surface=='Stone':
            x += noise(rng,len(t),[180,4700])*envelope(t,.001,.0004,.020)*.081
            x += granular(t,rng,.020,.13,16,.020,(1300,4300),.004)
        elif surface=='Wood':
            x = filtered(x,2700)
            x += noise(rng,len(t),[100,750])*envelope(t,.002,.0007,.017)*.07
            x += granular(t,rng,.008,.06,8,.022,(650,2300),.006)
        elif surface=='Glass':
            x += noise(rng,len(t),[1700,14000])*envelope(t,.002,.0003,.006)*.105
            x += granular(t,rng,.010,.24,28,.022,(2200,7500),.012)
        else:
            x = noise(rng,len(t),[650,7000])*envelope(t,.002,.003,.049)*.115
            x += granular(t,rng,.05,.16,12,.018,(1500,6200),.006)
        register('impact'+surface,variant,x*1.45)

for surface in ('Metal','Stone'):
    for variant in range(4):
        rng = np.random.default_rng(67519+variant*997+sum(map(ord,surface)))
        t = np.arange(int(RATE*.25))/RATE
        x = contact(t,rng,.001,.16,3600+rng.uniform(-250,250),.004)
        # A clipped friction scrape and a quiet falling fragment, not a long
        # synthetic whistle. This describes a terminal glancing impact only.
        x += noise(rng,len(t),[1800,11500])*envelope(t,.004,.0005,.024)*.055
        if surface=='Metal':
            x += noise(rng,len(t),[3700,13800])*envelope(t,.012,.001,.037)*.027
            phase = math.tau*(6600*t-12500*t*t)
            x += np.sin(phase)*envelope(t,.004,.001,.024)*.011
            x += granular(t,rng,.029,.068,5,.012,(2100,5200),.004)
        else:
            x += noise(rng,len(t),[350,3400])*envelope(t,.004,.001,.018)*.047
            x += granular(t,rng,.021,.088,11,.014,(1100,4300),.003)
        register('ricochet'+surface,variant,x)

for surface in ('Metal','Wood','Glass','Stone'):
    for variant in range(4):
        rng = np.random.default_rng(91753+variant*1709+sum(map(ord,surface)))
        t = np.arange(int(RATE*.22))/RATE
        tone = {'Metal':3200,'Wood':850,'Glass':5100,'Stone':1600}[surface]
        x = contact(t,rng,.001,.17,tone,.004,.85)
        # Through-cover contacts are shorter than ordinary impacts. Entry and
        # exit are spatially played from this material family in the game.
        band = [1400,11000] if surface in ('Metal','Glass') else [140,4400]
        x += noise(rng,len(t),band)*envelope(t,.002,.0003,.010)*.05
        x += granular(t,rng,.009,.065,9 if surface=='Glass' else 5,.017,
                      (tone*.55,min(7000,tone*1.6)),.003)
        if surface=='Wood': x += noise(rng,len(t),[100,630])*envelope(t,.003,.001,.017)*.052
        if surface=='Stone': x += noise(rng,len(t),[250,2300])*envelope(t,.005,.001,.016)*.034
        register('penetration'+surface,variant,x)

for surface in ('Hard','Metal','Wood','Soft','Water','Snow'):
    for variant in range(3):
        rng = np.random.default_rng(53629+variant*2017+sum(map(ord,surface)))
        t = np.arange(int(RATE*.30))/RATE
        hardness = {'Hard':.9,'Metal':1,'Wood':.47,'Soft':.12,'Water':.13,'Snow':.09}[surface]
        x = contact(t,rng,.002,.065*hardness,3300,.006)
        for start,weight in ((rng.uniform(.044,.071),.023),(rng.uniform(.11,.15),.011)):
            x += contact(t,rng,start,weight*hardness,2900,.004)
        if surface=='Metal':
            x += sum(np.sin(math.tau*f*t)*envelope(t,.002,.0003,.023)*.003
                     for f in (3107,4913,7229))
        elif surface=='Wood': x += noise(rng,len(t),[140,1300])*envelope(t,.002,.001,.011)*.012
        elif surface=='Water': x += noise(rng,len(t),[500,6800])*envelope(t,.004,.003,.017)*.022
        elif surface=='Snow': x += noise(rng,len(t),[800,6300])*envelope(t,.004,.005,.018)*.010
        elif surface=='Soft': x += noise(rng,len(t),[140,2400])*envelope(t,.004,.003,.010)*.012
        register('casing'+surface,variant,x)

for variant in range(4):
    rng = np.random.default_rng(998731+variant*3877)
    t = np.arange(int(RATE*1.55))/RATE
    front = (1-t/.005)*np.exp(-t/.005)*(1-np.exp(-t/.0001))
    x = front*.63+noise(rng,len(t),[90,1400])*envelope(t,0,.0003,.092)*.31
    x += noise(rng,len(t),[1900,12500])*envelope(t,0,.0001,.006)*.20
    # Stochastic rolling pressure and delayed debris replace one 53 Hz note.
    x += noise(rng,len(t),[75,460])*envelope(t,.023,.005,.25)*.16
    x += noise(rng,len(t),[300,3100])*envelope(t,.032,.014,.16)*.06
    x += granular(t,rng,.085,.71,28,.035,(700,4300),.008)
    register('explosion',variant,x)

def encode(sound):
    key,variant,x = sound; name = key+'-'+str(variant)
    wav = work/(name+'.wav'); aac = work/(name+'.m4a')
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes((x*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),
                    '-c:a','aac','-b:a','160k','-movflags','+faststart',str(aac)],check=True)
    spectrum = np.abs(np.fft.rfft(x))**2
    centroid = np.sum(np.fft.rfftfreq(len(x),1/RATE)*spectrum)/max(1e-9,np.sum(spectrum))
    metrics = {'duration':len(x)/RATE,'pcmPeak':float(np.max(np.abs(x))),
               'pcmRms':float(np.sqrt(np.mean(x*x))), 'spectralCentroidHz':float(centroid),
               'attackRms':float(np.sqrt(np.mean(x[:int(RATE*.020)]**2)))}
    return key,variant,aac.read_bytes(),metrics

index = {}; data = bytearray()
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for key,variant,encoded,metrics in pool.map(encode,sounds):
            index.setdefault(key,[]).append({'offset':len(data),'bytes':len(encoded),
                                             'variant':variant,**metrics})
            data.extend(encoded)
    (root/'sound-bank.bin').write_bytes(data)
    (root/'manifest.json').write_text(json.dumps({
        'schema':2,'codec':'AAC-LC in M4A','sampleRate':RATE,'originalDesign':True,
        'license':'Original Breachline project assets; no third-party samples',
        'production':'Pressure-front and turbulence voicing; granular material foley',
        'sounds':index,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()
    },indent=2)+'\n')
    print('Original audio library',len(sounds),'recordings',len(data),'bytes',flush=True)
finally:
    shutil.rmtree(work)
