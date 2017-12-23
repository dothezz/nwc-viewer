/**********************
 *
 *   Constants
 *
 **********************/

var NODE = typeof module !== 'undefined';
var BROWSER = typeof window !== 'undefined';

var TOKENS = {
	0: Clef, // + 6
	1: KeySignature, // + 12
	2: Barline,
	3: Repeat,
	4: InstrumentPatch,
	5: TimeSignature, // + 8 bytes
	6: Tempo,
	7: Dynamic,
	8: Note,
	9: Rest, // 0x09
	10: Chord, // 0x0a
	11: Pedal, // 0x0b
	12: Unknown,
	13: MidiInstruction, // 0x0d
	14: Fermata, // 0x0e
	15: DynamicVariance, // 0x0f
	16: PerformanceStyle, // 0x10
	17: Text, // 0x11
	18: RestChord, // 0x12
};

var CLEF_NAMES = {
	0: 'treble',
	1: 'bass',
	2: 'alto',
	3: 'tenor',
};

var CLEF_OFFSETS = {
	'treble': 0,
	'bass': 7,
	'alto': -7,
	'tenor': 4,
};

var STYLES = [
	'Regular',
	'Italic',
	'Bold',
	'Bold Italic'
];

var ENDINGS = [
	'SectionClose',
	'MasterRepeatClose',
	'Single',
	'Double',
	'Open hidden'
];

var DURATIONS = [
	1,
	2,
	4,
	8,
	16,
	32,
	64,
];

var ACCIDENTALS = [
	'#',
	'b',
	'n', // neutral
	'##',
	'bb',
	'', //'auto'
];

var NAMES = 'C D E F G A B'.split(' ');

/*
var clefs = {
	0: "b'",
	1: 'd',
	2: "c'",
	3: "a'",
}

var TIME_SIG_VALUES = {
	'4/4': '1',
	'3/4': '2.',
	'2/4': '2',
	'1/4': '1',
	'6/4': '2.',
	'5/4': 1,
	'1/8': '8',
	'2/8': '4',
	'3/8': '4.',
	'6/8': '2.',
	'4/8': '2',
	'9/8': '12',
	'12/8': '1',
	'2/2': '1',
	'4/2': '0',
	'1/2': '2',
}


var CLEF_OCTAVE = ('', '^8', '_8', '')
var CLEF_SHIFT = (0, 7, -7, 0)
*/


function decodeNwcArrayBuffer(arrayBuffer) {
	var byteArray = new Uint8Array(arrayBuffer);
	var firstBytes = shortArrayToString(byteArray.subarray(0, 5));
	if ('[NWZ]' === firstBytes) {
		var nwz = byteArray.subarray(6);
		if (BROWSER) {
			var inflate = new Zlib.Inflate(nwz);
			var plain = inflate.decompress();
		}
		if (NODE) {
			var plain = require('zlib').inflateSync(new Buffer(nwz));
		}

		return processNwc(plain);
	} else if ('[Note' === firstBytes) {
		return processNwc(byteArray);
	} else {
		console.log('Unrecognized headers');
	}
}

function shortArrayToString(array) {
	return String.fromCharCode.apply(null, array);
}

/**********************
 *
 *   Start Data Process
 *
 **********************/


function processNwc(array) {
	var reader = new DataReader(array);
	if (BROWSER) window.reader = reader;

	/*
	// dump
	for (;reader.pos < reader.array.length;) {
		reader.dump();
		reader.skip(80)
	}
	return
	*/

	Header(reader);
	if (reader.data.header.version >= 2.7) {
		console.log('done', reader.data)
		var nwctext = String.fromCharCode(...reader.readLine());
		// console.log(nwctext);
		reader.set('nwctext', nwctext);
		parseNwc275(reader, nwctext);
		convert275Tokens(reader);

		return reader.data;
	}
	Info(reader);
	PageSetup(reader);
	Score(reader);

	// start parsing
	var data = reader.data;

	return data;
}

function parseNwc275(reader, nwctext) {
	var lines = nwctext.split('\r\n');

	var first = lines.shift();

	if (!(first.match(/\!NoteWorthyComposer/))) {
		console.log('bad start format');
	}

	reader.descend('score');
	reader.set('fonts', []);
	reader.set('staves', []);

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];

		if (line === '!NoteWorthyComposer-End') {
			console.log('Processed', i, 'nwctext lines');
			break;
		}

		var parts = line.split('|');
		var type = parts[1];
		var obj = { type };

		reader.token('type', type);

		for (var j = 2; j < parts.length; j++) {
			var kv = parts[j].split(':');
			obj[kv[0]] = kv[1];
			reader.token(kv[0], kv[1]);
		}

		reader.token('next');
		// console.log(i, parts);
	}
}

function convert275Tokens(reader) {
	var data = reader.data;

	data.score.staves.forEach(stave => {
		stave.tokens = stave.tokens.map(mapTokens);
	});
}

function parseOpts(token) {
	const { Opts } = token;
	if (!Opts) return;

	const opts = Opts.split(',');
	opts.forEach(opt => {
		const pairs = opt.split('=')
		token[pairs[0]] = pairs[1];
	});
}

function getPos(str) {
	if (str.endsWith('^')) {
		console.log('getPos ^', str);
		str = str.substr(0, -1)
	}

	var pos = +str;
	if (isNaN(pos)) {
		console.log('fail getPos', str);
		const m = /([-\d]+)/.exec(str);
		return +m[1];
	}

	return pos;
}

function parsePos(str) {
	// eg '4^', "#-5,-3", n1??

	if (str.startsWith('#')) {
		var positions = str.substring(1).split(',').map(getPos);
		return positions;
	}

	return [getPos(str)]
}

var durs = {
	Whole: 1,
	Half: 2,
	'4th': 4,
	'8th': 8,
	'16th': 16,
	'32th': 32,
};

function parseDur(dur) {
	var parts = dur.split(',');

	var duration = durs[parts[0]];
	var dots = 0;
	if (parts[1]) {
		if (parts[1] === 'Dotted') {
			dots++;
		}
	}

	if (!duration) console.log('!!', token.Dur);

	return {
		duration, dots
	}
}

function mapTokens(token) {
	var type = token.type;
	parseOpts(token);

	switch (type) {
		case 'Clef':
			token = {
				type,
				clef: token.Type.toLowerCase(),
				octave: token.OctaveShift || 0
			}
			// Octave Down
			break;
		case 'TimeSig':
			var parts = token.Signature.split('/')
			// console.log('parts', parts);
			// AllaBreve
			token = {
				type: 'TimeSignature',
				signature: token.Signature
			};

			if (parts.length === 2) {
				token.group = parts[0];
				token.beat = parts[1];
			}

			break;
		case 'Note':
			const positions = parsePos(token.Pos);
			token.position = positions[0];
			if (positions.length > 1) console.log('moo chords', positions)
			Object.assign(token, parseDur(token.Dur));
			// Slur(Upward) Lyric(Never) Beam(End/First) Stem(Up/Down) XNoteSpace
			break;
		case 'Bar':
			token.type = 'Barline';
			break;
		case 'Rest':
			return Object.assign({
				type,
				position: 0
			}, parseDur(token.Dur));
		case 'Key':
			return {
				type: 'KeySignature',
				signature: token.Signature
			};
			console.log('KEY', token);
	}
	return token;
}

/**********************
 *
 *  Do Some Parsing,
 *	that understands
 *  music
 *
 **********************/

var tabbableTypes = new Set([
	'Clef', 'KeySignature', 'TimeSignature', 'Barline',
	'Chord',
])

var untabbableTypes = new Set([
	'StaffProperties', 'StaffInstrument', 'PerformanceStyle', 'Dynamic', 'Spacer', 'Tempo',
	'Boundary', 'Text', 'Instrument', 'DynamicVariance', 'TempoVariance'

])

function isTabbable(token) {
	const visible = token.Visibility !== 'Never'
	if (visible && tabbableTypes.has(token.type)) {
		return true
	}
	else {
		if (!untabbableTypes.has(token.type) && visible) console.log('NOT TABING', token.type);
		return false;
	}
}

function interpret(data) {
	var staves = data.score.staves;

	/*
	State

	- clef
	- key signature
	- notes (with accidentals)
	- barlines

	Tokens are tagged with following attributes
	- tickValue. abs musical time value when it should be played
	- durValue. music time value note should be played for
	- tickUntilValue. abs musical timevalue music stops playing
	- tabValue
	- tabUntilValue
	*/

	var reading = new SightReader();

	// TODO move this into reader itself
	staves.forEach(function(staff) {
		reading.reset();
		staff.tokens.forEach(function(token) {
			var type = token.type;

			// absolute time value when note should be played
			token.tickValue = reading.tickCounter.value();
			token.tabValue = reading.tabCounter.value();

			if (type in reading) {
				// calls corresponding token function
				reading[type](token);
			}

			// if (token.type === 'Boundary') console.log('$$$', token);

			if (token.durValue) {
				// computes cumumutative value duration
				reading.tickCounter.add(token.durValue).simplify()
				reading.tabCounter.add(token.durValue).simplify()
			}
			else {
				if (isTabbable(token)) {
					reading.tmpFraction.set(1, 4);
					reading.tabCounter.add(reading.tmpFraction).simplify()
				}
			}

			token.tickUntilValue = reading.tickCounter.value();
			token.tabUntilValue = reading.tabCounter.value();
		});
	});
};

function SightReader() {
	// Note Streamer
	this.tickCounter = new Fraction(0, 1); // commutativeTickDuration
	this.tabCounter = new Fraction(0, 1); // commutativeTabDuration
	this.tmpFraction = new Fraction(0, 1);
	this.reset();
}

SightReader.prototype.reset = function() {
	this.setClef('treble');
	this.tickCounter.set(0, 1);
	this.tabCounter.set(0, 1);
	this.lastTimeSignature = null;
}

SightReader.prototype.setClef = function(clef) {
	this.clef = clef;
	this.offset = CLEF_OFFSETS[clef];
	this.pitches = {};
}

SightReader.prototype.Clef = function(token) {
	this.setClef(token.clef);
};

SightReader.prototype.TimeSignature = function(token) {
	this.lastTimeSignature = token;
}

SightReader.prototype.Barline = function() {
	// reset
	this.pitches = {};
};

SightReader.prototype.KeySignature = function(token) {
	// reset
	this.key = token.signature;
	token.clef = this.clef;
	token.clefOffset = this.offset;
};

function circularIndex(n) {
	var m = 7;
	return n < 0 ? m - (n % m) : n % m;
	/*
	[ -2 -1 0 1 2 3 4 5 ]
	[  5  6 0 1 2 3 ]
	[  2  1 ]
	n < 0 ? m - (n % m) : n % m
	*/
}

SightReader.prototype.Rest = function(token) {
	// TODO take into account rest value
	this._handle_duration(token)
}

SightReader.prototype.Chord = function(token) {
	console.log('chord', token);
	token.duration = token.notes[0].duration;
	token.dots = token.notes[0].dots;
	this._handle_duration(token);
}

SightReader.prototype.Note = function(token) {
	var pos = token.position
	var OCTAVE_START = 4;
	var pitch = pos + this.offset;
	// console.log(token.position, this.offset, pitch)
	pitch += 7 * OCTAVE_START;

	if (pitch < 0) {
		console.log('Pitch should not be negative!!!');
	}

	var note_name = NAMES[circularIndex(pitch)];
	var octave = pitch / 7 | 0;

	token.name = note_name;
	token.octave = octave;

	// rule - note, previous note in bar, octave note, keysignature
	var accidental = token.accidental;

	// Override
	if (accidental < 6) {
		this.pitches[pitch] = accidental;
	}
	else if (this.pitches[pitch] !== undefined) {
		accidental = this.pitches[pitch];
	}
	else {
		// key signature
	}

	accidental = ACCIDENTALS[accidental];
	token.accidental = accidental;
	// console.log('accidental', accidental);

	// duration of this note
	this._handle_duration(token);
};

SightReader.prototype._handle_duration = function(token) {
	token.durValue = new Fraction(1, token.duration);
	for (var i = 0; i < token.dots; i++) {
		token.durValue.multiply(3, 2);
	}
}


/**********************
 *
 *   Parse Modes
 *
 **********************/

// version 4
// 3 7 8
function Header(reader) {
	// for (var i = 0; i < 25; i ++) {
	// 	var line = reader.readLine();
	// 	console.log(i, 'line', line, shortArrayToString(line), reader.pos);
	// }
	// return

	var company = reader.readString();
	var skip = reader.readUntilNonZero();
	var product = reader.readString();
	skip = reader.readUntilNonZero();
	var v = reader.readBytes(2);
	skip = reader.readBytes(1);
	skip = reader.readUntilNonZero();
	var name1 = reader.readString();
	skip = reader.readUntilNonZero();
	var name2 = reader.readString();

	reader.descend('header');
	reader.set('company', company);
	reader.set('product', product);
	reader.set('name1', name1);
	reader.set('name2', name2);

	var version_minor = v[0];
	var version_major = v[1];
	var version = version_major + version_minor * 0.01;
	console.log('Detected NWC version', version);
	reader.set('version', version);

	if (version >= 2.75) {
		// reader.readBytes(4);
		reader.readUntil(36);
	}

	skip = reader.readUntilNonZero();
	// reader.skip(2);
	// reader.skip(8);
	// reader.skip(2);
}

function Info(reader) {
	var infoHeader = reader.readBytes(2); // 0x10 - nwc175 0x18 - nwc2
	if (infoHeader[0] !== 0x10 && infoHeader[0] !== 0x18) {
		console.log('info header not aligned!');
	}

	var version = reader.data.header.version;

	reader.descend('info');
	var title = reader.readString();
	var author = reader.readString();

	if (version >= 2) {
		var lyricist = reader.readString();
		reader.set('lyricist', lyricist)
		var copyright1 = reader.readString();
		var copyright2 = reader.readString();
	} else {
		var copyright1 = reader.readString();
		var copyright2 = reader.readString();
	}
	var comments = reader.readString();
	console.log(reader.data);

	///
	reader.descend('info');
	reader.setObject({
		title, author,
		copyright1, copyright2,
		comments
	})
	console.log(reader.data);
}

function PageSetup(reader) {
	reader.descend('page_setup');
	// margins =
	Margins(reader);
	// staffSize =
	Fonts(reader);
}

function Margins(reader) {
	// reader.skip(9);
	// 4e 4e 5f  0 46 32  0 0 0
	// 4e 59 5f  0 46 32  0 0 0
	// 4e 4e 5f  0 46 32  0 1 0
	// 59 59 5f  0 46 32  0 0 0
	reader.readUntil(0x46);
	reader.readUntil(0x32);
	reader.skip(3);

	reader.set('measureStart', reader.readByte());
	reader.skip(1); // likely 0
	margins = reader.readString();
	margins = margins.split(' ').map(function(x) {
		return +x;
	});
	reader.set('margins', margins);
}

function Fonts(reader) {
	if (reader.data.header.version < 2) {
		reader.skip(36);
		reader.skip(1);
		var staff_size = reader.readByte();
	}
	else {
		reader.readUntil(0xff);
		var pre = reader.readBytes(3); // 0 11 0
		var staff_size = pre[1];
	}
	
	reader.set('staff_size', staff_size);

	var fonts = [], font, style, size, typeface;
	for (var i = 0; i < 12; i++) {
		font = reader.readString();
		style = STYLES[reader.readByte() & 3];
		size = reader.readByte();
		reader.skip(1);
		typeface = reader.readByte();

		fonts.push({
			font: font,
			style: style,
			size: size,
			typeface: typeface
		});
	}
	reader.set('fonts', fonts);
}

function Score(reader) {
	reader.descend('score');
	var version = reader.data.header.version;

	reader.readUntil(0xff);
	reader.readBytes(2);
	reader.set('layering', reader.readByte(1));

	if (version < 2) {
		var staves = reader.readShort();
		console.log('Detected Staves', staves);
	}
	else {
		reader.readByte();
		var staves = reader.readByte();

		// if (version === 2.02) {
		// reader.readUntilNonZero();
		
		//  0 fc ff 50  1 4e  1  0  1
		// make a loop, read until ff

		// ff  4  0 73  0 73  0
		// 83  1 61  0 61  0
		// 5   5 74 0 74 0
		// fe  5 62  0 62  0
		// 43 68 6f
	
	}

	console.log('Detected Staves', staves);

	reader.set('staves', new Array(staves));

	for (var i = 0; i < staves; i++) {
		console.log('STAFFF', i);
		StaffInfo(reader, i);
	}

	console.log(reader.pos, '/', reader.array.length);
}

function StaffInfo(reader, staff) {
	var version = reader.data.header.version;

	if (version > 2) {
		reader.readShort();
		reader.readShort();
		reader.readUntilNonZero();
	}

	var staff_name = reader.readString();
	var group_name = reader.readString();
	var end_bar = reader.readByte() & 7;
	var muted = !!(reader.readByte() & 1);
	reader.skip(1);
	var channel = reader.readByte();
	reader.skip(9);
	var staff_type = reader.readByte() & 3;
	reader.skip(1);

	var uppersize = 256 - reader.readByte();
	reader.readUntil(0xff);
	var lowersize = reader.readByte();
	reader.skip(1);
	var lines = reader.readByte();
	var layer = !!(reader.readByte() & 1);
	var part_volume = reader.readByte();
	reader.skip(1);
	var stero_pan = reader.readByte();

	var info = {
		staff_name, group_name, end_bar,
		muted, channel, staff_type, uppersize,
		lowersize, lines, layer, part_volume	
	};

	reader.descend('score.staves.' + staff);
	reader.setObject(info)
	
	if (reader.data.header.version === 1.7) {
		reader.skip(2);
	} else {
		reader.skip(3);
	}

	reader.skip(2);
	var lyrics = reader.readShort();
	var noLyrics = reader.readShort();

	if (noLyrics) console.log('noLyrics', noLyrics);

	/*
	var counting = 0;
	while (!reader.ended()) {
		counting++
		var tmp = reader.readUntil(0xfb); //0xff
		console.log(...[...tmp].map(hex), shortArrayToString(tmp)	)
	}
	console.log('counted', counting);
	// 0x10 - 106, 1 - 116, 2 - 219, 0 - 2000
	// 0x20 - 20
	// 0x21 - 6
	// 0xfd 23
	// 0xfe - 16
	// 0xff - 43

	// debugger;
	return;
	*/

	if (lyrics) {
		var lyricsOption = reader.readShort();
		reader.skip(3);

		var lyrics = [];
		for (var i = 0; i < noLyrics; i++) {
			var text = Lyrics(reader)
			// console.log('lyrics', text);
			lyrics.push(text);
		}

		reader.set('lyrics', lyrics);
		reader.skip(1);
	}

	reader.skip();
	reader.set('color', reader.readByte() & 3);

	var tokens = reader.readShort();
	reader.set('tokens', []);
	console.log('tokens', tokens);

	for (var i = 0; i < tokens - 2; i++) {
		if (reader.data.header.version === 1.7) {
			reader.skip(2);
		}
		var token = reader.readByte();

		reader.descend('score.staves.' + staff + '.tokens.' + i);
		var func = TOKENS[token];

		if (func) {
			func(reader);
		} else {
			console.log('Warning, token not recongnized', token, reader.pos);
			reader.dump();
			return;
		}

		// if (func == Rest) i--;
	}
}
/**********************
 *
 *   Token Modes
 *
 **********************/

function Clef(reader) {
	reader.set('type', 'Clef');
	var data = reader.readBytes(6);
	reader.set('clef', CLEF_NAMES[data[2] & 3]);
	reader.set('octave', data[4] & 3);
}

function bitmapKeySignature(bitmap) {
	const AG = 'ABCDEFG';
	var names = [];
	// bit map
	for (let i = 0; i < AG.length; i++) {
		if ((bitmap >> i) & 1) {
			names.push(AG.charAt(i));
		}
	}

	return names;
}

function KeySignature(reader) {
	reader.set('type', 'KeySignature');
	var data = reader.readBytes(12);
	var flats = bitmapKeySignature(data[2]);
	var sharps = bitmapKeySignature(data[4]);
	reader.set('flats', flats);
	reader.set('sharps', sharps);

	var flatKeys = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
	var sharpKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']

	if (flats.length) {
		reader.set('signature', flatKeys[flats.length]);
	}
	else if (sharps.length) {
		reader.set('signature', sharpKeys[sharps.length]);
	}
	else {
		reader.set('signature', 'C');
	}
}

function Barline(reader) {
	reader.set('type', 'Barline');
	var data = reader.readBytes(4);
	reader.set('barline', data[2] & 15);
}

function Repeat(reader) {
	reader.set('type', 'Repeat');
	var data = reader.readBytes(4);
	reader.set('repeat', data[2]);
}

function InstrumentPatch(reader) {
	reader.set('type', 'InstrumentPatch');
	var data = reader.readBytes(10);
}

function TimeSignature(reader) {
	reader.set('type', 'TimeSignature');
	var data = reader.readBytes(8);

	var beats = Math.pow(2, data[4]);

	reader.set('group', data[2]);
	reader.set('beat', beats);
	reader.set('signature', data[2] + '/' + beats);

}

function Tempo(reader) {
	reader.set('type', 'Tempo');
	var data = reader.readBytes(7);
	reader.readLine(); // ?

	reader.set('note', data[6]);
	reader.set('duration', data[4]);
}

function Dynamic(reader) {
	reader.set('type', 'Dynamic');
	var data = reader.readBytes(9);
	reader.set('dynamic', data[4] & 7);
}


function Note(reader) {
	reader.set('type', 'Note');
	var data = reader.readBytes(10);
	NoteValue(reader, data);
}

function NoteValue(reader, data) {
	var position = data[8];
	position = position > 127 ? 256 - position : - position;
	reader.set('position', position);

	var accidental = data[9] & 7;
	reader.set('accidental', accidental);
	var durationBit = data[2] & 7;

	reader.set('duration', DURATIONS[durationBit]);

	var durationDotBit = data[6];

	var dots = durationDotBit & 1 << 2 ? 1 :
		durationDotBit & 1 ? 2 :
			0;

	reader.set('dots', dots);
	reader.set('stem', data[4] >> 4 & 3);
	reader.set('triplet', data[4] >> 2 & 3);
	reader.set('tie', data[6] >> 4 & 1);

	reader.set('staccato', data[6] >> 1 & 1);
	reader.set('accent', data[6] >> 5 & 1);
	reader.set('tenuto', data[7] >> 2 & 1);
	reader.set('grace', data[7] >> 5 & 1);
	reader.set('slur', data[7] & 3);
}


function Rest(reader) {
	reader.set('type', 'Rest');
	var data = reader.readBytes(10);
	NoteValue(reader, data);
}

function Chord(reader) {
	////
	reader.set('type', 'Chord');
	var data = reader.readBytes(12);

	var chords = data[10];
	// NoteValue(reader, data);
	reader.set('chords', chords);
	reader.set('notes', new Array(chords));

	var pointer = reader.pointer;
	// TODO make better pointer management

	for (var i = 0; i < chords; i++) {
		pointer.notes[i] = {}
		reader.pointer = pointer.notes[i]
		reader.skip();
		data = reader.readBytes(10);
		NoteValue(reader, data)
	}

	reader.pointer = pointer;
}

function RestChord(reader) {
	reader.set('type', 'RestChord');
	var data = reader.readBytes(12);
	NoteValue(reader, data);
}

function Pedal(reader) {
	reader.set('type', 'Pedal');
	var data = reader.readBytes(5);
	reader.set('sustain', data[4]);
}

function Unknown(reader) {
	reader.set('type', 'Unknown');
	// TODO
	// console.log('Unknown');
	// reader.dump();
	var data = reader.readBytes(6);
	// 4 5 6* 11*
	// reader.set('Unknown', data[4]);
}

function MidiInstruction(reader) {
	reader.set('type', 'MidiInstruction');
	var data = reader.readBytes(36);
}

function Fermata(reader) {
	reader.set('type', 'Fermata');
	var data = reader.readBytes(6);
	// TODO
	reader.set('sustain', data[4]);
}

function DynamicVariance(reader) {
	reader.set('type', 'DynamicVariance');
	var data = reader.readBytes(5);
	reader.set('sustain', data[4]);
	// TODO
}

function PerformanceStyle(reader) {
	reader.set('type', 'PerformanceStyle');
	var data = reader.readBytes(5);
	reader.set('style', data[4]);
	// TODO
}

function Text(reader) {
	reader.set('type', 'Text');
	reader.skip(2);
	reader.set('position', reader.readByte() & 127);
	reader.skip(2);
	reader.set('text', reader.readString());
}


// TODO
// Clef.type = 'Clef'
// Clef.token = 0
// Clef.load(stream);
// Clef.write();

function Lyrics(reader) {
	var blockHeader = reader.readByte(); // 1 byte
	var lyricsLen = reader.readShort(); // 2 byte
	reader.skip(1); // 1 byte

	var blocks;
	switch (blockHeader) {
		case 4:
			blocks = 1;
			break;
		case 8:
			blocks = 2;
			break;
		default:
			break;
	}

	var lyricBlock = blocks ? 1024 * blocks : lyricsLen + 2;
	console.log('lyricBlock', lyricBlock);
	var chunk = reader.readBytes(lyricBlock); // rest of the block

	var cs = shortArrayToString(chunk);
	console.log('cs', cs, cs.toString(16));
	var lyrics = chunk.subarray(0, lyricsLen);
	return shortArrayToString(lyrics);
}


/**********************
 *
 *   Data Helpers
 *
 **********************/

function hex(number) {
	// 00
	return ('  ' + (number || 0).toString(16)).slice(-2);
}

function binary(number) {
	return ('00000000' + (number || 0).toString(2)).slice(-8);
}

function string(number) {
	return ('_' + String.fromCharCode(number)).slice(-1);
}

function num(number) {
	return ('  ' + number).slice(-3);
}

function dump(byteArray, start, limit) {
	limit = limit || 20;
	start = start || 0;
	var group = 12;
	var keys = [...Array(group).keys()]
	var pad = '      ';
	for (var i = start, lim = 0; i < byteArray.length, lim < limit; i+=group, lim++) {
		console.log(
			// '%c' + i, 'background: #222; color: #bada55',
			// '00000'
			(pad + i + ')').slice(-pad.length),

			...keys.map(k => hex(byteArray[i + k])),
			// ...keys.map(k => binary(byteArray[i + k])),
			'|',
			...keys.map(k => string(byteArray[i + k])),
			...keys.map(k => num(byteArray[i + k]))
		);
	}
}


/**********************
 *
 *   Data Access
 *
 **********************/

function DataReader(array) {
	this.array = array; // the binary source
	this.pos   = 0; // cursor

	this.data = {}; // single root of data
	this.pointer = this.data; // what emits operates on
	this.descendPath = [];
}

/**
 * descend takes a dot delimited path,
 * traverse down the structure,
 * creating an object if it does not exist
 * @param {*} path
 */
DataReader.prototype.descend = function(path) {
	this.pointer = this.data;
	this.descendPath = [];
	this.enter(path);
};

DataReader.prototype.ended = function() {
	var cursor = this.pos;
	return cursor >= this.array.length;
}

// Relative descend
DataReader.prototype.enter = function(path) {
	var node = this.pointer;
	var self = this;
	if (typeof path !== 'string') path = '' + path;
	path.split('.').forEach(function(p) {
		if (!(p in node)) {
			node[p] = {};
		}
		node = node[p];
		self.pointer = node;
		self.descendPath.push(p);
	});
};

DataReader.prototype.exit = function() {
	this.descend(this.descendPath.slice(0, -1).join('.'));
};

/**
 * set property to value at current path
 * @param {*} name
 * @param {*} value
 */
DataReader.prototype.set = function(name, value) {
	this.pointer[name] = value;
};

DataReader.prototype.setObject = function(object) {
	Object.assign(this.pointer, object);
};

DataReader.prototype.push = function(value) {
	this.pointer.push(value);
	return this.pointer.length - 1;
};


// https://github.com/nwsw/nwcplugin-api/blob/master/examples/xyAnalyzer.demo.nwctxt
var TokenMode = {
	EnterExit: (reader, key, value) => {
		if (key === 'next') {
			reader.exit();
			tokenMode = TokenMode.JustSet;
			return;
		}

		reader.set(key, value);
	},

	JustSet: (reader, key, value) => {
		if (key === 'next') {
			return;
		}
		if (key === 'type') {
			if (/Lyric/.exec(value)) { // Lyrics, Lyric1, Lyric2...
				reader.enter(value);
				tokenMode = TokenMode.EnterExit;
				return;
			}
			switch (value) {
				case 'Editor':
					reader.descend('score.editor')
					break;
				case 'Font':
					reader.descend('score.fonts')
					var i = reader.push({ type: value });
					reader.enter(i);
					tokenMode = TokenMode.EnterExit;
					return;
				case 'SongInfo':
				case 'PgSetup':
				case 'PgMargins':
					reader.descend('score.' + value)
					// reader.set('key', value);
					break;
				case 'AddStaff':
				// tokenMode(reader, key, value);
					reader.descend('score.staves');
					var i = reader.push({ tokens: [] });
					reader.descend(`score.staves.${i}.tokens`);
					return;
				default:
				case 'StaffProperties':
				case 'StaffInstrument':
					var i = reader.push({ type: value });
					reader.enter(i);
					tokenMode = TokenMode.EnterExit;
					return;
			}
		}

		reader.set(key, value);
	}
}

var tokenMode = TokenMode.JustSet;

// aka "emits"
DataReader.prototype.token = function(key, value) {
	tokenMode(this, key, value);
};

DataReader.prototype.readUntil = function(x) {
	var pos = this.pos;
	while (this.array[pos] !== x && pos < this.array.length) {
		pos++;
	}

	var slice = this.array.subarray(this.pos, pos);
	pos++;
	this.pos = pos;
	return slice;
};

DataReader.prototype.readUntilNonZero = function() {
	var x = this.pos;

	if (this.array[x] !== 0) return;

	while (++x < this.array.length && this.array[x] === 0);
	var slice = this.array.subarray(this.pos, x);
	this.pos = x;
	return slice;
};

DataReader.prototype.readLine = function() {
	return this.readUntil(0);
};

DataReader.prototype.readString = function() {
	return shortArrayToString(this.readLine());
};

DataReader.prototype.readByte = function() {
	var slice = this.array[this.pos++];
	return slice;
};

DataReader.prototype.readShort = function() {
	var num = this.readBytes(2);
	return num[0] + num[1] * 256;
};

DataReader.prototype.readBytes = function(k) {
	var pos = this.pos;
	pos += k;
	var slice = this.array.subarray(this.pos, pos);
	this.pos = pos;
	return slice;
};

DataReader.prototype.skip = function(k) {
	this.pos += k || 1;
};

DataReader.prototype.dump = function(limit) {
	dump(this.array, this.pos, limit);
};

if (NODE) {
	Object.assign(module.exports, {
		decodeNwcArrayBuffer
	});
}