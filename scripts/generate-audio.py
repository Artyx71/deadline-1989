#!/usr/bin/env python3
"""Original DEADLINE:1989 composition and sound design, no samples or dependencies.

Generate real PCM WAVs: python3 scripts/generate-audio.py
Every melody, rhythm, oscillator, envelope and noise source is specified below.
No borrowed recordings, melodies, soundfonts, model outputs or network inputs.
"""
from array import array
from pathlib import Path
import hashlib
import json
import math
import random
import sys
import wave

OUT=Path(__file__).resolve().parents[1]/'apps/web/public/assets/audio'
OUT.mkdir(parents=True,exist_ok=True)
RATE=22050
TAU=math.tau
MANIFEST={}


def hz(midi):return 440*2**((midi-69)/12)


class Mix:
    def __init__(self,duration,loop=False):
        self.samples=array('f',[0.])*round(RATE*duration)
        self.loop=loop

    def add(self,seq,start=0,gain=1):
        first=round(start*RATE);n=len(self.samples)
        for i,v in enumerate(seq):
            ix=first+i
            if self.loop:self.samples[ix%n]+=v*gain
            elif 0<=ix<n:self.samples[ix]+=v*gain

    def echo(self,delay=.19,gain=.23):
        source=self.samples[:];self.add(source,delay,gain)

    def write(self,name,role,bpm=None,peak=.82):
        # Remove DC, add short end tapers and normalize below digital full scale.
        vals=self.samples;dc=sum(vals)/len(vals)
        for i in range(len(vals)):vals[i]=math.tanh((vals[i]-dc)*1.15)
        taper=round(RATE*.006)
        for i in range(taper):
            vals[i]*=i/taper;vals[-i-1]*=i/taper
        maximum=max(abs(v) for v in vals);gain=peak/maximum if maximum else 0
        pcm=array('h',(round(v*gain*32767) for v in vals))
        if sys.byteorder!='little':pcm.byteswap()
        path=OUT/(name+'.wav')
        with wave.open(str(path),'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
        rms=(sum((v*gain)**2 for v in vals)/len(vals))**.5
        info={'file':path.name,'role':role,'duration':round(len(vals)/RATE,6),'sampleRate':RATE,'channels':1,'bits':16,'loop':self.loop,'peak':round(peak,4),'rms':round(rms,6),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'streaming':'original synthesis; no third-party recordings or samples'}
        if bpm:info['bpm']=bpm
        MANIFEST[name]=info
        print(f'{path.name}: {info["duration"]:.3f}s RMS={rms:.4f} peak={peak:.2f}')


def tone(note,duration,kind='pluck',velocity=1):
    freq=hz(note);n=round(duration*RATE);out=array('f');attack={'pad':.22,'bass':.005,'pluck':.003,'keys':.008,'lead':.012}.get(kind,.01)
    for i in range(n):
        t=i/RATE;release=min(1,(duration-t)/(.25 if kind=='pad' else .04));env=min(1,t/attack)*max(0,release)
        phase=TAU*freq*t
        if kind=='pad':v=(math.sin(phase)+.42*math.sin(phase*1.003)+.19*math.sin(phase*2))/1.61;env*=.65+.13*math.sin(TAU*.18*t)
        elif kind=='bass':v=math.tanh(1.6*(math.sin(phase)+.3*math.sin(phase*2)+.13*math.sin(phase*3)));env*=math.exp(-1.8*t)
        elif kind=='keys':v=math.sin(phase+.65*math.sin(phase*2)*math.exp(-3*t))+.18*math.sin(phase*3);env*=math.exp(-2.2*t)
        elif kind=='lead':v=.65*math.sin(phase)+.22*math.sin(phase*2)+.15*math.sin(phase*3);env*=math.exp(-2*t)
        else:v=math.sin(phase+.36*math.sin(phase*2))+.14*math.sin(phase*3);env*=math.exp(-7*t)
        out.append(v*env*velocity)
    return out


def percussion(kind,seed=0):
    duration={'kick':.36,'snare':.24,'hat':.075,'open-hat':.18,'rim':.07}[kind]
    r=random.Random(seed);out=array('f');previous=0
    for i in range(round(duration*RATE)):
        t=i/RATE;noise=r.uniform(-1,1);high=noise-previous*.72;previous=noise
        if kind=='kick':phase=TAU*(43*t+145*(1-math.exp(-21*t))/21);v=math.sin(phase)*math.exp(-11*t)+noise*.1*math.exp(-110*t)
        elif kind=='snare':v=(high*.7+math.sin(TAU*178*t)*.25)*math.exp(-17*t)
        elif kind=='rim':v=(math.sin(TAU*1730*t)*.7+high*.2)*math.exp(-80*t)
        else:v=high*math.exp(-(21 if kind=='open-hat' else 58)*t)*.45
        out.append(v*min(1,t/.001))
    return out


CHORDS=[(45,52,57,60,64),(41,48,53,57,60),(48,55,60,64,67),(43,50,55,59,62)]


def music(name,bpm,bars,style):
    beat=60/bpm;bar=beat*4;duration=bars*bar;m=Mix(duration,True)
    chord_span=2 if bars==8 else 1
    for b in range(bars):
        chord=CHORDS[(b//chord_span)%4];start=b*bar
        if style=='drone':
            for note in [chord[0]-12,chord[2],chord[3]]:m.add(tone(note,bar+.5,'pad',.12),start)
            m.add(tone(chord[0]-12,bar+.1,'bass',.06),start)
            continue
        for note in chord[2:]:m.add(tone(note,bar+.4,'pad',.09 if style=='combat' else .14),start)
        for step in range(8 if style!='combat' else 16):
            spacing=beat/2 if style!='combat' else beat/4
            note=chord[0]-(12 if style=='ambient' else 0)
            if style=='combat' and step%8 in (5,7):note+=12
            m.add(tone(note,spacing*.84,'bass',.28 if style=='combat' else .17),start+step*spacing)
        if style=='ambient':
            for step,note in [(1,chord[3]+12),(5,chord[4]+12)]:m.add(tone(note,beat*1.5,'pluck',.07),start+step*beat/2)
            m.add(percussion('kick',b),start,.13)
            m.add(percussion('rim',b+100),start+beat*2,.06)
            continue
        if style=='lofi':
            for j,note in enumerate(chord[2:]):m.add(tone(note,beat*1.8,'keys',.13),start+j*.012)
            # Original syncopation: weak-beat keys with quiet swung hats.
            m.add(tone(chord[3]+12,beat*.65,'keys',.09),start+beat*2.75)
            kicks=[0,1.75,3];snares=[1,3]
        elif style=='combat':kicks=[0,1,2,3];snares=[1,3]
        else:kicks=[0,2.5];snares=[2]
        for step in kicks:m.add(percussion('kick',b*31+int(step*10)),start+beat*step,.58 if style=='combat' else .31)
        for step in snares:m.add(percussion('snare',b*37+step),start+beat*step,.29 if style=='combat' else .18)
        for step in range(8):
            swing=.075 if style=='lofi' and step%2 else 0
            m.add(percussion('open-hat' if style=='combat' and step==7 else 'hat',b*41+step),start+beat*(step/2+swing),.15 if style=='combat' else .085)
        arp=[0,2,1,3,2,1,3,4] if style=='combat' else [0,2,1,3,2,4,3,1]
        if style!='lofi':
            for step,index in enumerate(arp):m.add(tone(chord[min(index,4)]+12,beat*.42,'pluck',.14 if style=='combat' else .12),start+step*beat/2)
        if style=='menu' and b in (1,3,5,7):
            # An original sparse phrase, distinct from the arpeggio underneath.
            phrase=[chord[4]+12,chord[3]+12,chord[2]+12,chord[3]+12]
            for j,note in enumerate(phrase):m.add(tone(note,beat*.8,'lead',.12),start+beat*j)
    m.echo(beat*.75,.19 if style!='combat' else .10)
    m.write(name,{'menu':'dreamwave menu','ambient':'dark apartment ambience','lofi':'calm task-terminal lo-fi','drone':'dialogue tension drone','combat':'aggressive darksynth'}[style],bpm,.76 if style=='drone' else .82)


def stinger(name,success):
    m=Mix(2.8 if success else 2.4)
    if success:
        notes=[57,60,64,69,72,76]
        for i,n in enumerate(notes):m.add(tone(n,.8,'lead',.35),i*.13)
        for n in [45,57,60,64,69]:m.add(tone(n,1.7,'pad',.17),.65)
        m.add(percussion('kick',1989),0,.4);m.echo(.18,.25)
    else:
        n=round(1.9*RATE);seq=array('f');phase=0
        for i in range(n):
            t=i/RATE;freq=180*math.exp(-1.8*t)+24;phase+=TAU*freq/RATE
            seq.append((math.sin(phase)+.3*math.sin(phase*1.025))*.35*math.exp(-2*t)*min(1,t/.004))
        m.add(seq);m.add(percussion('snare',999),0,.3);m.echo(.17,.17)
    m.write(name,'mission victory stinger' if success else 'death interruption stinger')


def sfx(name):
    duration={'footstep':.16,'gunshot':.28,'reload':.62,'melee':.24,'impact':.18,'phone':1.8,'computer':.35,'menu':.13,'task-complete':.8,'death':.85,'victory':1.0,'ambience':4.0}[name]
    m=Mix(duration,name=='ambience');r=random.Random(1989+sum(map(ord,name)))
    if name in ('footstep','gunshot','melee','impact','ambience'):
        seq=array('f');phase=0;low=0
        for i in range(round(duration*RATE)):
            t=i/RATE;noise=r.uniform(-1,1);low=low*.83+noise*.17
            if name=='footstep':v=(low*.7+math.sin(TAU*91*t)*.2)*math.exp(-28*t)
            elif name=='gunshot':v=(noise*.65*math.exp(-31*t)+math.sin(TAU*(54*t+1.7*(1-math.exp(-34*t))))*.55*math.exp(-20*t))
            elif name=='melee':v=(low*.8+math.sin(TAU*(180*t-110*t*t))*.25)*math.sin(min(1,t/duration)*math.pi)*math.exp(-9*t)
            elif name=='impact':v=(noise*.6+math.sin(TAU*304*t)*.3)*math.exp(-36*t)
            else:v=low*.09+.025*math.sin(TAU*60*t)+.012*math.sin(TAU*120*t)+.012*math.sin(TAU*413*t)*(math.sin(TAU*.5*t)*.5+.5)
            seq.append(v*min(1,t/.002))
        m.add(seq)
    elif name=='reload':
        for at,seed in [(0,1),(.17,2),(.41,3),(.49,4)]:m.add(percussion('rim',seed),at,.6)
        m.add(percussion('hat',90),.18,.4)
    elif name=='phone':
        seq=array('f')
        for i in range(round(duration*RATE)):
            t=i/RATE;gate=1 if t<.6 or 1.05<t<1.65 else 0
            v=(math.sin(TAU*440*t)+math.sin(TAU*480*t))*.22*(.7+.3*math.sin(TAU*21*t))*gate
            seq.append(v)
        m.add(seq)
    elif name=='computer':
        m.add(tone(72,.12,'pluck',.5));m.add(tone(79,.2,'pluck',.45),.1)
    elif name=='menu':m.add(tone(81,.11,'pluck',.45))
    elif name=='task-complete':
        for at,n in [(0,72),(.12,76),(.24,79),(.38,84)]:m.add(tone(n,.35,'keys',.4),at)
        m.echo(.1,.18)
    elif name=='death':
        m.add(tone(33,.8,'bass',.65));m.add(percussion('snare',35),0,.3)
    elif name=='victory':
        for i,n in enumerate([69,72,76,81]):m.add(tone(n,.45,'lead',.4),i*.13)
    m.write('sfx-'+name,name+' sound effect',peak=.55 if name=='ambience' else .78)


def main():
    music('menu',120,8,'menu')
    music('apartment',80,4,'ambient')
    music('terminal',80,4,'lofi')
    music('dialogue',60,4,'drone')
    music('combat',144,8,'combat')
    stinger('death',False);stinger('victory',True)
    for name in ['footstep','gunshot','reload','melee','impact','phone','computer','menu','task-complete','death','victory','ambience']:sfx(name)
    manifest={'version':1,'source':'scripts/generate-audio.py','provenance':'Original procedural composition and synthesis for DEADLINE:1989; no third-party samples or melodies','validation':'WAV headers, sample levels and determinism; no auditory listening claimed','tracks':MANIFEST}
    (OUT/'audio-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Wrote {len(MANIFEST)} original audio files.')


if __name__=='__main__':main()
