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

	// text based only
	// timeSigCombNumerator timeSig8Numerator
	// timeSigCombNumerator: 'E09E',

	// stemUpSE

	// Noteheads
	noteheadDoubleWhole: 'E0A0',
	noteheadWhole: 'E0A2',
	noteheadHalf: 'E0A3',
	noteheadBlack: 'E0A4',

	noteWhole: 'E1D2', // 1D15D
	noteHalfUp: 'E1D3', // 1D15E
	
	// noteheadHalfFilled: ''
	// 1D15E = 157 165
	// 	U+1D165 

	flag8thUp: 'E240',
	flag8thDown: 'E241',
	flag16thUp: 'E242',
	flag16thDown: 'E243',
	flagInternalUp: 'E250',
	flagInternalDown: 'E251',

	// Standard accidentals (12-EDO) (U+E260–U+E26F)
	
	accidentalFlat: 'e260',
	accidentalNatural: 'e261',
	accidentalSharp: 'e262',
	accidentalDoubleSharp: 'e263',

	textBlackNoteShortStem: 'E1F0',
	textAugmentationDot: 'E1FC',
	textTuplet3ShortStem: 'E1FF',
	
}

getCode = (name) => String.fromCharCode
(
	parseInt(fontMap[name], 16)
)


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
		this.offsetY = -semitones / 2 / 4 * 40
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
		this.offsetX = this.width;
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

	draw(ctx) {
		ctx.save()
		for (const el of this.set) {
			if (el instanceof Draw) {
				ctx.save()
				ctx.translate(el.x, el.y)
				ctx.translate(el.offsetX || 0, el.offsetY || 0)
				el.draw(ctx)
				ctx.restore()
			}
			else {
				console.log('Element', el, 'not a draw element')
			}
		}
		ctx.restore()
	}
}

