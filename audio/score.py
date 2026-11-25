"""The written music and the sync map: lyrics, melody, harmony, and every picture event on its film frame.

Positions are in eighth notes from the start of the film (pos 0 = 0.00 s, one eighth = 0.25 s = 6 frames, one bar = 8).
Key: D minor (D E F A Bb colour) for grief and battle, F major for the memory, D major for the dawn.
The last line is the opening line turned from minor to major. Melody, harmony and words are original.
"""
from dsp import FPS, nm

E8 = 0.25


def ft(frame):
    """Film frame to seconds."""
    return frame / FPS


# ------------------------------------------------------------------ picture events
# (frame, type, name, end_frame or None, origin). origin 'picture' = frame fixed by the animation,
# 'audio' = placed by the music where the picture gave no frame.
EVENTS = []


def ev(frame, type_, name, end=None, origin='picture'):
    EVENTS.append(dict(frame=frame, type=type_, name=name, end=end, origin=origin))


for f, n in [(0, 'sadness'), (192, 'warmth'), (336, 'comedy'), (480, 'fear'), (672, 'wrath'), (816, 'narumi_drum'), (912, 'hota_lantern'),
             (1008, 'shio_wave'), (1200, 'resolve'), (1344, 'dawn')]:
    ev(f, 'section', n)
VILLAGE_OFF = [18 + 6 * k for k in range(11)]
for k, f in enumerate(VILLAGE_OFF):
    ev(f, 'lamp', f'village_lamp_off_{k + 1:02d}')
ev(96, 'bell', 'cracked_bell_touched', origin='audio')
ev(180, 'hit', 'tear_drop', origin='audio')
ev(192, 'ambience', 'hearth_memory', 336)
for k, f in enumerate((206, 218, 230)):
    ev(f, 'step', f'minato_hop_{k + 1}')
ev(250, 'move', 'minato_reaches_for_cord')
ev(264, 'cut', 'cord_close_up')
ev(304, 'hit', 'cord_cinched')
ev(308, 'bell', 'small_bell_rings')
for k, f in enumerate((336, 348, 360)):
    ev(f, 'step', f'road_footfall_{k + 1}')
ev(366, 'hit', 'kite_snatches_dango')
ev(372, 'hit', 'hota_bites_air')
for k, f in enumerate((396, 400, 404)):
    ev(f, 'hit', f'panel_slam_{k + 1}')
ev(432, 'cut', 'last_gag')
ev(440, 'hit', 'kite_swallows')
ev(444, 'voice', 'hota_wails')
ev(456, 'move', 'narumi_slides_spare_in')
ev(468, 'hit', 'joy')
ev(476, 'black', 'comedy_cut_to_black', 480)
BRIDGE_OFF = [492, 516, 528, 540, 546, 552, 558]
for k, f in enumerate(BRIDGE_OFF):
    ev(f, 'lamp', f'bridge_lamp_off_{k + 1}')
HEART = [504, 528, 552, 564, 606, 624, 630, 636, 642]
for k, f in enumerate(HEART):
    ev(f, 'heartbeat', f'heartbeat_{k + 1}', origin='audio')
ev(576, 'silence', 'near_silence', 600)
ev(589, 'breath', 'shio_holds_breath', origin='audio')
for k, f in enumerate((602, 608, 614)):
    ev(f, 'hit', f'ring_mark_lights_{k + 1}')
ev(648, 'move', 'mask_lunge', 658)
ev(659, 'hit', 'mask_splits')
ev(670, 'black', 'fear_hard_black', 672)
ev(672, 'bell', 'minato_bell_in_chest')
ev(720, 'hit', 'shio_eyes')
ev(744, 'move', 'anger_closes', 756)
ev(782, 'move', 'pole_lifted_off_deck', 792)
ev(792, 'bell', 'pole_planted_head_rings')
ev(816, 'hit', 'narumi_sticks_circle', 840)
ev(840, 'hit', 'drum_stroke_1_one_stick')
ev(852, 'hit', 'drum_stroke_2_one_stick')
ev(856, 'move', 'narumi_arms_come_down', 863)
ev(864, 'hit', 'drum_stroke_3_both_sticks')
ev(864, 'move', 'arrow_feathers_fly_past', 884)
ev(866, 'hit', 'hoop_stroke_1')
ev(870, 'hit', 'demon_ribs_crack')
ev(871, 'hit', 'hoop_stroke_2')
ev(878, 'hit', 'narumi_sticks_lowered')
ev(900, 'hit', 'sticks_tapped_together')
ev(918, 'move', 'bamboo_splits_into_frame', 946)
RINGS = [926, 933, 939, 944, 948, 951, 954]          # each split lands as a tied ring 8 frames later
BAMBOO = [f - 8 for f in RINGS]
for k, f in enumerate(BAMBOO):
    ev(f, 'hit', f'bamboo_split_{k + 1}')
for k, f in enumerate(RINGS):
    ev(f, 'hit', f'ring_bent_and_tied_{k + 1}')
ev(946, 'hit', 'lantern_paper_drawn_taut')
ev(960, 'hit', 'lantern_lights')
ev(960, 'move', 'steam_rises', 1008)
ev(1044, 'move', 'boat_poles_up_wave', 1056)
ev(1056, 'hit', 'boat_crests')
ev(1104, 'move', 'wave_hang', 1122)
ev(1122, 'move', 'boat_runs_down_face', 1140)
ev(1140, 'bell', 'pole_head_strikes_wave')
ev(1140, 'move', 'surf_crosses', 1166)
ev(1154, 'move', 'cranes_lift')
for k, f in enumerate((1200, 1206, 1212)):
    ev(f, 'hit', f'resolve_panel_{k + 1}')
ev(1226, 'hit', 'pole_line')
ev(1243, 'move', 'squeeze_to_black', 1248)
ev(1248, 'bell', 'final_blow_bell')
ev(1252, 'silence', 'after_the_final_blow', 1256)
ev(1256, 'move', 'demon_shivers', 1267)
ev(1267, 'hit', 'demon_unravels', 1330)
ev(1267, 'move', 'lanterns_float', 1344)
ev(1296, 'hit', 'lanterns')
RELIT = [1356 + 5 * k for k in range(11)]
for k, f in enumerate(RELIT):
    ev(f, 'lamp_on', f'lamp_relit_{k + 1:02d}')
ev(1428, 'bell', 'dawn_bell_1')
ev(1446, 'bell', 'dawn_bell_2')
ev(1464, 'cut', 'end_card')
ev(1464, 'move', 'brush_writing', 1490)
ev(1497, 'hit', 'seal_stamp')
ev(1524, 'black', 'fade_to_black', 1535)

# gates applied to every stem: (frame0, frame1, level dB, ramp in s, ramp out s); the voice keeps its held breath in 576-600
MUTES = [(476, 479.6, -90, .006, .010), (576, 600.4, -26, .060, .012), (670, 671.85, -90, .006, .004),
         (1246.9, 1247.75, -26, .008, .005), (1252, 1256, -120, .012, .004)]

# ------------------------------------------------------------------ lead vocal
# (mora, note, length in eighths, options); (None, None, x) is a rest
LEAD = [
    dict(id='L1a', bar=1, text='雪の夜 灯がひとつ', romaji='yuki no yo / hi ga hitotsu', voice='solo_soft', pos=2, notes=[
        ('yu', 'F4', 1), ('ki', 'E4', 1), ('no', 'D4', 1), ('yo', 'A4', 2.55, dict(vel=1.02, orn=[(.40, 115, .032), (.47, -50, .035)])), (None, None, .45),
        ('hi', 'Bb4', 1, dict(vel=1.04)), ('ga', 'A4', 1), ('hi', 'F4', 1), ('to', 'E4', 1), ('tsu', 'D4', 2.7, dict(vel=.86))]),
    dict(id='L1b', bar=3, text='名を呼べば 息は白く', romaji='na o yobeba / iki wa shiroku', voice='solo_soft', pos=16, notes=[
        ('na', 'F4', 1), ('o', 'E4', 1), ('yo', 'F4', 1), ('be', 'A4', 1), ('ba', 'Bb4', 2.55, dict(vel=1.06, orn=[(.42, 110, .032), (.49, -50, .035)])), (None, None, .45),
        ('i', 'A4', 1), ('ki', 'Bb4', 1, dict(vel=1.02)), ('wa', 'A4', 1), ('shi', 'F4', 1), ('ro', 'E4', 1, dict(vel=.95)),
        ('ku', 'E4', 2.5, dict(vel=.84))]),
    dict(id='L2a', bar=5, text='結んでくれた 赤い紐', romaji='musunde kureta / akai himo', voice='solo_warm', pos=32, notes=[
        ('mu', 'C4', 1), ('su', 'D4', 1), ('n', 'F4', 1), ('de', 'F4', 1), ('ku', 'G4', 1), ('re', 'A4', 1), ('ta', 'A4', 2, dict(vel=1.02)),
        ('a', 'C5', 1, dict(vel=1.05)), ('ka', 'A4', 1), ('i', 'G4', 1), ('hi', 'F4', 1), ('mo', 'G4', 1.6)]),
    dict(id='L2b', bar=6, text='鈴がまだ揺れる', romaji='suzu ga mada yureru', voice='solo_warm', pos=46, notes=[
        ('su', 'F4', 1), ('zu', 'G4', 1), ('ga', 'A4', 1), ('ma', 'Bb4', 1, dict(vel=1.03)), ('da', 'A4', 1), ('yu', 'G4', 1), ('re', 'E4', 1),
        ('ru', 'F4', 2.7, dict(vel=.82))]),
    dict(id='W1', bar=15, text='返せ', romaji='kaese', voice='solo_wrath', pos=116, notes=[
        ('ka', 'D4', 1), ('e', 'F4', 1), ('se', 'E4', 1.8, dict(vel=.95))]),
    dict(id='W2', bar=16, text='返せ', romaji='kaese', voice='solo_wrath', pos=120, notes=[
        ('ka', 'F4', 1), ('e', 'A4', 1), ('se', 'G4', 3, dict(vel=1.0))]),
    dict(id='W3', bar=16, text='あの灯を', romaji='ano hi o', voice='solo_wrath', pos=126, notes=[
        ('a', 'G4', 1), ('no', 'A4', 1), ('hi', 'Bb4', 2, dict(vel=1.05)), ('o', 'C#5', 5.7, dict(vel=1.18))]),
    dict(id='L3a', bar=21, text='鳴れ 鳴れ 宵の鐘', romaji='nare nare yoi no kane', voice='solo_full', pos=162, notes=[
        ('na', 'D5', 1, dict(vel=1.02)), ('re', 'A4', 1.9), (None, None, .1), ('na', 'D5', 1, dict(vel=1.04)), ('re', 'Bb4', 2),
        ('yo', 'C5', 1), ('i', 'D5', 1), ('no', 'C5', 1), ('ka', 'Bb4', 1), ('ne', 'A4', 3.6, dict(vel=1.02))]),
    dict(id='L3b', bar=23, text='闇を裂いて 波よ立て', romaji='yami o saite nami yo tate', voice='solo_full', pos=176, notes=[
        ('ya', 'Bb4', 1), ('mi', 'A4', 1), ('o', 'G4', 1), ('sa', 'A4', 1), ('i', 'Bb4', 1), ('te', 'C5', 2.6),
        (None, None, .4),
        ('na', 'G4', 1, dict(vel=.92)), ('mi', 'A4', 1, dict(vel=.96)), ('yo', 'Bb4', 1), ('ta', 'D5', 3, dict(vel=1.08)), ('te', 'C#5', 1.65, dict(vel=1.18, vib=0))]),
    dict(id='L4a', bar=25, text='消えない灯を この胸に', romaji='kienai hi o / kono mune ni', voice='solo_full', pos=192, notes=[
        ('ki', 'Bb4', 1), ('e', 'C5', 1), ('na', 'D5', 1), ('i', 'C5', 1), ('hi', 'D5', 2, dict(vel=1.08)), ('o', 'C5', 1.7),
        (None, None, .3),
        ('ko', 'A4', 1), ('no', 'C5', 1), ('mu', 'D5', 1), ('ne', 'D5', 1), ('ni', 'E5', 3.75, dict(vel=1.15))]),
    dict(id='L4b', bar=28, text='明日の岸へ 渡すまで', romaji='asu no kishi e / watasu made', voice='solo_dawn', pos=222, notes=[
        ('a', 'F#4', 1), ('su', 'E4', 1), ('no', 'D4', 2), ('ki', 'F#4', 1), ('shi', 'A4', 1), ('e', 'A4', 2.6, dict(vel=1.0, orn=[(.42, 130, .032), (.49, -50, .035)])), (None, None, 1.4),
        ('wa', 'B4', 1, dict(vel=1.02)), ('ta', 'A4', 1), ('su', 'F#4', 2), ('ma', 'E4', 2), ('de', 'D4', 7.2, dict(vel=.82))]),
]

# a child's whispered call, heard in the dark and again from inside the demon
WHISPERS = [
    dict(id='WH1', bar=14, text='ねえちゃん', romaji='nee-chan', voice='whisper', pos=104, notes=[('ne', 'A4', .9), ('e', 'A4', .8), ('cha', 'A4', .9), ('n', 'A4', 1)]),
    dict(id='WH2', bar=15, text='ねえちゃん', romaji='nee-chan', voice='whisper', pos=112.5, notes=[('ne', 'A4', .7), ('e', 'A4', .6), ('cha', 'A4', .6), ('n', 'A4', .7)]),
]

# ------------------------------------------------------------------ choir: homorhythmic with L3a, L3b, L4a
# one row per mora of the lead: (alto, tenor, bass); None = the choir rests and Shio sings alone
CHOIR_PARTS = {
    'L3a': [None, None, ('Bb4', 'F4', 'Bb2'), ('F4', 'D4', 'Bb2'),
            ('G4', 'E4', 'C3'), ('G4', 'E4', 'C3'), ('G4', 'E4', 'C3'), ('G4', 'E4', 'C3'), ('F4', 'C4', 'A2')],
    'L3b': [('G4', 'D4', 'G2'), ('F4', 'D4', 'G2'), ('D4', 'Bb3', 'G2'), ('F4', 'D4', 'G2'), ('G4', 'E4', 'C3'), ('G4', 'E4', 'C3'),
            None, None, None, ('A4', 'E4', 'A2'), ('A4', 'E4', 'A2')],
    'L4a': [('F4', 'D4', 'Bb2'), ('F4', 'D4', 'Bb2'), ('F4', 'D4', 'Bb2'), ('F4', 'D4', 'Bb2'), ('G4', 'E4', 'C3'), ('G4', 'E4', 'C3'),
            ('F4', 'D4', 'D3'), ('A4', 'F4', 'D3'), ('A4', 'F4', 'D3'), ('A4', 'F4', 'D3'), ('C#5', 'E4', 'A2')],
}

# harmony of the battle chorus: (pos, length, bass root, inner voices, strength)
CHORUS = [(160, 4, 'D', ['D4', 'F4', 'A4'], .8), (164, 4, 'Bb', ['D4', 'F4', 'Bb4'], .85),
          (168, 4, 'C', ['E4', 'G4', 'C5'], 1), (172, 4, 'A', ['C4', 'F4', 'A4'], 1),
          (176, 4, 'G', ['D4', 'G4', 'Bb4'], 1), (180, 4, 'C', ['E4', 'G4', 'C5'], 1),
          (184, 3, 'Bb', ['D4', 'F4', 'Bb4'], .28), (187, 3, 'A', ['D4', 'E4', 'A4'], .5), (190, 2, 'A', ['C#4', 'E4', 'A4'], 1),
          (192, 4, 'Bb', ['D4', 'F4', 'Bb4'], 1), (196, 4, 'C', ['E4', 'G4', 'C5'], 1),
          (200, 4, 'D', ['D4', 'F4', 'A4'], 1), (204, 4, 'A', ['C#4', 'E4', 'A4'], 1)]
# the violins' and shinobue's answering line
COUNTER = [(160, 3, 'A5'), (163, 1, 'C6'), (164, 4, 'Bb5'), (168, 3, 'G5'), (171, 1, 'A5'), (172, 1, 'C6'), (173, 1, 'Bb5'), (174, 2, 'A5'),
           (176, 4, 'Bb5'), (180, 2, 'G5'), (182, 1, 'E5'), (183, 1, 'G5'), (184, 3, 'F5'), (187, 3, 'D6'), (190, 1, 'E6'), (191, 1, 'C#6'),
           (192, 4, 'D6'), (196, 2, 'C6'), (198, 2, 'E6'), (200, 4, 'D6'), (204, 3.8, 'C#6')]


def note_tuples(ph, part=None, choir=False):
    """[(t, d, midi, mora, opts)] for a phrase; part 0/1/2 picks alto/tenor/bass, choir drops the solo-only morae."""
    out, pos, k = [], ph['pos'], 0
    for item in ph['notes']:
        mora, note, ln = item[:3]
        o = item[3] if len(item) > 3 else {}
        if mora is not None:
            row = CHOIR_PARTS[ph['id']][k] if (choir or part is not None) else True
            if row is not None:
                m = nm(note) if part is None else nm(row[part])
                out.append((pos * E8, ln * E8, m, mora, o))
            k += 1
        pos += ln
    return out


def phrase_span(ph):
    nt = note_tuples(ph)
    return nt[0][0], nt[-1][0] + nt[-1][1]
