"""Editable original micro-contact design for actual magazine reload motion.

No source recordings are used. A compact library keeps 48 kHz decoded PCM under
the existing allowance; noise-led material rubs and quiet modal contacts remain
distinct from a slowed or louder copy of the stock reload recording.
"""
import numpy as np


def render_attachment_foley(rate, design, noise, envelope, contact, register):
    for family_index, (family, p) in enumerate(design['families'].items()):
        for action_index, action in enumerate(('Extract', 'Move', 'Seat')):
            for variant in range(design['variants']):
                rng = np.random.default_rng(42863+family_index*1297+action_index*991+variant*3989)
                t = np.arange(int(rate*design['durationSeconds']))/rate
                tone = p['contactHz']*rng.uniform(.94, 1.06)
                if action == 'Move':
                    # A short glove/material rub accompanies manipulation and
                    # insertion; its final seating impulse is a separate event.
                    x = noise(rng, len(t), p['rubBand'])*envelope(t, .001, .002, .013)*p['rubWeight']
                    x += contact(t, rng, .017, p['weight']*.12, tone*.63, .005, .45)
                else:
                    seat = action == 'Seat'
                    x = contact(t, rng, .001, p['weight']*(1 if seat else .65), tone,
                                p['decay'], .48 if family == 'Drum' else .68)
                    x += noise(rng, len(t), p['rubBand'])*envelope(t, .005, .001, .010)*p['rubWeight']*(.24 if seat else .65)
                    if family == 'Drum':
                        # A dull body contact with a quiet latch tick; no
                        # extended resonant note or extra gameplay source.
                        x += contact(t, rng, .009, .026, 2600, .004, .75)
                register('attachment'+family+action, variant, x)
