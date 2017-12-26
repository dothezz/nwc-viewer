(() => {

fontMap = {
	// barlines

	// clefs
	gClef: 'e050', // treble
	cClef: 'e05c', // alto
	fClef: 'e062', // bass

	// time signatures
	timeSig0: 'e080',
	timeSig1: 'e081',
	timeSig2: 'e082',
	timeSig3: 'e083',
	timeSig4: 'e084',
	timeSig5: 'e085',
	timeSig6: 'e086',
	timeSig7: 'e087',
	timeSig8: 'e088',
	timeSig9: 'e089',
	timeSigCommon: 'e08a',
	timeSigCutCommon: 'E08B',

	// text based only
	// timeSigCombNumerator timeSig8Numerator
	// timeSigCombNumerator: 'E09E',

	// stemUpSE

	// Rests
	restDoubleWhole: 'E4E2',
	restWhole: 'E4E3',
	restHalf: 'E4E4',
	restQuarter: 'E4E5',
	rest8th: 'E4E6',
	rest16th: 'E4E7',
	rest32nd: 'E4E8',
	rest64th: 'E4E9',
	rest128th: 'E4EA',

	// Noteheads
	noteheadDoubleWhole: 'E0A0',
	noteheadWhole: 'E0A2',
	noteheadHalf: 'E0A3',
	noteheadBlack: 'E0A4',

	noteWhole: 'E1D2', // 1D15D
	noteHalfUp: 'E1D3', // 1D15E

	stem: 'E210',

	flag8thUp: 'E240',
	flag8thDown: 'E241',
	flag16thUp: 'E242',
	flag16thDown: 'E243',
	flagInternalUp: 'E250',
	flagInternalDown: 'E251',
	restHBar: 'E4EE	',

	// Repeats
	repeat1Bar: 'E500',
	repeat2Bars: 'E501',
	repeat4Bars: 'E502',

	// Standard accidentals (12-EDO) (U+E260–U+E26F)

	accidentalFlat: 'e260',
	accidentalNatural: 'e261',
	accidentalSharp: 'e262',
	accidentalDoubleSharp: 'e263',
	accidentalDoubleFlat: 'e264',
	accidentalNaturalFlat: 'e267',
	accidentalNaturalSharp: 'e268',
	accidentalParensLeft: 'e26a',
	accidentalParensRight: 'e26b',

	textBlackNoteShortStem: 'E1F0',
	textAugmentationDot: 'E1FC',
	textTuplet3ShortStem: 'E1FF',

	// Dynamics (U+E520–U+E54F)
	dynamicPiano: 'E520',
	dynamicMezzo: 'E521',
	dynamicForte: 'E522',
	dynamicRinforzando: 'E523',
	dynamicSforzando: 'E524',

	// Common ornaments (U+E560–U+E56F)

}

getCode = (name) => String.fromCharCode
(
	parseInt(fontMap[name], 16)
)

function insertFont() {
	var fontStyle = document.createElement('style');
	fontStyle.appendChild(document.createTextNode(`
	@font-face {
			font-family: "Bravura";

			src:
				url("vendor/bravura-1.211/otf/Bravura.otf") format("opentype"),
				url("vendor/bravura-1.211/woff/Bravura.woff2") format("woff2"),
				url("vendor/bravura-1.211/woff/Bravura.woff") format("woff");
		}
	`));

	document.head.appendChild(fontStyle);
}

function setupCanvas() {
	div = document.createElement('div')
	div.style = 'font-family: Bravura; display: none;'
	div.innerText=  '123'
	document.body.appendChild(div)

	var dpr = window.devicePixelRatio;

	canvas = document.createElement('canvas');
	canvas.style = 'font-family: Bravura'
	canvas.width = 4000 * dpr
	canvas.height = 1600 * dpr
	canvas.style.width = 4000
	canvas.style.height = 1600

	document.body.appendChild(canvas)
	ctx = canvas.getContext('2d')
	
	ctx.scale(dpr, dpr);
}

function onReady(callback) {
	// Trick from https://stackoverflow.com/questions/2635814/
	var image = new Image;
	image.src = 'vendor/bravura-1.211/otf/Bravura.otf';
	image.onerror = function() {
		setTimeout(callback, 500)
	};
}

/* Hack for inserting OTF */
function setup(render) {
	insertFont()
	setupCanvas()
	onReady(render)
}

class Draw {
	draw() {
		console.log('implement me .draw()')
	}

	outline() {
	}

	debug(ctx) {
		ctx.fillRect(0, 0, 10, 10)

		console.log(this.width)
		ctx.strokeRect(0, 0, this.width || 40, 40)
		// TODO add y bounds
	}

	moveTo(x, y) {
		this.x = x;
		this.y = y;
	}

	positionY(semitones) {
		this.offsetY = this.unitsToY(semitones)
	}

	unitsToY(units) {
		return -units / 2 / 4 * 40
	}
}

class Stave extends Draw {
	constructor(width) {
		super()
		this.size = 40  // TODO global
		this.x = 0
		this.y = 0
		this.width = width || 100
	}

	draw(ctx) {
		const {x, y, width, size} = this

		ctx.strokeStyle = '#000'
		ctx.lineWidth = 1.3

		// 5 lines
		const spaces = 4; // TODO global
		for (let i = 0; i <= spaces; i++) {
			const ty = -i / spaces * size
			ctx.beginPath()
			ctx.moveTo(0, ty)
			ctx.lineTo(width, ty);
			ctx.stroke()
		}

		// this.debug(ctx);
	}
}

class Glyph extends Draw {
	constructor(char, adjustY) {
		super()

		this.name = char
		this.char = getCode(char)
		// TODO remove ctx hardcoding
		this.width = ctx.measureText(this.char).width
		// this.padLeft = this.width;
		if (adjustY) this.positionY(adjustY)
	}

	draw(ctx) {
		ctx.fillStyle = '#000'
		ctx.fillText(this.char, 0, 0)

		// this.debug(ctx);
	}
}

const Clef = Glyph

/**
 * Clefs
 */

class TrebleClef extends Clef {
	constructor() {
		super('gClef', 2)
	}
}

class BassClef extends Clef {
	constructor() {
		super('fClef', 6)
	}
}

class AltoClef extends Clef {
	constructor() {
		super('cClef', 4)
	}
}

/**
 * Time signatures
 */
class TimeSignature extends Glyph {
	constructor(x=0, y) {
		super('timeSig' + x, y)
	}
}

const sharps = {
	'C': [],
	'G': ['f#'],
	'D': ['f#', 'c#'],
	'A': ['f#', 'c#', 'g#'],
	'E': ['f#', 'c#', 'g#', 'd#'],
	'B': ['f#', 'c#', 'g#', 'd#', 'a#'],
	'F#': ['f#', 'c#', 'g#', 'd#', 'a#', 'e#'],
	'C#': ['f#', 'c#', 'g#', 'd#', 'a#', 'e#', 'b#'],
}

const flats = {
	'C': [],
	'F': ['Bb'],
	'Bb': ['Bb', 'Eb'],
	'Eb': ['Bb', 'Eb', 'Ab'],
	'Ab': ['Bb', 'Eb', 'Ab', 'Db'],
	'Db': ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
	'Gb': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
	'Cb': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'],
}


function noteToPosition(note, clefOffset) {
	// TODO fix this!
	let y = rotate(note, clefOffset);
	if (y + 7 < 9) return y + 7;
	return y;
}

const AG = 'abcdefg';
function rotate(note, offset) {
	const pos = (AG.indexOf(note) + 3 + (offset || 0)) % AG.length
	return pos;
}

// e => 0, f => 1, g => 2, a => 3, b => 4, c => 5, d => 6
// 1| 2 3| 4 5| 6 7| 8 9|

// gClef = 'e' // line 0 = e // 0
// fClef = 'g' // line 0 = g // 5 -2 
// // alto 6 -1
var clefOffsetMap = {
	treble: 0,
	bass: -2
}
/**
 * Key Signature
 */
class KeySignature extends Draw {
	constructor(name, clef) {
		super()
		const isSharp = name in sharps
		this.accidentals = sharps[name] || flats[name];

		this.sharps = this.accidentals.map((v, l) => {
			const pos = noteToPosition(v.charAt(0).toLowerCase(), clefOffsetMap[clef] || 0)

			const sharp = new Accidental(isSharp
				? '#' : 'b', pos);
			sharp.moveTo(l * sharp.width, 0);
			// sharp._debug = true;
			return sharp;
		});

		if (this.sharps.length)
			this.width = this.sharps.length * this.sharps[0].width;
	}

	draw(ctx) {
		this.sharps.forEach(s => Drawing._draw(ctx, s));
	}
}

class Sharp extends Glyph {
	constructor(name, pos) {
		super('accidentalSharp', pos)
	}
}

class Flat extends Glyph {
	constructor(name, pos) {
		super('accidentalFlat', pos)
	}
}

class Natural extends Glyph {
	constructor(name, pos) {
		super('accidentalNatural', pos)
	}
}

class DoubleSharp extends Glyph {
	constructor(name, pos) {
		super('accidentalDoubleSharp', pos)
	}
}

class Accidental extends Glyph {
	constructor(name, pos) {
		super(
		name === '#' ? 'accidentalSharp' :
		name === 'b' ? 'accidentalFlat' :
		name === 'n' || name === '' ? 'accidentalNatural' :
		name === 'x' ? 'DoubleSharp' :
		name === 'v' ? 'accidentalDoubleFlat' :
			''
			, pos);

		// super('accidental' + name[0].toUpperCase() + , pos)
	}
}

class Ledger extends Draw {
	constructor(start, end) {
		super()
		const from = Math.min(start, end)
		const to = Math.max(start, end)
		this.positionY(from)
		this.to = to - from;
		this.width = 18
	}

	draw(ctx) {
		for (let i = 0; i < this.to; i+=2) {
			ctx.beginPath()
			ctx.moveTo(-4, this.unitsToY(i))
			ctx.lineTo(this.width, this.unitsToY(i))
			ctx.stroke()
		}
	}
}

// TODO generalized as vertical lines?
class Stem extends Draw {
	constructor(start, len) {
		super();
		// this.name = 'stem';
		this.positionY(start);
		this.len = len || 7;
	}

	draw(ctx) {
		ctx.beginPath()
		ctx.lineWidth = 1.2
		ctx.moveTo(0, 0)
		ctx.lineTo(0, this.unitsToY(this.len));
		ctx.stroke();
	}
}

class Barline extends Draw {
	constructor(start, len) {
		super();
		this.len = len || 8;
	}

	draw(ctx) {
		ctx.beginPath()
		ctx.lineWidth = 1.2
		ctx.moveTo(0, 0)
		ctx.lineTo(0, this.unitsToY(this.len));
		ctx.stroke();
	}
}

class Dot extends Glyph {
	constructor(pos) {
		super('textAugmentationDot', pos)
		this.offsetX = 5
	}
}

class Text extends Glyph {
	constructor(text, position) {
		super();
		if (!text) { console.log('NO TEXT', text); debugger }
		this.text = text || '';
		this.positionY(-position);
	}

	draw(ctx) {
		ctx.font = 'italic bold 12px arial'
		ctx.fillText(this.text, 0, 0)
	}
}

class Drawing {
	constructor(ctx) {
		this.set = new Set()

		ctx.font = '40px Bravura'
		ctx.textBaseline = 'alphabetic' // alphabetic  bottom top

	}

	add(el) {
		this.set.add(el)
	}

	remove(el) {
		this.set.delete(el)
	}

	static _draw(ctx, el) {
		if (el instanceof Draw) {
			ctx.save()
			ctx.translate(el.x, el.y)
			ctx.translate(el.offsetX || 0, el.offsetY || 0)
			el.draw(ctx)

			if (el._text) {
				ctx.font = '8px arial'
				ctx.fillText(el._text, 0, 50)
			}

			if (el._debug) {
				el.debug(ctx);
			}
			ctx.restore()
		}
		else {
			console.log('Element', el, 'not a draw element')
		}
	}

	draw(ctx) {
		ctx.save()
		for (const el of this.set) {
			Drawing._draw(ctx, el);
		}
		ctx.restore()
	}
}

// TODO find namespace

Claire = {
	Drawing,
	Draw,
	Stave, Glyph,
	TrebleClef, BassClef, AltoClef, TimeSignature,
	KeySignature,
	Accidental,
	Stem,
	Barline,
	Dot,
	Ledger,
	Text
}

Object.assign(window, { Drawing, setup, Stave, Claire }, Claire)

})()