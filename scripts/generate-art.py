#!/usr/bin/env python3
"""Reproduce DEADLINE:1989's original raster art. Requires Pillow, no remote inputs.

Run from repository root: /tmp/deadline-art-tools/bin/python scripts/generate-art.py
All pixel shapes, textures, portraits, maps, and motifs below are original code.
"""
from pathlib import Path
import json
import math
import random
import sys
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'apps/web/public/assets'
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(1989)
INK = '#10101c'
PAPER = '#d6bfb3'
PINK = '#e75297'
CYAN = '#67c9cc'
PIXEL_LETTERS={
    'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],'C':['011','100','100','100','011'],
    'D':['110','101','101','101','110'],'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],
    'G':['011','100','101','101','011'],'H':['101','101','111','101','101'],'I':['111','010','010','010','111'],
    'J':['001','001','001','101','010'],'K':['101','101','110','101','101'],'L':['100','100','100','100','111'],
    'M':['101','111','111','101','101'],'N':['101','111','111','111','101'],'O':['010','101','101','101','010'],
    'P':['110','101','110','100','100'],'Q':['010','101','101','111','011'],'R':['110','101','110','101','101'],
    'S':['011','100','010','001','110'],'T':['111','010','010','010','010'],'U':['101','101','101','101','111'],
    'V':['101','101','101','101','010'],'W':['101','101','111','111','101'],'X':['101','101','010','101','101'],
    'Y':['101','101','010','010','010'],'Z':['111','001','010','100','111'],'0':['111','101','101','101','111'],
    '1':['010','110','010','010','111'],'2':['110','001','010','100','111'],'3':['110','001','010','001','110'],
    '4':['101','101','111','001','001'],'5':['111','100','110','001','110'],'6':['011','100','111','101','111'],
    '7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','110'],
    '-':['000','000','111','000','000'],'/':['001','001','010','100','100']}
PIXEL_LETTERS.update({
    'А':PIXEL_LETTERS['A'],'Б':['111','100','110','101','110'],'В':PIXEL_LETTERS['B'],
    'Г':['111','100','100','100','100'],'Д':['011','101','101','111','101'],'Е':PIXEL_LETTERS['E'],
    'Ж':['101','111','010','111','101'],'З':PIXEL_LETTERS['3'],'И':['101','101','111','111','101'],
    'Й':['010','101','111','111','101'],'К':PIXEL_LETTERS['K'],'Л':['011','101','101','101','101'],
    'М':PIXEL_LETTERS['M'],'Н':PIXEL_LETTERS['H'],'О':PIXEL_LETTERS['O'],'П':['111','101','101','101','101'],
    'Р':PIXEL_LETTERS['P'],'С':PIXEL_LETTERS['C'],'Т':PIXEL_LETTERS['T'],'У':['101','101','011','001','110'],
    'Ф':['010','111','111','010','010'],'Х':PIXEL_LETTERS['X'],'Ц':['101','101','101','111','001'],
    'Ч':['101','101','111','001','001'],'Ш':['101','101','111','111','111'],'Щ':['101','101','111','111','001'],
    'Ы':['101','101','111','111','111'],'Ь':['100','100','110','101','110'],'Э':['110','001','011','001','110'],
    'Ю':['101','111','111','111','101'],'Я':['111','101','111','011','101']})


def lettering(d,text,x,y,color,scale=1):
    """Original tiny utility glyphs, defined as source geometry, no font file."""
    for i,ch in enumerate(text.upper()):
        for yy,row in enumerate(PIXEL_LETTERS.get(ch,['000']*5)):
            for xx,value in enumerate(row):
                if value=='1':d.rectangle((x+(i*4+xx)*scale,y+yy*scale,x+(i*4+xx+1)*scale-1,y+(yy+1)*scale-1),fill=color)


def save(im, name):
    im.save(OUT / name, optimize=True)


def box(d, xy, fill, edge=INK, highlight=None):
    d.rectangle(xy, fill=fill, outline=edge)
    x,y,r,b=xy
    if highlight:
        d.line((x+1,y+1,r-1,y+1),fill=highlight)
        d.line((x+1,y+1,x+1,b-1),fill=highlight)


def grain(d, xy, colors, count, seed=1):
    r=random.Random(seed)
    x,y,bottom_x,bottom_y=xy
    for _ in range(count):
        xx=r.randrange(x,bottom_x+1); yy=r.randrange(y,bottom_y+1)
        d.point((xx,yy),fill=r.choice(colors))


def floor_tile(kind, variant=0):
    im=Image.new('RGBA',(16,16)); d=ImageDraw.Draw(im)
    if kind=='wood':
        shades=['#463342','#503945','#573e49','#493544']
        d.rectangle((0,0,15,15),fill=shades[variant%4])
        d.line((0,0,15,0),fill='#251e30'); d.line((0,8,15,8),fill='#2e2435')
        d.line((0,1,15,1),fill='#654b52'); d.line((0,9,15,9),fill='#5c4550')
        end=(variant*7)%16
        d.line((end,0,end,7),fill='#2c2333');d.line(((end+8)%16,8,(end+8)%16,15),fill='#2c2333')
        grain(d,(1,2,14,14),['#59404b','#624653','#392c3b'],18,variant+90)
    elif kind=='tile':
        d.rectangle((0,0,15,15),fill=['#4c4c57','#5f5761','#555361','#69606a'][variant%4])
        d.line((0,0,15,0),fill='#85808a');d.line((0,0,0,15),fill='#85808a')
        d.line((0,15,15,15),fill='#282736');d.line((15,0,15,15),fill='#282736')
        grain(d,(2,2,13,13),['#5f5c67','#716873','#464552'],15,variant)
    elif kind=='wall':
        d.rectangle((0,0,15,15),fill='#5a3b52')
        d.line((0,0,15,0),fill='#9b6978');d.line((0,12,15,12),fill='#bf7a86')
        d.line((0,14,15,14),fill='#302638');d.line((7,3,7,10),fill='#694459')
    else:
        d.rectangle((0,0,15,15),fill='#34303f')
        grain(d,(0,0,15,15),['#443a4c','#2b2838','#4b3e50'],70,variant)
    return im


def prop(name, w, h):
    im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im)
    if name=='bed':
        box(d,(3,2,w-4,h-3),'#503145',highlight='#97616d')
        box(d,(7,9,w-8,h-8),'#8c697e',highlight='#c38b9e')
        box(d,(8,10,w-9,27),'#b49cac',highlight='#dec1c6')
        box(d,(12,12,w//2-3,25),'#b1a8b5',highlight='#ded3d2')
        box(d,(w//2+2,12,w-13,25),'#aea0ad',highlight='#d6c7cc')
        d.rectangle((8,30,w-9,h-9),fill='#80657e')
        grain(d,(10,32,w-11,h-12),['#92748e','#72566f','#a27f97'],150,2)
        for y in (35,49,70): d.line((14,y,w-15,y+3),fill='#a08097',width=2)
        d.polygon([(9,h-30),(w-10,h-37),(w-10,h-10),(9,h-10)],fill='#574359')
        d.line((10,h-30,w-11,h-37),fill='#aa8098')
    elif name=='desk':
        box(d,(1,4,w-2,h-2),'#4b303b',highlight='#9a6260')
        box(d,(3,2,w-4,h-11),'#805056',highlight='#bb7d75')
        grain(d,(5,4,w-6,h-14),['#8c5b5e','#6f424e','#ab6d65'],100,4)
        box(d,(w-23,7,w-7,h-18),'#c2afa7',highlight='#e4cfc1')
        for yy in range(12,h-21,5):d.line((w-20,yy,w-10,yy),fill='#766a72')
        box(d,(11,8,53,38),'#2a2838',highlight='#7f758b')
        box(d,(15,11,49,32),'#092a38',edge='#18202c',highlight='#6393a1')
        d.rectangle((18,14,46,29),fill='#33a2ad')
        for yy in range(16,29,3): d.line((20,yy,38+(yy%4),yy),fill='#9bf3d3')
        d.rectangle((28,38,36,42),fill='#5f5266')
        box(d,(12,43,54,54),'#a299a4',highlight='#d2c3c8')
        for yy in range(45,52,3):
            for xx in range(15,51,4): d.rectangle((xx,yy,xx+2,yy+1),fill='#4b475a')
        box(d,(62,40,70,51),'#9f8e9e',highlight='#d2b6c1')
        d.line((66,42,66,45),fill='#4d3b50')
        d.ellipse((62,8,72,19),fill='#161927',outline='#ad7288');d.ellipse((65,10,69,14),fill='#dec5b3')
        for xx in (5,w-12):box(d,(xx,h-10,xx+7,h-3),'#4d303e',highlight='#9d6470')
    elif name=='phone':
        box(d,(3,h-15,w-4,h-4),'#593349',highlight='#ac5977')
        box(d,(6,6,w-7,h-11),'#8d3659',highlight='#e3698d')
        d.polygon([(8,8),(12,4),(w-13,4),(w-8,8),(w-9,13),(w-15,15),(w-16,10),(15,10),(14,15),(8,13)],fill='#d04e76',outline=INK)
        for yy in range(17,28,4):
            for xx in range(13,25,4): d.rectangle((xx,yy,xx+2,yy+2),fill='#efb3aa')
        for yy in range(16,h-11,3): d.line((w-7,yy,w-4,yy+1),fill='#261d2e')
    elif name=='sofa':
        box(d,(2,2,w-3,h-3),'#322533',highlight='#a66a70')
        box(d,(5,3,w-6,14),'#714552',highlight='#af7680')
        for x in range(11,w-20,30):
            box(d,(x,16,min(x+27,w-12),h-9),'#805361',highlight='#ba7d86')
            d.line((x+3,20,min(x+23,w-16),20),fill='#96606b')
            d.line((x+5,h-15,min(x+21,w-17),h-14),fill='#573847')
        box(d,(3,10,12,h-5),'#67414f',highlight='#9c6571');box(d,(w-13,10,w-4,h-5),'#67414f',highlight='#9c6571')
    elif name=='tv':
        box(d,(0,h-19,w-1,h-2),'#6d4a4e',highlight='#a67b70')
        for xx in (5,w//2+2):box(d,(xx,h-15,xx+w//2-9,h-6),'#4c3644',highlight='#865c60')
        box(d,(7,5,w-8,h-20),'#383442',highlight='#82727e')
        box(d,(12,10,w-19,h-25),'#1f303e',highlight='#63818d')
        d.rectangle((15,13,w-22,h-28),fill='#956286')
        grain(d,(16,14,w-23,h-29),['#c894b1','#6b486d','#a9769d','#30283f'],150,21)
        for yy in range(15,h-29,3):d.line((16,yy,w-23,yy),fill='#775272')
        for yy in (16,23):d.ellipse((w-16,yy,w-11,yy+5),fill='#aa919d',outline=INK)
        d.line((w//2,5,w//2-9,0),fill='#9d939f');d.line((w//2,5,w//2+8,0),fill='#9d939f')
    elif name=='cabinet':
        box(d,(1,1,w-2,h-2),'#3c303f',highlight='#9a6f6d')
        box(d,(4,4,w-5,h-7),'#6a4e52',highlight='#a37b70')
        for yy in range(10,h-9,16):
            box(d,(7,yy,w-8,yy+12),'#5b414a',highlight='#956a64');d.rectangle((w//2-4,yy+4,w//2+4,yy+5),fill='#b79b88')
        grain(d,(8,7,w-9,h-10),['#80595b','#473642'],30,9)
    elif name=='plant':
        d.ellipse((w//2-12,h-20,w//2+12,h-2),fill='#211f2c')
        d.polygon([(w//2-9,h-17),(w//2+9,h-17),(w//2+6,h-3),(w//2-6,h-3)],fill='#82534e',outline=INK)
        d.line((w//2-7,h-14,w//2+7,h-14),fill='#bb786b')
        cx=w//2;cy=h-20
        for angle in range(0,360,40):
            t=math.radians(angle);ex=int(cx+math.cos(t)*17);ey=int(cy-12+math.sin(t)*17)
            d.line((cx,cy,ex,ey),fill='#415c48',width=3)
            d.ellipse((ex-5,ey-3,ex+5,ey+3),fill='#486e53',outline='#203533')
            d.line((ex-3,ey,ex+3,ey),fill='#72916a')
    elif name=='table':
        d.ellipse((2,5,w-3,h-1),fill=INK)
        d.ellipse((1,1,w-2,h-7),fill='#8d625c',outline='#bd8c74',width=2)
        d.ellipse((5,4,w-6,h-11),outline='#63464c')
        d.rectangle((w//2-6,8,w//2+8,23),fill='#cbb8a5',outline='#725d60')
        for yy in range(12,21,3):d.line((w//2-3,yy,w//2+5,yy),fill='#927c7d')
        d.ellipse((9,10,20,21),fill='#282332',outline='#c29683');d.ellipse((11,12,18,17),fill='#65454b')
    elif name=='chair':
        box(d,(4,4,w-5,h-5),'#594557',highlight='#a37d8f')
        box(d,(6,6,w-7,h-10),'#6e5869',highlight='#947484')
        box(d,(4,h-11,w-5,h-3),'#443647',highlight='#816276')
        d.line((w//2,7,w//2,h-13),fill='#574456')
    elif name=='window':
        box(d,(0,0,w-1,h-1),'#645268',highlight='#b58b9e')
        box(d,(4,4,w-5,h-5),'#102637',highlight='#477187')
        d.line((w//2,5,w//2,h-6),fill='#a17a90',width=2)
        for xx in range(8,w-8,8):d.line((xx,6,xx-4,h-8),fill='#316474')
        d.line((4,h-4,w-5,h-4),fill='#e768a3',width=2)
        d.rectangle((0,h-2,w-1,h-1),fill='#261f30')
    elif name=='door':
        box(d,(1,1,w-2,h-2),'#3b2e40',highlight='#a17b7b')
        box(d,(5,3,w-6,h-4),'#765a5e',highlight='#a4827c')
        for yy in (8,h//2):box(d,(9,yy,w-10,min(yy+h//3,h-9)),'#614a53',highlight='#85656b')
        d.rectangle((w-11,h//2,w-7,h//2+2),fill='#e1bd89')
    elif name=='counter':
        box(d,(1,1,w-2,h-2),'#4c454e',highlight='#9a9598')
        box(d,(3,3,w-4,h-9),'#98919a',highlight='#c6b8bb')
        if w>60:
            box(d,(7,7,35,h-15),'#4c5965',highlight='#b8c0c4')
            d.ellipse((10,10,31,h-19),fill='#253e4e',outline='#8b9ba4')
            d.line((21,8,21,4,28,4),fill='#c4c8c6',width=2)
            for cx in (w-34,w-15):
                for cy in (13,29):d.ellipse((cx-6,cy-6,cx+6,cy+6),fill='#292a39',outline='#5d5c69')
        for xx in range(6,w-12,25):d.line((xx,h-7,xx+20,h-7),fill='#b3a6aa')
    elif name=='fridge':
        box(d,(2,1,w-3,h-2),'#aaa0aa',highlight='#dbcdcb')
        d.line((4,24,w-5,24),fill='#514c5c');d.line((w-9,8,w-9,19),fill='#535363',width=2)
        d.line((w-9,29,w-9,h-14),fill='#535363',width=2)
        d.rectangle((8,9,17,18),fill='#c0767e');d.rectangle((10,30,20,38),fill='#c9b993')
    elif name=='bookshelf':
        box(d,(1,1,w-2,h-2),'#523b47',highlight='#9c776c')
        for yy in range(5,h-10,18):
            d.rectangle((5,yy,w-6,yy+13),fill='#282636')
            for xx in range(7,w-10,7):
                color=['#6a7a77','#bb747e','#ae9c7c','#605d86'][(xx+yy)%4]
                d.rectangle((xx,yy+2,xx+4,yy+12),fill=color)
                d.point((xx+2,yy+4),fill='#dac0a5')
            d.line((4,yy+15,w-5,yy+15),fill='#a47369')
    return im


PROPS={'bed':(80,112),'desk':(96,64),'phone':(40,44),'sofa':(112,44),
       'tv':(80,64),'cabinet':(48,80),'plant':(48,64),'table':(64,48),
       'chair':(32,32),'window':(80,24),'door':(48,48),'counter':(128,48),
       'fridge':(48,72),'bookshelf':(64,64)}
PROP_IMAGES={key:prop(key,*size) for key,size in PROPS.items()}


def make_apartment():
    """Original open studio: sleeping alcove, living group, work desk and kitchen."""
    im=Image.new('RGBA',(768,480),'#090e16');d=ImageDraw.Draw(im);rr=random.Random(198911)
    # Preserve the other asset family's established deterministic RNG sequence.
    for _ in range(500):
        x=RNG.randrange(768);y=RNG.randrange(480);length=RNG.randrange(1,9);c=RNG.choice(['#22202f','#2b2036','#1c2f3e'])
        d.line((x,y,x+length,y),fill=c)
    # Deep city exterior, power conduits and window reflections.
    for y in range(38,448,16):
        d.line((55,y,712,y),fill='#17212a')
    for x in (62,708):d.line((x,48,x,434),fill='#2c3a3c',width=3)
    # Quiet wood planks replace the old repeating brick-grid floor.
    for y in range(64,416,16):
        for x in range(80,688,32):
            c=rr.choice(['#554e3a','#514834','#5b4d37','#504734'])
            d.rectangle((x,y,x+31,y+15),fill=c)
            d.line((x,y+15,x+31,y+15),fill='#34382b')
            grain(d,(x+2,y+2,x+29,y+13),['#66573e','#5c523a','#49442e'],8,x+y)
            if (x//32+y//16)%3==0:d.line((x+11,y+6,x+25,y+6),fill='#67573d')
    # Soft floor zoning: cloth beneath the bed; small kitchen tile inset.
    d.rectangle((84,68,254,223),fill='#363b33')
    grain(d,(87,71,251,220),['#44473b','#2f382f','#535045'],1000,81)
    for y in range(80,233,16):
        for x in range(528,688,16):
            box(d,(x,y,x+15,y+15),rr.choice(['#62634f','#6d6753','#5b614e']),edge='#434e40',highlight='#87846a')
    # Worn central living rug, oval-ish corners, one coherent furniture group.
    d.polygon([(286,217),(451,217),(463,230),(463,391),(449,402),(285,402),(276,388),(276,230)],fill='#384a3b',outline='#938b5a')
    for inset in (5,10):d.rectangle((282+inset,222+inset,457-inset,396-inset),outline='#556247' if inset==5 else '#7b7950')
    for yy in range(243,385,17):
        for xx in range(303,445,18):d.line((xx-4,yy,xx,yy-3,xx+4,yy,xx,yy+3,xx-4,yy),fill='#4c5b40')
    colliders=[];placements=[]
    def wall(x,y,w,h):
        colliders.append({'x':x,'y':y,'width':w,'height':h})
        d.rectangle((x+4,y+5,x+w+4,y+h+5),fill='#111c23')
        box(d,(x,y,x+w-1,y+h-1),'#3f493e',highlight='#b9ab7c')
        d.line((x+1,y+h-4,x+w-2,y+h-4),fill='#7f8060')
        d.line((x+1,y+h-2,x+w-2,y+h-2),fill='#273b30')
    wall(64,48,640,16);wall(64,64,16,368);wall(688,64,16,368)
    wall(80,416,112,16);wall(240,416,400,16);wall(256,64,16,144)
    # Cloth curtain on the alcove divider, with a visible opening below it.
    for x in range(257,270,3):d.line((x,69,x,199),fill='#667a54' if x%2 else '#344f3e')
    def put(name,x,y,solid=True):
        p=PROP_IMAGES[name];w,h=p.size
        if name!='door':
            sh=Image.new('RGBA',p.size,(4,12,17,0));sh.putalpha(p.getchannel('A').point(lambda a:a*2//5));im.alpha_composite(sh,(x+4,y+5));im.alpha_composite(p,(x,y))
        placements.append({'name':name,'x':x,'y':y,'width':w,'height':h})
        if solid:colliders.append({'x':x+3,'y':y+3,'width':w-6,'height':h-6})
    put('bed',112,96);put('cabinet',200,88);put('window',116,67,False)
    put('desk',384,92);put('chair',412,161,False)
    put('sofa',288,231);put('table',322,286);put('tv',304,333)
    put('counter',536,84);put('fridge',636,139);put('window',556,67,False)
    # A compact wooden side table grounds the telephone without extra collision.
    box(d,(454,195,509,246),'#62503d',highlight='#b39b70')
    box(d,(457,198,506,237),'#85724f',highlight='#c1a574')
    for xx in (461,481,500):d.line((xx,201,xx,235),fill='#927e57')
    d.line((458,241,505,241),fill='#b29a6a');d.line((461,245,469,245),fill='#2d372d');d.line((496,245,504,245),fill='#2d372d')
    placements.append({'name':'telephone-side-table','x':454,'y':195,'width':56,'height':52})
    put('phone',462,201);put('cabinet',596,344)
    put('plant',87,224)
    put('door',192,384,False);put('door',640,384,False)
    # Compact square breakfast table, one chair, recognisable used dishes.
    box(d,(540,181,586,216),'#746b4c',highlight='#c9b47d')
    box(d,(543,184,583,210),'#aa9c70',highlight='#dfc893')
    for x,y in [(550,189),(566,196)]:d.ellipse((x,y,x+11,y+8),fill='#d0c6a1',outline='#81775e');d.ellipse((x+3,y+2,x+8,y+6),outline='#aaa184')
    colliders.append({'x':542,'y':183,'width':43,'height':31});placements.append({'name':'breakfast-table','x':540,'y':181,'width':47,'height':36})
    put('chair',598,185)
    # Personal studio props: coat stand, record console and one unpacked carton.
    box(d,(101,321,157,359),'#584d3b',highlight='#a79166')
    box(d,(106,325,152,350),'#333b32',highlight='#7f8465')
    d.ellipse((110,329,134,347),fill='#101f22',outline='#657368');d.ellipse((119,335,125,341),fill='#bf9871')
    d.line((145,329,143,340,133,340),fill='#b6ac8b',width=2)
    for x in range(107,153,5):d.line((x,354,x+2,354),fill='#9d8967')
    colliders.append({'x':103,'y':323,'width':53,'height':34});placements.append({'name':'record-console','x':101,'y':321,'width':57,'height':39})
    d.line((213,286,213,332),fill='#9b8e65',width=3);d.line((201,296,224,296),fill='#827856',width=2)
    d.polygon([(203,294),(215,294),(223,302),(219,307),(216,305),(216,324),(204,324),(204,305),(199,309),(194,303)],fill='#3f5261',outline='#203a3d')
    d.line((207,300,207,321),fill='#76817b');d.ellipse((202,330,225,334),fill='#304033',outline='#8e8662')
    colliders.append({'x':201,'y':294,'width':22,'height':40});placements.append({'name':'coat-stand','x':194,'y':286,'width':32,'height':49})
    box(d,(173,364,209,395),'#6d6246',highlight='#b4a070');d.line((190,365,190,394),fill='#b5a075',width=4)
    d.polygon([(173,364),(168,356),(187,359),(190,365)],fill='#8f7b53',outline='#4b513a')
    d.polygon([(191,364),(208,355),(217,361),(209,370)],fill='#947b55',outline='#4b513a')
    colliders.append({'x':175,'y':366,'width':32,'height':27});placements.append({'name':'unpacked-box','x':168,'y':355,'width':50,'height':41})
    # Desk focal point: task papers, pin board, lamp, tumbler and visible cord.
    box(d,(350,69,382,104),'#615b3e',highlight='#c4b179')
    for x,y in [(354,74),(367,77),(360,90)]:
        d.rectangle((x,y,x+10,y+10),fill='#c6bf98');d.line((x+2,y+4,x+8,y+4),fill='#8e8667');d.point((x+5,y+1),fill='#b45752')
    d.ellipse((484,103,500,111),fill='#a49a6e',outline='#2e4634');d.line((491,108,491,130),fill='#596448',width=2);d.ellipse((484,129,499,134),fill='#3d5039',outline='#9c9d6e')
    d.polygon([(480,101),(484,91),(499,91),(504,101)],fill='#bdbb7d',outline='#445b3e')
    d.line((479,150,493,151,497,172,485,185),fill='#24392f',width=2)
    # Phone-side ashtray, folded contract and spilled coffee create a story path.
    for x,y in [(447,209),(435,197),(386,315),(161,226),(216,245),(251,367)]:
        d.polygon([(x,y+1),(x+12,y),(x+14,y+10),(x+2,y+12)],fill='#bbb794',outline='#67684b')
        d.line((x+3,y+4,x+10,y+4),fill='#868568');d.line((x+4,y+7,x+11,y+7),fill='#868568')
    d.ellipse((445,239,456,247),fill='#273e32',outline='#a7aa83');d.line((451,239,456,237),fill='#d0bc8e')
    for x,y in [(397,322),(224,368),(571,165)]:d.ellipse((x-7,y-3,x+9,y+4),fill='#3c4030')
    for x,y in [(132,214),(142,218)]:d.ellipse((x,y,x+6,y+12),fill='#7b7961',outline='#aaa48c')
    # Kitchen dishes, kettle, hanging utensil rail and a modest runner.
    for x,y in [(580,96),(587,100),(573,102)]:d.ellipse((x,y,x+8,y+5),fill='#c5c6a6',outline='#7e8a70')
    d.ellipse((609,103,622,116),fill='#a9aaa0',outline='#526a64');d.arc((620,105,628,114),270,90,fill='#a2aa96',width=2);d.rectangle((612,101,618,103),fill='#525f4d')
    d.line((600,75,651,75),fill='#b1ae88',width=2)
    for x in (607,620,634,645):d.line((x,76,x,85),fill='#9f9f84');d.ellipse((x-2,84,x+2,89),fill='#536b61',outline='#aab39a')
    d.rectangle((541,224,629,236),fill='#6f5642');d.line((543,228,627,228),fill='#a68d62');d.line((543,232,627,232),fill='#937553')
    # A few quiet wall accents; no duplicate furniture or arbitrary box fields.
    for x,y,col in [(298,83,'#677c55'),(300,142,'#8c6e48'),(92,282,'#577364')]:
        box(d,(x,y,x+29,y+23),'#9d8f67',highlight='#c7b281');d.rectangle((x+4,y+4,x+25,y+19),fill='#253a32');d.polygon([(x+5,y+17),(x+12,y+7),(x+24,y+17)],fill=col)
    # Broad emerald-to-amber-to-crimson illumination, hand-built original geometry.
    px=im.load();lights=[(108,151,285,(53,222,130),.62),(415,155,260,(232,182,65),.54),(678,199,280,(225,45,66),.57),(596,386,150,(125,47,109),.28)]
    for y in range(64,416):
        for x in range(80,688):
            col=px[x,y]
            for lx,ly,r,c,power in lights:
                distance=math.hypot(x-lx,y-ly)
                if distance<r:
                    alpha=(1-distance/r)*power;col=tuple(int(col[k]*(1-alpha)+c[k]*alpha) for k in range(3))+(255,)
            px[x,y]=col
    d=ImageDraw.Draw(im)
    d.line((85,78,85,193),fill='#88e4ad',width=2);d.line((282,58,484,58),fill='#e1cd85',width=2);d.line((691,99,691,247),fill='#ed6876',width=2)
    save(im,'apartment.png')
    interactions=[{'id':'computer','x':428,'y':126,'label':'ОТКРЫТЬ СПИСОК ДЕЛ','radius':66},{'id':'telephone','x':479,'y':227,'label':'ОТВЕТИТЬ НА ЗВОНОК','radius':58},{'id':'cabinet','x':618,'y':383,'label':'ПРОВЕРИТЬ СНАРЯЖЕНИЕ','radius':56},{'id':'television','x':344,'y':384,'label':'ПОСМОТРЕТЬ ТЕЛЕВИЗОР','radius':58},{'id':'exit','x':216,'y':409,'label':'ВЫЙТИ ИЗ КВАРТИРЫ','radius':53},{'id':'training','x':661,'y':405,'label':'НАЧАТЬ ТРЕНИРОВКУ','radius':53}]
    data={'id':'apartment','name':'СТУДИЯ / ПОСЛЕ ПОЛУНОЧИ','width':768,'height':480,'tileSize':16,'spawn':{'x':204,'y':232},'colliders':colliders,'interactions':interactions,'placements':placements,'art':'apartment.png','coordinateSystem':'top-left pixel; colliders absolute; spawn/interactions center points','trainingArea':{'x':500,'y':260,'width':145,'height':70},'design':'Original compact open studio; sleeping alcove and shared living/work/kitchen space; emerald/amber/crimson light'}
    (OUT/'apartment.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    tiled={'type':'map','version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down','width':48,'height':30,'tilewidth':16,'tileheight':16,'infinite':False,'nextlayerid':4,'nextobjectid':len(colliders)+7,'tilesets':[],'layers':[{'id':1,'name':'Studio artwork','type':'imagelayer','image':'apartment.png','x':0,'y':0,'opacity':1,'visible':True},{'id':2,'name':'Collisions','type':'objectgroup','opacity':1,'visible':False,'objects':[{'id':i+1,'name':f'solid-{i}','type':'solid','rotation':0,'visible':True,**c} for i,c in enumerate(colliders)]},{'id':3,'name':'Interactions','type':'objectgroup','opacity':1,'visible':True,'objects':[{'id':len(colliders)+i+1,'name':v['id'],'type':'interaction','x':v['x'],'y':v['y'],'width':0,'height':0,'point':True,'rotation':0,'visible':True,'properties':[{'name':'label','type':'string','value':v['label']},{'name':'radius','type':'int','value':v['radius']}]} for i,v in enumerate(interactions)]}],'properties':[{'name':'spawnX','type':'int','value':204},{'name':'spawnY','type':'int','value':232}]}
    (OUT/'apartment.tiled.json').write_text(json.dumps(tiled,indent=2,ensure_ascii=False)+'\n')

ACTIONS=['idle','walk','run','aim','shoot','reload','melee','hit','death','wake']


def actor_frame(action, frame, enemy=False):
    im=Image.new('RGBA',(32,32));d=ImageDraw.Draw(im)
    shirt='#923d59' if enemy else '#b69c8c';light='#d36576' if enemy else '#efc7a7'
    pants='#484e68' if enemy else '#426386'
    stride=round(math.sin(frame/8*math.tau)*(3 if action=='run' else 2)) if action in ('walk','run') else 0
    if action=='death' or (action=='wake' and frame<3):
        progress=frame if action=='death' else 7-frame
        if action=='death' and frame<4:
            return actor_frame('idle',0,enemy).rotate(-frame*19,resample=Image.Resampling.NEAREST)
        d.ellipse((3,11,24,26),fill=(40,17,35,100))
        d.polygon([(5,17),(9,12),(19,12),(25,17),(22,22),(12,24),(6,21)],fill=shirt,outline=INK)
        d.rectangle((3,14,10,17),fill=pants);d.rectangle((3,21,11,24),fill=pants)
        d.ellipse((19,15,26,22),fill='#bd8b77',outline=INK);d.rectangle((20,14,25,17),fill='#25202c')
        if action=='death' and progress>3:d.line((15,25,26,25),fill='#792b4b')
        return im
    # Ground contact, separated legs and shoes make the overhead facing clear.
    d.ellipse((3,7,28,27),fill=(8,10,20,100))
    # Long separately shaded trousers stay visible behind the shoulders.
    box(d,(5-stride,9,15,14),pants,highlight='#7893b0')
    box(d,(5+stride,20,15,25),pants,highlight='#7893b0')
    d.rectangle((3-stride,10,6-stride,14),fill='#151a2b');d.rectangle((3+stride,21,6+stride,25),fill='#151a2b')
    d.line((6-stride,10,6-stride,13),fill='#777e94');d.line((6+stride,21,6+stride,24),fill='#777e94')
    # The red central shirt breaks up the coat, rather than a single beige blob.
    d.polygon([(12,7),(18,7),(22,11),(21,22),(18,26),(12,26),(10,22),(10,11)],fill=shirt,outline=INK)
    d.line((12,9,12,24),fill=light);d.line((14,10,14,23),fill='#795364')
    d.rectangle((15,11,20,23),fill='#4e2c45' if enemy else '#83374f')
    d.line((16,12,16,22),fill='#b85a6c');d.rectangle((14,15,17,18),fill='#37283b')
    if not enemy:d.line((10,13,10,22),fill='#78b7c2')
    # Compact dark crown and small face edge make the head distinct from hands.
    d.ellipse((19,12,27,21),fill='#211d2b',outline='#0a111c')
    d.polygon([(25,14),(28,15),(28,18),(26,20),(24,19),(25,17)],fill='#ca967c')
    d.line((21,13,24,13),fill='#7e514b');d.point((28,17),fill='#f4c6a0')
    if enemy:d.line((25,16,28,16),fill='#131827')
    recoil=-2 if action=='shoot' and frame in (1,2) else 0
    ay=10 if action=='reload' and frame%4<2 else 21
    d.line((17,8,23+recoil,10),fill=light,width=3)
    d.line((16,25,24+recoil,ay+2),fill=shirt,width=3)
    d.rectangle((23+recoil,9,25+recoil,11),fill='#d09b82')
    d.rectangle((23+recoil,ay+1,25+recoil,ay+3),fill='#d09b82')
    if action in ('aim','shoot','reload'):
        box(d,(23+recoil,13,31+recoil,16),'#88959d',highlight='#d5d7cf')
        d.line((29+recoil,14,31+recoil,14),fill='#222b3c')
        d.rectangle((23+recoil,17,25+recoil,20),fill='#272435')
    if action=='shoot' and frame in (1,2):
        d.polygon([(29,13),(31,10),(30,14),(31,16),(28,16)],fill='#ffe3a3')
    if action=='melee':
        t=frame/7*math.pi;end=(int(18+12*math.sin(t)),int(16-10*math.cos(t)))
        d.line((17,10,*end),fill=light,width=3);d.ellipse((end[0]-2,end[1]-2,end[0]+2,end[1]+2),fill='#e0ae90',outline=INK)
    if action=='hit':d.line((9,7,16,4,23,7),fill='#e77791' if frame%2 else '#ffd5bb')
    if action=='wake':im=im.rotate((7-frame)*6,resample=Image.Resampling.NEAREST)
    if action=='idle' and frame>=4:im=im.transform((32,32),Image.Transform.AFFINE,(1,0,0,0,1,-1),resample=Image.Resampling.NEAREST)
    return im


def make_sprites():
    for name,enemy in [('player',False),('enemy',True)]:
        sheet=Image.new('RGBA',(256,320))
        for row,action in enumerate(ACTIONS):
            for col in range(8):sheet.alpha_composite(actor_frame(action,col,enemy),(col*32,row*32))
        save(sheet,name+'.png')
        if enemy:
            gunner=sheet.copy();px=gunner.load()
            for y in range(gunner.height):
                for x in range(gunner.width):
                    r,g,b,a=px[x,y]
                    if a and (r,g,b) in [(146,61,89),(211,101,118)]:px[x,y]=(r//2,min(255,g+37),min(255,b+44),a)
            save(gunner,'enemy-gunner.png')
    # All props share their production source pixels with the composed apartment.
    atlas=Image.new('RGBA',(512,320));frames={};x=y=row_h=0
    for name,p in PROP_IMAGES.items():
        w,h=p.size
        if x+w>512:x=0;y+=row_h+4;row_h=0
        atlas.alpha_composite(p,(x,y));frames[name]={'x':x,'y':y,'width':w,'height':h,'anchor':{'x':w//2,'y':h//2},'solidBounds':{'x':3,'y':3,'width':w-6,'height':h-6}}
        x+=w+4;row_h=max(row_h,h)
    save(atlas,'props.png')
    tile_atlas=Image.new('RGBA',(64,64))
    for row,kind in enumerate(['wood','tile','carpet','wall']):
        for col in range(4):tile_atlas.alpha_composite(floor_tile(kind,col),(col*16,row*16))
    save(tile_atlas,'tiles.png')
    return frames


def make_environment():
    phone=Image.new('RGBA',(160,44));screen=Image.new('RGBA',(128,32));tv=Image.new('RGBA',(128,32));neon=Image.new('RGBA',(128,16));doors=Image.new('RGBA',(192,48))
    for i in range(4):
        p=PROP_IMAGES['phone'].copy();d=ImageDraw.Draw(p)
        if i%2:d.line((5,3,2,0),fill='#ffb5c3');d.line((34,3,38,0),fill='#ffb5c3')
        if i in (1,2):p=p.transform(p.size,Image.Transform.AFFINE,(1,0,(-1 if i==1 else 1),0,1,0),resample=Image.Resampling.NEAREST)
        phone.alpha_composite(p,(i*40,0))
        si=Image.new('RGBA',(32,32));sd=ImageDraw.Draw(si);box(sd,(0,0,31,31),'#143543',highlight='#6ecbd0')
        for yy in range(4,27,4):sd.line((4,yy,24-(yy+i)%9,yy),fill='#9ce9d9')
        sd.rectangle((4+(i*5)%20,26,7+(i*5)%20,28),fill='#d2fff1');screen.alpha_composite(si,(i*32,0))
        ti=Image.new('RGBA',(32,32),'#504362');td=ImageDraw.Draw(ti)
        grain(td,(1,1,30,30),['#b784ab','#75516f','#dbb2c2','#302d44'],650,i+77)
        for yy in range(0,32,3):td.line((0,yy,31,yy),fill='#3e344f')
        tv.alpha_composite(ti,(i*32,0))
        ni=Image.new('RGBA',(32,16));nd=ImageDraw.Draw(ni);col=['#e35b9f','#9a3b72','#f59cbc','#dc518b'][i]
        box(nd,(0,5,31,10),'#63304e',edge=INK);nd.line((2,7,29,7),fill=col,width=2);neon.alpha_composite(ni,(i*32,0))
        door=PROP_IMAGES['door'].copy();squash=door.resize((max(5,48-i*13),48),Image.Resampling.NEAREST);doors.alpha_composite(squash,(i*48,0))
    for name,p in [('phone-ring',phone),('computer-screen',screen),('tv-static',tv),('neon-flicker',neon),('doors',doors)]:save(p,name+'.png')
    effects=Image.new('RGBA',(128,64));ed=ImageDraw.Draw(effects)
    for i in range(8):
        x=i*16;t=i/7
        ed.polygon([(x+1,8),(x+5,5-i//2),(x+7,1+i),(x+9,6),(x+14-i,8),(x+9,10),(x+7,14-i),(x+5,10)],fill='#ffe5a5' if i<3 else '#db855b')
        for angle in range(0,360,60):
            a=math.radians(angle);r=2+i;xx=x+8+int(math.cos(a)*r);yy=24+int(math.sin(a)*r)
            ed.line((x+8,24,xx,yy),fill='#ffe2a9' if i<3 else '#b66a76')
        ed.ellipse((x+5-i//2,37-i//3,x+10+i//2,43+i//3),fill=(135,124,148,150-i*15))
        ed.line((x+5,57,x+8+(i%3),57+i%2),fill='#ddae74',width=2)
    save(effects,'effects.png')


def make_combat():
    """Original printworks, six connected rooms and a protected dispatch entry."""
    rr=random.Random(89111)
    im=Image.new('RGBA',(768,480),'#0b111c');d=ImageDraw.Draw(im)
    for y in range(0,480,16):
        for x in range(0,768,16):
            d.rectangle((x,y,x+15,y+15),fill='#161c29' if (x//16+y//16)%2 else '#1a2030')
            d.line((x,y,x+15,y),fill='#26313d')
    for y in range(40,432,16):
        for x in range(40,728,16):
            kind='carpet' if x<240 and y<224 else 'tile'
            im.alpha_composite(floor_tile(kind,(x//16+y//16*3)%4),(x,y))
    d=ImageDraw.Draw(im)
    # Continuous service passage in purple/red brick, visually separate from workrooms.
    for y in range(240,288,8):
        for x in range(40,728,16):
            off=8 if y%16 else 0
            box(d,(x+off,y,x+off+15,y+7),'#453043',edge='#272638',highlight='#664554')
    for x in range(48,720,8):d.line((x,244,x+3,244),fill='#a05b76');d.line((x,284,x+3,284),fill='#6c405b')
    # Worn markings and stains use low contrast, preserving solid boundaries.
    for _ in range(950):
        x=rr.randrange(42,726);y=rr.randrange(42,430)
        d.line((x,y,x+rr.randrange(1,5),y),fill=rr.choice(['#47414e','#514753','#34343f','#68535e']))
    for x,y in [(278,168),(586,188),(331,398),(682,352)]:
        d.ellipse((x-13,y-7,x+14,y+9),fill='#373440');grain(d,(x-9,y-5,x+10,y+6),['#433643','#4b3948'],45,x+y)
    colliders=[];placements=[]
    def wall(x,y,w,h):
        colliders.append({'x':x,'y':y,'width':w,'height':h})
        d.rectangle((x+4,y+5,x+w+3,y+h+4),fill='#181c29')
        box(d,(x,y,x+w-1,y+h-1),'#434655',highlight='#a48a95')
        d.line((x+1,y+h-4,x+w-2,y+h-4),fill='#8b5c79')
        d.line((x+2,y+h-2,x+w-3,y+h-2),fill='#242838')
        for xx in range(x+6,x+w-3,16):d.line((xx,y+3,xx,y+h-5),fill='#63616e')
    wall(24,24,720,16);wall(24,40,16,408);wall(728,40,16,408);wall(40,432,688,16)
    for x in (240,496):wall(x,40,16,184);wall(x,304,16,128)
    # 48px door apertures: OFFICE128..176, PRESS352..400, INK608..656.
    for x,w in [(40,88),(176,176),(400,208),(656,72)]:wall(x,224,w,16)
    for x,w in [(40,88),(176,176),(400,208),(656,72)]:wall(x,288,w,16)
    def place(name,x,y,w,h):
        p=Image.new('RGBA',(w,h));pd=ImageDraw.Draw(p)
        if name=='press':
            box(pd,(0,0,w-1,h-1),'#273a45',highlight='#6b9296')
            box(pd,(4,5,w-5,h-8),'#41636a',highlight='#90a5a0')
            box(pd,(9,10,w-10,h-14),'#1c2b39',highlight='#65868b')
            for yy in range(13,h-15,7):
                box(pd,(12,yy,w-13,yy+4),'#293748',highlight='#819797')
                pd.line((16,yy+2,w-18,yy+2),fill='#b6afad')
            box(pd,(w-23,7,w-7,23),'#272e3e',highlight='#7b858d')
            for xx,c in [(w-20,'#d5ad72'),(w-14,'#d35783')]:pd.rectangle((xx,11,xx+3,14),fill=c)
            pd.rectangle((14,h-12,w-18,h-6),fill='#c3b9ac');pd.line((18,h-10,w-24,h-10),fill='#8d838c')
            for xx in range(4,w-8,10):pd.polygon([(xx,h-4),(xx+4,h-4),(xx+7,h-1),(xx+3,h-1)],fill='#b89a69')
        elif name=='crate':
            box(pd,(0,0,w-1,h-1),'#5b4850',highlight='#b49982')
            for xx in range(6,w-3,9):pd.line((xx,3,xx,h-4),fill='#85675f')
            pd.line((3,3,w-4,h-4),fill='#a68c76',width=3);pd.line((w-4,3,3,h-4),fill='#a68c76',width=3)
            box(pd,(w//2-7,h//2-5,w//2+7,h//2+5),'#cab7a1',highlight='#ded1ba');pd.line((w//2-4,h//2,w//2+4,h//2),fill='#70616b')
        elif name=='paper':
            box(pd,(0,0,w-1,h-1),'#807a83',highlight='#cab9b0')
            for yy in range(4,h-2,4):pd.line((3,yy,w-4,yy),fill='#b8aaa7')
            pd.rectangle((4,2,w-5,7),fill='#d0c2ad');pd.line((w//2,2,w//2,h-2),fill='#685b6c',width=3)
        elif name=='drums':
            for xx in range(0,w-22,24):
                pd.ellipse((xx+1,5,xx+22,h-1),fill='#27383f',outline='#152431')
                pd.rectangle((xx+2,10,xx+21,h-10),fill='#41616a',outline='#182b39')
                pd.line((xx+3,h-13,xx+20,h-13),fill='#789497',width=2)
                pd.ellipse((xx+1,1,xx+22,17),fill='#5f7e82',outline='#a9b0a4')
                pd.ellipse((xx+5,4,xx+18,13),fill='#3b5764',outline='#77928e')
                pd.ellipse((xx+14,5,xx+17,8),fill='#c7b797')
                pd.rectangle((xx+8,20,xx+16,28),fill='#af8b76');pd.line((xx+12,22,xx+12,26),fill='#473546')
        elif name=='cutting-table':
            box(pd,(0,0,w-1,h-1),'#534b5b',highlight='#b4a39b')
            box(pd,(4,4,w-5,h-8),'#797985',highlight='#c4bab3')
            pd.rectangle((9,8,w-19,h-14),fill='#d2c6af')
            for yy in range(12,h-17,5):pd.line((14,yy,w-25,yy),fill='#a59e9d')
            pd.line((w-15,7,w-15,h-12),fill='#273440',width=4);pd.line((w-16,7,w-8,3),fill='#758d96',width=3)
            pd.line((8,h-10,w-8,h-10),fill='#3c4353')
        sh=Image.new('RGBA',p.size,(6,13,24,0));sh.putalpha(p.getchannel('A').point(lambda a:a*2//5));im.alpha_composite(sh,(x+4,y+5));im.alpha_composite(p,(x,y))
        colliders.append({'x':x+1,'y':y+1,'width':w-2,'height':h-2});placements.append({'name':name,'x':x,'y':y,'width':w,'height':h})
    # Office records and press production; no apartment layout or furniture arrangement reused.
    for name,x,y in [('desk',58,60),('cabinet',177,61),('bookshelf',48,151)]:
        p=PROP_IMAGES[name];im.alpha_composite(p,(x,y));w,h=p.size;colliders.append({'x':x+3,'y':y+3,'width':w-6,'height':h-6});placements.append({'name':name,'x':x,'y':y,'width':w,'height':h})
    place('press',276,68,96,64);place('press',392,68,80,64);place('paper',410,163,48,32)
    place('drums',530,65,72,48);place('drums',646,65,72,48);place('crate',534,158,48,48)
    place('crate',58,316,48,48);place('crate',179,365,48,48)
    place('paper',272,319,48,32);place('press',391,323,48,64)
    place('cutting-table',536,328,80,52);place('paper',664,318,48,32)
    # Loose printed sheets, an original registration-mark motif, cable and floor safety cues.
    for x,y in [(183,199),(328,194),(460,155),(694,185),(211,326),(465,401),(572,402)]:
        box(d,(x,y,x+12,y+9),'#c4b9a8',edge='#5c5366',highlight='#e5d2b8')
        for yy in (y+3,y+6):d.line((x+3,yy,x+9,yy),fill='#9a7f8d')
    for x,y in [(300,149),(444,149),(609,138)]:
        d.ellipse((x-4,y-4,x+4,y+4),outline='#c19a91');d.line((x-7,y,x+7,y),fill='#997180');d.line((x,y-7,x,y+7),fill='#997180')
    d.line((277,137,267,137,267,209,306,209),fill='#242734',width=2)
    for cx in (152,376,632):
        for y in (223,288):
            for x in range(cx-24,cx+24,8):d.polygon([(x,y),(x+4,y),(x+7,y+3),(x+3,y+3)],fill='#c6a477')
    # Room identity, machine serials and worn floor stencils use original glyphs.
    for text,x,y,col in [('RECORDS',176,211,'#997386'),('PRESS 01',274,211,'#82989b'),('INK / 04',662,212,'#b18b9e'),('DISPATCH',49,404,'#799b9c'),('LOADING',272,415,'#9e8d97'),('FINISHING',534,412,'#b393aa')]:lettering(d,text,x,y,col)
    for text,x,y in [('R-17',338,74),('R-21',438,74),('R-03',401,328)]:lettering(d,text,x,y,'#b5c1ad')
    lettering(d,'KEEP CLEAR',346,262,'#a66c90')
    lettering(d,'NIGHT SHIFT',542,262,'#8b617d')
    for xx in (85,234,464,698):
        d.line((xx-10,263,xx+8,263),fill='#90647d');d.line((xx+3,259,xx+8,263,xx+3,267),fill='#90647d')
    # Page proofs, folded notes and shred trails stay visual only: routes remain clear.
    for i,(x,y) in enumerate([(72,248),(191,249),(286,279),(449,248),(565,278),(694,249),(157,186),(285,146),(477,194),(610,207),(684,124),(70,376),(215,418),(339,329),(362,409),(627,351),(695,394)]):
        d.polygon([(x,y+2),(x+10,y),(x+13,y+10),(x+2,y+12)],fill='#b4a7a0',outline='#615268')
        d.line((x+3,y+4,x+9,y+3),fill='#876b7e');d.line((x+4,y+7,x+10,y+6),fill='#876b7e')
        if i%3==0:d.line((x+10,y+1,x+9,y+4,x+12,y+4),fill='#e0c6ae')
    for _ in range(90):
        x=rr.choice([rr.randrange(43,124),rr.randrange(182,346),rr.randrange(406,602),rr.randrange(662,720)])
        y=rr.choice([rr.randrange(244,252),rr.randrange(278,285)])
        d.line((x,y,x+rr.randrange(1,4),y+1),fill=rr.choice(['#a38a9c','#79728a','#8d617e']))
    # Looped power cables trace walls; they do not resemble extra solid obstacles.
    for x0,x1 in [(46,118),(187,334),(415,591),(668,719)]:
        d.line((x0,278,x0+10,281,x1-12,281,x1,277),fill='#252336',width=2)
        d.line((x0+2,277,x0+11,280,x1-12,280),fill='#6d5470')
    for x,y in [(379,142),(608,116),(660,178),(280,397)]:
        points=[(x+int(math.cos(i*math.pi/5)*rr.randrange(7,17)),y+int(math.sin(i*math.pi/5)*rr.randrange(4,9))) for i in range(10)]
        d.polygon(points,fill='#333245');grain(d,(x-6,y-3,x+6,y+3),['#584055','#3a4656','#4a344c'],35,x+y)
        for off in (10,17,25):d.ellipse((x+off,y+off//3,x+off+2,y+off//3+1),fill='#3e384d')
    # Pasted work notices and pressure gauges add wall-edge details, not new geometry.
    for x,y in [(228,61),(484,145),(716,178),(228,330),(484,385),(716,365)]:
        box(d,(x-7,y,x+1,y+19),'#bb9b9d',edge='#52465a',highlight='#d6b8ad')
        d.rectangle((x-5,y+3,x-1,y+5),fill='#98506f')
        for yy in (y+9,y+12,y+15):d.line((x-5,yy,x-1,yy),fill='#84677d')
    for x,y in [(301,57),(414,57),(555,119)]:
        d.ellipse((x,y,x+8,y+8),fill='#b8b6ad',outline='#303d4e');d.line((x+4,y+4,x+6,y+2),fill='#78475b')
    # Colored lamp pools preserve hard-edged sprite readability.
    px=im.load();lights=[(50,85,170,(210,27,121),.33),(355,54,190,(43,198,217),.27),(683,155,140,(225,39,88),.34),(616,407,180,(165,36,150),.28),(84,407,130,(43,151,181),.19)]
    for y in range(40,432):
        for x in range(40,728):
            col=px[x,y]
            for lx,ly,r,c,power in lights:
                dist=math.hypot(lx-x,ly-y)
                if dist<r:
                    alpha=round((1-dist/r)*10)/10*power;col=tuple(int(col[k]*(1-alpha)+c[k]*alpha) for k in range(3))+(255,)
            px[x,y]=col
    d=ImageDraw.Draw(im)
    for x,y,w,c in [(62,44,135,'#ed5fbb'),(302,44,131,'#7de7df'),(550,44,132,'#e78396'),(537,424,146,'#b56cd5')]:d.line((x,y,x+w,y),fill=c,width=2)
    # Safe dispatch entrance, independent of mission result UI.
    box(d,(58,414,110,430),'#2b4d58',highlight='#78b2b2')
    for x in range(63,107,8):d.line((x,418,x+3,418),fill='#abc2b7')
    save(im,'combat.png')
    enemies=[{'id':'grunt-1','type':'grunt','x':213,'y':173},{'id':'grunt-2','type':'grunt','x':350,'y':178},{'id':'grunt-3','type':'grunt','x':317,'y':389},{'id':'grunt-4','type':'grunt','x':652,'y':388},{'id':'gunner-1','type':'gunner','x':633,'y':160},{'id':'gunner-2','type':'gunner','x':456,'y':378}]
    data={'id':'combat','name':'NIGHT SHIFT / THE PRINTWORKS','width':768,'height':480,'tileSize':16,'spawn':{'x':96,'y':389},'colliders':colliders,'interactions':[],'enemies':enemies,'placements':placements,'art':'combat.png','coordinateSystem':'top-left pixel; absolute colliders; center spawn and enemy points','design':'Protected empty dispatch start; 48px service corridor and door apertures; four grunts/two gunners'}
    (OUT/'combat.json').write_text(json.dumps(data,indent=2)+'\n')
    tiled={'type':'map','version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down','width':48,'height':30,'tilewidth':16,'tileheight':16,'infinite':False,'nextlayerid':5,'nextobjectid':len(colliders)+7,'tilesets':[],
      'layers':[{'id':1,'name':'Printworks artwork','type':'imagelayer','image':'combat.png','x':0,'y':0,'opacity':1,'visible':True},
      {'id':2,'name':'Collisions','type':'objectgroup','opacity':1,'visible':False,'objects':[{'id':i+1,'name':f'solid-{i}','type':'solid','rotation':0,'visible':True,**c} for i,c in enumerate(colliders)]},
      {'id':3,'name':'Interactions','type':'objectgroup','opacity':1,'visible':True,'objects':[]},
      {'id':4,'name':'Enemies','type':'objectgroup','opacity':1,'visible':True,'objects':[{'id':len(colliders)+i+1,'name':e['id'],'type':e['type'],'x':e['x'],'y':e['y'],'width':0,'height':0,'point':True,'rotation':0,'visible':True,'properties':[{'name':'type','type':'string','value':e['type']}]} for i,e in enumerate(enemies)]}],
      'properties':[{'name':'spawnX','type':'int','value':96},{'name':'spawnY','type':'int','value':389}]}
    (OUT/'combat.tiled.json').write_text(json.dumps(tiled,indent=2)+'\n')


def make_portraits():
    sheet=Image.new('RGBA',(128,64))
    for i in range(2):
        im=Image.new('RGBA',(64,64),'#252035');d=ImageDraw.Draw(im)
        for y in range(64):d.line((0,y,63,y),fill=(34+y//4,23+y//8,47+y//5))
        d.polygon([(3,63),(9,49),(24,43),(43,43),(57,51),(63,63)],fill='#3b3348',outline=INK)
        d.polygon([(22,42),(24,54),(33,63),(40,51),(41,40)],fill='#a66371')
        d.polygon([(16,18),(24,9),(41,10),(49,21),(46,40),(37,49),(27,47),(18,36)],fill='#bb897d',outline=INK)
        d.polygon([(16,29),(14,18),(19,8),(33,4),(46,10),(51,20),(46,29),(44,17),(38,18),(34,13),(26,19),(20,17),(21,30)],fill='#241d2d')
        d.line((20,18,25,12,34,10,45,15),fill='#754559',width=2)
        d.polygon([(42,19),(48,25),(45,39),(37,46),(38,34)],fill='#8e526b')
        d.line((34,25,31,34,36,35),fill='#794b5e');d.line((28,40,38,40),fill='#503247')
        d.point((36,39),fill='#e9b4a1');d.line((24,23,29,23),fill='#42273c');d.line((37,23,43,24),fill='#42273c')
        if i:
            box(d,(18,23,30,30),'#151929',highlight='#a1507c');box(d,(35,23,47,30),'#151929',highlight='#a1507c');d.line((30,25,35,25),fill='#222039',width=2)
            d.polygon([(13,56),(23,48),(31,61),(34,63),(12,63)],fill='#6c3d62')
        else:
            d.point((26,26),fill='#181d29');d.point((40,26),fill='#181d29');d.line((27,45,34,47,40,43),fill='#57394d')
        d.line((18,19,18,34,25,44),fill='#ed6b9e',width=2);d.line((45,21,46,34),fill='#68b5bf')
        for y in range(0,64,3):
            for x in range(64):
                r,g,b,a=im.getpixel((x,y));im.putpixel((x,y),(r*9//10,g*9//10,b*9//10,a))
        sheet.alpha_composite(im,(i*64,0))
    save(sheet,'portraits.png')


def make_skyline():
    im=Image.new('RGBA',(768,480));d=ImageDraw.Draw(im)
    for y in range(480):
        t=y/480;d.line((0,y,767,y),fill=(int(18+29*math.sin(t*math.pi)),int(15+5*t),int(38+28*math.sin(t*math.pi))))
    # Film-like sparse pixels and original striped sun.
    for _ in range(1800):
        x=RNG.randrange(768);y=RNG.randrange(480);d.point((x,y),fill=RNG.choice(['#502139','#612541','#35213e','#262038']))
    sun=Image.new('RGBA',(200,200));sd=ImageDraw.Draw(sun);sd.ellipse((2,2,197,197),fill='#df637d')
    for y in range(25,200,8):sd.rectangle((0,y,199,y+2+(y//40)),fill=(0,0,0,0))
    im.alpha_composite(sun,(500,90));d=ImageDraw.Draw(im)
    for layer in range(3):
        rr=random.Random(810+layer);x=0;base=340+layer*38
        while x<768:
            w=rr.randrange(22,65);h=rr.randrange(45,130)+layer*10;top=base-h
            color=['#282039','#1c1c31','#121827'][layer]
            d.rectangle((x,top,x+w,479),fill=color);d.rectangle((x+w//3,top-rr.randrange(3,16),x+w*2//3,top),fill=color)
            if layer<2:
                for yy in range(top+9,base,9):
                    for xx in range(x+5,x+w-4,8):
                        if rr.random()<.48:d.rectangle((xx,yy,xx+2,yy+3),fill=rr.choice(['#6b3f62','#a95578','#3d7482','#c27283']))
            x+=w+rr.randrange(4,10)
    # Rooftop antennas and an original exchange tower.
    for x,y in [(83,238),(272,233),(461,257),(731,242)]:
        d.line((x,y,x,y-42),fill='#111626',width=2);d.line((x-11,y-28,x+11,y-28),fill='#111626',width=2)
    d.line((620,335,620,180),fill='#101625',width=4);d.line((599,330,620,193,641,330),fill='#111727',width=3)
    for y in range(220,325,20):d.line((607,y,633,y+14),fill='#14182a',width=2)
    d.ellipse((618,178,622,182),fill='#ee6692')
    # Palm silhouettes, asymmetric hand-built fronds rather than stock shapes.
    for cx,cy,scale in [(57,282,1),(696,286,.85)]:
        trunk=[(cx-6,420),(cx-1,350),(cx+8,cy+20),(cx+12,cy),(cx+17,cy+2),(cx+14,cy+28),(cx+7,354),(cx+3,420)]
        d.polygon(trunk,fill='#0d1423')
        for angle,length in [(-155,65),(-125,75),(-85,54),(-40,68),(2,71),(32,61),(165,62)]:
            a=math.radians(angle);ex=cx+int(math.cos(a)*length*scale);ey=cy+int(math.sin(a)*length*.58*scale)
            d.polygon([(cx+12,cy),(ex,ey),(ex+8,ey+10),(cx+10,cy+9)],fill='#0d1423')
            for t in (.35,.5,.65,.8):
                xx=int(cx+12+(ex-cx-12)*t);yy=int(cy+(ey-cy)*t)
                d.line((xx,yy,xx-8,yy+18),fill='#0d1423',width=3)
    d.rectangle((0,422,767,479),fill='#111624')
    for y in range(427,480,5):
        for _ in range(10):
            x=RNG.randrange(768);d.line((x,y,x+RNG.randrange(3,28),y),fill=RNG.choice(['#39243c','#292a43','#493047','#22515c']))
    d.line((0,446,767,446),fill='#6c3452');d.line((0,448,767,448),fill='#261b30')
    for y in range(0,480,3):
        for x in range(0,768):
            r,g,b,a=im.getpixel((x,y));im.putpixel((x,y),(r*9//10,g*9//10,b*9//10,a))
    save(im,'skyline.png')


def make_training():
    """Separate original industrial practice room; no apartment pixels reused."""
    im=Image.new('RGBA',(768,480),'#08151d');d=ImageDraw.Draw(im);rr=random.Random(198931)
    for y in range(64,416,16):
        for x in range(80,688,16):
            c=rr.choice(['#3f5555','#435858','#465b59','#3e5254'])
            d.rectangle((x,y,x+15,y+15),fill=c)
            d.line((x,y+15,x+15,y+15),fill='#35494d')
            if (x+y)%48==0:d.line((x,y,x,y+15),fill='#35494d')
            grain(d,(x+2,y+2,x+13,y+13),['#536765','#344b4e','#5b6d67'],7,x+y)
    colliders=[];placements=[]
    def solid(name,x,y,w,h):
        colliders.append({'x':x,'y':y,'width':w,'height':h});placements.append({'name':name,'x':x,'y':y,'width':w,'height':h})
    def wall(x,y,w,h):
        solid('wall',x,y,w,h)
        d.rectangle((x+4,y+5,x+w+4,y+h+5),fill='#152832')
        box(d,(x,y,x+w-1,y+h-1),'#425a5b',highlight='#97b3a8')
        d.line((x+1,y+h-4,x+w-2,y+h-4),fill='#6e9089')
        for xx in range(x+5,x+w-4,16):d.line((xx,y+3,xx,y+h-6),fill='#4e6e6d')
    wall(64,48,640,16);wall(64,64,16,368);wall(688,64,16,368);wall(80,416,608,16)
    wall(288,64,16,136)
    # Large original illuminated room title and safety narrative poster.
    box(d,(329,76,653,121),'#172e38',highlight='#72aaa5')
    lettering(d,'ТРЕНИРОВКА / 1989',354,88,'#b6e3ce',3)
    d.line((334,115,647,115),fill='#ac9f68')
    box(d,(102,82,266,163),'#18333a',highlight='#a8bc9c')
    lettering(d,'ПРАВИЛА ТИРА',115,93,'#ddd09b',2)
    for text,y in [('1 НЕ ЦЕЛЬСЯ В ЛЮДЕЙ',116),('2 ПАТРОНЫ УЧЕБНЫЕ',130),('3 БЛИЖНИЙ БОЙ РЯДОМ',144)]:lettering(d,text,113,y,'#9cb9a7')
    # Check-in bench: gloves, ear protection, foam gear, magazine-shaped training props.
    box(d,(103,190,262,234),'#43564e',highlight='#a6a57e')
    box(d,(107,194,258,224),'#817d5c',highlight='#c4b58a')
    for x in (114,139):
        d.polygon([(x,202),(x+8,200),(x+13,204),(x+11,216),(x+2,217),(x,212)],fill='#627d73',outline='#203d40')
        d.line((x+3,205,x+8,207),fill='#a6b3a1')
    d.arc((169,195,194,219),180,360,fill='#bcc0a7',width=3)
    box(d,(169,205,176,217),'#263b40',highlight='#72897d');box(d,(188,205,195,217),'#263b40',highlight='#72897d')
    for x in (215,226,237):box(d,(x,201,x+7,218),'#4c5d5a',highlight='#a0a58c')
    solid('safety-bench',103,190,160,44)
    # Equipment lockers with vents and individual labels; separated from the lane.
    for i,x in enumerate((104,146,188)):
        box(d,(x,318,x+36,395),'#3c595d',highlight='#87aaa3')
        box(d,(x+4,323,x+32,390),'#45676a',highlight='#6c9691')
        for yy in (329,334,339):d.line((x+9,yy,x+27,yy),fill='#1e4249')
        d.rectangle((x+27,354,x+29,366),fill='#b9b59a')
        lettering(d,'0'+str(i+1),x+11,378,'#b6c9b3')
        solid('equipment-locker',x,318,37,78)
    # Ribbed bullet catcher, independent of the living-room furniture family.
    box(d,(651,228,678,350),'#263e48',highlight='#9eb6a9')
    for yy in range(235,345,9):
        d.polygon([(654,yy),(674,yy-2),(674,yy+3),(654,yy+6)],fill='#526d6d',outline='#1c343e')
    solid('bullet-catcher',651,228,28,123)
    # Low safety partitions leave 530,290 -> 604,290 entirely unobstructed.
    for x,y,w,h in [(340,224,91,14),(340,342,91,14),(465,160,154,14)]:
        box(d,(x,y,x+w-1,y+h-1),'#36585d',highlight='#83aaa0');solid('safety-baffle',x,y,w,h)
        for xx in range(x+3,x+w-6,10):d.polygon([(xx,y+2),(xx+5,y+2),(xx+9,y+6),(xx+4,y+6)],fill='#bdab73')
    # Painted lanes: arrows, distance hashes and a clear live-dummy floor pad.
    for y in (251,330):
        d.line((445,y,641,y),fill='#b7b681',width=2)
        for xx in range(447,639,12):d.line((xx,y+3,xx+5,y+3),fill='#526962')
    for x in (472,522,572,622):d.line((x,252,x,258),fill='#c3c397');d.line((x,322,x,329),fill='#c3c397')
    d.polygon([(510,288),(500,280),(500,285),(480,285),(480,291),(500,291),(500,296)],fill='#9cab8b')
    d.ellipse((583,269,625,311),outline='#a4c1a2',width=2);d.ellipse((589,275,619,305),outline='#6b9c91')
    d.line((604,264,604,271),fill='#b6ceaf');d.line((604,310,604,317),fill='#b6ceaf')
    lettering(d,'МАНЕКЕН',590,319,'#bdc9a3')
    lettering(d,'СТРЕЛЬБА / БЛИЖНИЙ БОЙ',450,242,'#d1c58d')
    lettering(d,'УЧЕБНЫЕ ПАТРОНЫ',468,355,'#b2c3a6')
    # A drain, coiled cable, paper inspection card, casings and wear tell the room's story.
    box(d,(246,362,278,395),'#243d45',highlight='#6d8c84')
    for yy in range(366,392,4):d.line((250,yy,274,yy),fill='#708b80')
    d.ellipse((112,266,153,293),outline='#182f39',width=3);d.ellipse((117,269,148,290),outline='#789184')
    d.line((151,282,180,290,231,284,271,302),fill='#1c343d',width=2)
    for x,y in [(313,381),(322,377),(552,307),(544,311),(562,313)]:d.line((x,y,x+4,y+1),fill='#baa775',width=2)
    for x,y in [(277,255),(381,187),(625,378)]:
        box(d,(x,y,x+14,y+11),'#bcc0a5',edge='#5c796e');d.line((x+3,y+4,x+11,y+4),fill='#7e9684')
    for x,y in [(254,311),(450,292),(639,211)]:d.ellipse((x,y,x+13,y+6),fill='#33474a')
    # Exit floor pad is scene-owned E return interaction, not a floating door sprite.
    box(d,(468,371,536,409),'#284e53',highlight='#b4c9ab')
    d.line((478,390,523,390),fill='#cbd0a3',width=2);d.line((483,384,477,390,483,396),fill='#cbd0a3',width=2)
    lettering(d,'В КВАРТИРУ',480,401,'#c4d3b4')
    lettering(d,'БЕЗОПАСНАЯ ЗОНА',104,244,'#a9bfa5')
    # Restricted teal/amber light, readable target lane and restrained red warning accent.
    px=im.load();lights=[(230,93,250,(40,183,166),.32),(554,286,240,(73,172,176),.25),(116,384,135,(198,155,72),.18),(682,190,110,(200,60,83),.22)]
    for y in range(64,416):
        for x in range(80,688):
            col=px[x,y]
            for lx,ly,r,c,power in lights:
                distance=math.hypot(x-lx,y-ly)
                if distance<r:
                    alpha=(1-distance/r)*power;col=tuple(int(col[k]*(1-alpha)+c[k]*alpha) for k in range(3))+(255,)
            px[x,y]=col
    d=ImageDraw.Draw(im)
    d.line((90,58,271,58),fill='#7cdfc3',width=2);d.line((333,58,653,58),fill='#b6e7c7',width=2);d.line((695,126,695,209),fill='#d76d75',width=2)
    save(im,'training.png')
    interactions=[{'id':'training','x':500,'y':390,'label':'ВЕРНУТЬСЯ В КВАРТИРУ','radius':65}]
    data={'id':'training','name':'ТИР / УЧЕБНЫЕ ПАТРОНЫ','width':768,'height':480,'tileSize':16,'spawn':{'x':530,'y':290},'colliders':colliders,'interactions':interactions,'enemies':[{'id':'practice-dummy','type':'grunt','x':604,'y':290}],'placements':placements,'art':'training.png','coordinateSystem':'top-left pixel; absolute collider rectangles; center spawn/interaction points','design':'Separate original safe industrial firing range; one reusable live shooting/melee dummy; temporary ammunition only'}
    (OUT/'training.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    tiled={'type':'map','version':'1.10','tiledversion':'1.11.2','orientation':'orthogonal','renderorder':'right-down','width':48,'height':30,'tilewidth':16,'tileheight':16,'infinite':False,'nextlayerid':4,'nextobjectid':len(colliders)+2,'tilesets':[],'layers':[{'id':1,'name':'Training artwork','type':'imagelayer','image':'training.png','x':0,'y':0,'opacity':1,'visible':True},{'id':2,'name':'Collisions','type':'objectgroup','opacity':1,'visible':False,'objects':[{'id':i+1,'name':f'solid-{i}','type':'solid','rotation':0,'visible':True,**c} for i,c in enumerate(colliders)]},{'id':3,'name':'Interactions','type':'objectgroup','opacity':1,'visible':True,'objects':[{'id':len(colliders)+1,'name':'training','type':'interaction','x':500,'y':390,'width':0,'height':0,'point':True,'rotation':0,'visible':True,'properties':[{'name':'label','type':'string','value':interactions[0]['label']},{'name':'radius','type':'int','value':65}]}]}],'properties':[{'name':'spawnX','type':'int','value':530},{'name':'spawnY','type':'int','value':290}]}
    (OUT/'training.tiled.json').write_text(json.dumps(tiled,indent=2,ensure_ascii=False)+'\n')
    manifest_path=OUT/'art-manifest.json'
    if manifest_path.exists():
        manifest=json.loads(manifest_path.read_text());manifest['backgrounds']['training']={'file':'training.png','geometry':'training.json','tiled':'training.tiled.json','width':768,'height':480,'layout':'separate-industrial-range'}
        manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    print('Generated separate training room and matching JSON/Tiled data.')


def main():
    make_apartment();props=make_sprites();make_portraits();make_skyline();make_environment();make_combat();make_training()
    anim={}
    for row,action in enumerate(ACTIONS):
        anim[action]={'row':row,'frames':[row*8+i for i in range(8)],'fps':{'idle':5,'walk':10,'run':14,'aim':6,'shoot':18,'reload':10,'melee':18,'hit':18,'death':12,'wake':8}[action],'loop':action in ['idle','walk','run','aim']}
    manifest={'version':1,'provenance':'Original procedural raster artwork; scripts/generate-art.py; no third-party image inputs','world':{'width':768,'height':480,'tileSize':16,'displayZoom':2},
      'characters':{'files':['player.png','enemy.png','enemy-gunner.png'],'frameWidth':32,'frameHeight':32,'columns':8,'rows':10,'facing':'east; rotate runtime body around anchor','anchor':{'x':16,'y':16},'solidBounds':{'x':9,'y':9,'width':14,'height':14},'animations':anim,'aliases':{'patrol':'walk','chase':'run','attack':'shoot','wake-up':'wake'},'events':{'shoot':{'muzzleFrame':1,'muzzle':{'x':30,'y':15}},'melee':{'activeFrames':[2,3,4]},'reload':{'readyFrame':7}}},
      'props':{'file':'props.png','frames':props},'portraits':{'file':'portraits.png','frames':{'player':{'x':0,'y':0,'width':64,'height':64},'caller':{'x':64,'y':0,'width':64,'height':64}}},
      'tiles':{'file':'tiles.png','tileWidth':16,'tileHeight':16,'columns':4,'rows':4,'rowNames':['wood','tile','carpet','wall']},'backgrounds':{'apartment':{'file':'apartment.png','geometry':'apartment.json','tiled':'apartment.tiled.json','width':768,'height':480,'layout':'open-studio','lighting':'emerald-amber-crimson'},'combat':{'file':'combat.png','geometry':'combat.json','tiled':'combat.tiled.json','width':768,'height':480},'menu':{'file':'skyline.png','width':768,'height':480}},
      'environment':{'phone-ring':{'file':'phone-ring.png','frameWidth':40,'frameHeight':44,'frames':4,'fps':8},'computer-screen':{'file':'computer-screen.png','frameWidth':32,'frameHeight':32,'frames':4,'fps':4},'tv-static':{'file':'tv-static.png','frameWidth':32,'frameHeight':32,'frames':4,'fps':10},'neon-flicker':{'file':'neon-flicker.png','frameWidth':32,'frameHeight':16,'frames':4,'fps':6},'doors':{'file':'doors.png','frameWidth':48,'frameHeight':48,'frames':4,'fps':10}},
      'effects':{'file':'effects.png','frameWidth':16,'frameHeight':16,'columns':8,'rows':['muzzle','impact','smoke','casing'],'fps':[24,18,8,12]}}
    manifest['backgrounds']['training']={'file':'training.png','geometry':'training.json','tiled':'training.tiled.json','width':768,'height':480,'layout':'separate-industrial-range'}
    (OUT/'art-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    for name in ['apartment','player','enemy','props','portraits','tiles','skyline']:
        p=OUT/(name+'.png');im=Image.open(p);im.verify();print(f'{p.name}: PNG verified')
    print('Generated original art and manifests.')


if __name__=='__main__':
    if sys.argv[1:]==['--training-only']:make_training()
    elif not sys.argv[1:]:main()
    else:raise SystemExit('Usage: generate-art.py [--training-only]')
