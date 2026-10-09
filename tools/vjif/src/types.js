// ---------- type notes: the main objects and the short names used for them (no code here) ----------
// Short names, used the same way across the files:
//   m  a Media            g  an Inst (a pad's GIF)      c  a Clip            L  a Layer          sc  a stored Scene
//   e  a clip as drawn this frame (effClip: automation, fades and crop applied)               fi  a frame index
//   C  an effect's or preset's settings (fxConf)    S  its play state (fxSt)    U  one target's shader settings (fxU)
//   E  an undo step / a clip's fade state / a preset's effect being edited (said where it's used)
//   P  a transition preset      T  a transition preset or its style      M  per-target effect mixes (fxMix)
//   W, H  the canvas size        b  a beat (clock.beat)                   k, i, j  indices

/**
 * One decoded file in the set's pool. Shared by every pad that uses it; never edited.
 * @typedef {Object} Media
 * @property {string} hash        content hash: the key of its stored file ('gif:<hash>')
 * @property {string} name
 * @property {Blob} blob          the original file (the colour worker decodes its own copy from it)
 * @property {string} type        MIME type
 * @property {ImageBitmap[]} src  the frames, decoded at the pool's scale
 * @property {number[]} durs      each frame's duration (ms)
 * @property {number} w @property {number} h
 * @property {number} srcBytes    decoded size, for the memory readout
 * @property {number} [scale]     decode scale when it was resized on loading
 * @property {boolean} [px]       pixel art: scaled without smoothing
 * @property {Object} [text]      a Lettering pad: the text spec it was rendered from (TEXT_DEF fields)
 */

/**
 * A Media on a pad with that pad's own settings (pads[i].gif). Saved fields: GIF_KEYS.
 * @typedef {Object} Inst
 * @property {number} uid          its key in `insts` (and in the colour worker)
 * @property {Media} media
 * @property {ImageBitmap[]} frames  what is drawn: media.src, or pre-processed copies when live colour is off
 * @property {number[]} seq        frame order after In / Out (rebuildSeq); cum / total: its timing
 * @property {'free'|'stretch'|'step'} sync   Free / Fit / Step timing
 * @property {'loop'|'pingpong'|'once'} loop
 * @property {number} speed @property {number} beats @property {number} subdiv @property {number} restart   (beats; 0 = off)
 * @property {number} inF @property {number} outF @property {number} startF    frame range and the frame shown at rest
 * @property {boolean} crisp       no smoothing when scaled
 * @property {{on: boolean, color: number[], tol: number, soft: number, region: 'all'|'edges'|'point', seed: ?number[]}} key
 * @property {{h: number, s: number, v: number}} hsv
 * @property {{from: number[], to: number[], tol?: number, clear?: boolean}[]} swap   colour swaps (clear: becomes transparent)
 * @property {number} swapMerge    how close palette colours are merged into one swap
 * @property {'stay'|'fade'} trig  trigger: plays until replaced, or a fade one-shot shaped by `env`
 * @property {{a: number, h: number, r: number, curve: 'lin'|'smooth', gate: boolean, len: 'free'|'gif'}} env
 * @property {Object<string, {on: boolean, min: number, max: number, shape: string, per: number, ph: number, sync: string}>} lfo   automation per target (LFO_T)
 * @property {number} fxVer        bumped when its colour result changes (redraw / thumbnail checks)
 * @property {?Object} fxP         shader parameters (fxParams), made on demand; fxC: the last few coloured frames
 * @property {?Uint8Array[]} masks connected-key masks, one per frame
 * @property {?string} thumb @property {?string} tileThumb   data URLs for the chips / scene tiles
 */

/**
 * An Inst placed on a layer (layers[l].clips). Saved fields: XF_KEYS.
 * @typedef {Object} Clip
 * @property {number} id
 * @property {number} pad          which pad's GIF it plays
 * @property {number} x @property {number} y      centre offset from the canvas centre (px)
 * @property {number} sx @property {number} sy @property {number} rot   scale, degrees
 * @property {'auto'|'native'|'contain'|'cover'|'stretch'} fit
 * @property {boolean} flipX @property {boolean} flipY @property {boolean} tile
 * @property {number} cl @property {number} ct @property {number} cr @property {number} cb   crop, fractions of the frame
 * @property {number} alpha
 * @property {number} startBeat @property {number} startTime   when it was triggered (beats / performance.now ms)
 * @property {?{t0: number, from: number, rel: ?number, noGate?: boolean}} env   fade one-shot state (not saved)
 */

/**
 * @typedef {Object} Layer
 * @property {number} i            0 Background … 3 Overlay
 * @property {boolean} on @property {number} opacity
 * @property {GlobalCompositeOperation} blend
 * @property {Clip[]} clips        drawn first to last (the last is on top)
 * @property {?Clip} sel           the one Transform edits
 * @property {boolean} fillOn @property {string} fill   Background only: a colour under its GIFs
 * @property {'cut'|'armed'|string} tr   its own on / off transition: none, the armed one, or a preset number
 * @property {?HTMLElement} row    its card
 */

/**
 * A scene not on screen (scenes[i]; the live one is pads[] + layers[]).
 * @typedef {Object} Scene
 * @property {Layer[]} layers      settings and clip lists (the clips are shared, not copied)
 * @property {?Inst[]} pads        18 entries
 * @property {?string} thumb       its tile's picture
 * @property {string} name
 * @property {{pad: number, target: number}} [pick]   what was selected when you left it
 */

/**
 * An effect's settings (fxCfg[i], FX_DEFS[i] says what it is), or an effect preset slot (fxPre[k]).
 * @typedef {Object} FxSettings
 * @property {'hold'|'hit'|'latch'} mode
 * @property {number} amt @property {number} att @property {number} dec @property {number} sus @property {number} len @property {number} rel   envelope (beats; sus 0–1)
 * @property {number} [rate] @property {string} [style] @property {number} [size]
 * @property {'out'|number} [target]   the whole output or a layer (0–3)
 * @property {number} [pal] @property {number} [dith] @property {number} [kz]   Colour › Palette, its dither; Mirror › Kaleido zoom
 * @property {Object<number, FxSettings>} [fx]   a preset slot: the effects it plays (by effect index), each with its own settings
 */

/**
 * @typedef {Object} TransPreset
 * @property {'cut'|'fade'|'slide'|'wipe'|'zoom'|'dissolve'|'glitch'|'stutter'} type
 * @property {string} style        one of TR_STYLES[type]
 * @property {'left'|'right'|'up'|'down'} dir
 * @property {number} len          beats
 * @property {boolean} smooth      eased, or linear
 * @property {number} px           block / slice / column size
 */
