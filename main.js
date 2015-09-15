/**********************
 *
 *   Constants
 *
 **********************/

var TOKENS = {
	0: Clef,
	1: KeySignature,
	2: Barline,
	3: Repeat,
	4: InstrumentPatch,
	5: TimeSignature,
	6: Tempo,
	7: Dynamic,
	8: Note,
	9: Rest, // 0x09
	10: Chord, // 0x0a
	11: Pedal, // 0x0b
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
	'1',
	'2',
	'4',
	'8',
	'16',
	'32',
	'64',
];

var ACCIDENTALS = [
	'#',
	'b',
	'', // neutral
	'##',
	'bb',
	'', //'auto'
];

var NAMES = 'C D E F G A B'.split(' ');

/**********************
 *
 *   Helpers
 *
 **********************/

function ajax(url, callback) {
	var oReq = new XMLHttpRequest();
	oReq.open('GET', url, true);
	oReq.responseType = 'arraybuffer';

	oReq.onload = function(oEvent) {
		console.log('ajax done for ', url);
		var arrayBuffer = oReq.response;
		callback(arrayBuffer);
	};

	oReq.send();
}

ajax('samples/anongs.nwc', received);

function hex(number) {
	return ('00' + (number || 0).toString(16)).slice(-2);
}

function binary(number) {
	return ('00000000' + (number || 0).toString(2)).slice(-8);
}

function string(number) {
	return (' ' + String.fromCharCode(number)).slice(-1);
}

function num(number) {
	return ('  ' + number).slice(-3);
}

function dump(byteArray, start) {
	var limit = 20;
	start = start || 0;
	for (var i = start, lim = 0; i < byteArray.length, lim < limit; i+=4, lim++) {
		console.log(
			// '%c' + i, 'background: #222; color: #bada55',
			('000' + i + ')').slice(-4),

			hex(byteArray[i]),
			hex(byteArray[i + 1]),
			hex(byteArray[i + 2]),
			hex(byteArray[i + 3]),

			binary(byteArray[i]),
			binary(byteArray[i + 1]),
			binary(byteArray[i + 2]),
			binary(byteArray[i + 3]),

			string(byteArray[i]),
			string(byteArray[i + 1]),
			string(byteArray[i + 2]),
			string(byteArray[i + 3]),

			num(byteArray[i]),
			num(byteArray[i + 1]),
			num(byteArray[i + 2]),
			num(byteArray[i + 3])
		);
	}

}

function received(arrayBuffer) {
	var byteArray = new Uint8Array(arrayBuffer);
	var firstBytes = shortArrayToString(byteArray.subarray(0, 5));
	if ('[NWZ]' === firstBytes) {
		var nwz = byteArray.subarray(6);
		var inflate = new Zlib.Inflate(nwz);
		var plain = inflate.decompress();
		process(plain);
	} else if ('[Note' === firstBytes) {
		process(byteArray);
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


function process(array) {
	var reader = new DataReader(array);
	Header(reader);
	Info(reader);
	PageSetup(reader);
	Score(reader);

	window.data = reader.data;
	parse(data);
	vex();
}

/**********************
 *
 *  Do Some Parsing,
 *	that understands
 *
 **********************/
function parse(data) {
	var staves = data.score.staves;

	/*
	State

	- clef
	- key signature
	- notes (with accidentals)
	- barlines
	*/

	var reader = new SightReader();

	staves.forEach(function(staff) {
		staff.tokens.forEach(function(token) {
			var type = token.type;
			if (type in reader) {
				reader[type](token);
			}
		});
	});
};

function SightReader() {
	// Note Streamer
	this.setClef('treble');
}

SightReader.prototype.setClef = function(clef) {
	this.clef = clef;
	this.offset = CLEF_OFFSETS[clef];
	this.pitches = {};
}

SightReader.prototype.Clef = function(token) {
	this.setClef(token.clef);
};

SightReader.prototype.Barline = function() {
	// reset
	this.pitches = {};
};

SightReader.prototype.KeySignature = function(token) {
	// reset
	// this.key =
	console.log(token);
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
	if (accidental < 5) {
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
	// console.log(accidental);
};




/**********************
 *
 *   Parse Modes
 *
 **********************/


function Header(reader) {
	reader.descend('header');
	reader.emit('company', reader.readString());
	var skip = shortArrayToString(reader.readLine());
	skip = shortArrayToString(reader.readLine());
	reader.emit('product', reader.readString());

	var v = reader.readLine();

	reader.skip(2);
	reader.emit('name1', reader.readString());
	reader.emit('name2', reader.readString());
	reader.skip(8);
	reader.skip(2);

	var version_minor = v[0];
	var version_major = v[1];
	version = version_major + version_minor * 0.01;
	reader.emit('version', version);
}

function Info(reader) {
	reader.descend('info');
	reader.emit('title', reader.readString());
	reader.emit('author', reader.readString());
	reader.emit('copyright1', reader.readString());
	reader.emit('copyright2', reader.readString());
	if (version >= 2) {
		reader.emit('something', reader.readString());
	}
	reader.emit('comments', reader.readString());
	console.log(reader.data);
}

function PageSetup(reader) {
	reader.descend('page_setup');
	margins = Margins(reader);
	staffSize = Fonts(reader);
}

function Margins(reader) {
	reader.skip(9);
	reader.emit('measureStart', reader.readByte());
	reader.skip(1); // likely 0
	margins = reader.readString();
	margins = margins.split(' ').map(function(x) {
		return +x;
	});
	reader.emit('margins', margins);
}

function Fonts(reader) {
	reader.skip(36);
	reader.emit('staff_size', reader.readByte());
	reader.skip(1);

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
	reader.emit('fonts', fonts);
}

function Score(reader) {
	reader.descend('score');
	reader.readUntil(0xff);

	reader.readBytes(2);
	reader.emit('layering', reader.readByte(1));
	var staves = reader.readByte(1);
	reader.emit('staves', new Array(staves));
	reader.skip(1);

	for (var i = 0; i < staves; i++) {
		StaffInfo(reader, i);
	}

}

function StaffInfo(reader, staff) {
	reader.descend('score.staves.' + staff);
	reader.emit('staff_name', reader.readString());
	reader.emit('group_name', reader.readString());
	reader.emit('end_bar', reader.readByte() & 7);
	reader.emit('muted', !!(reader.readByte() & 1));
	reader.skip(1);
	reader.emit('channel', reader.readByte());
	reader.skip(9);
	reader.emit('staff_type', reader.readByte() & 3);
	reader.skip(1);

	reader.emit('uppersize', 256 - reader.readByte());
	reader.readUntil(0xff);
	reader.emit('lowersize', reader.readByte());
	reader.skip(1);
	reader.emit('lines', reader.readByte());
	reader.emit('layer', !!(reader.readByte() & 1));
	reader.emit('part_volume', reader.readByte());
	reader.skip(1);
	reader.emit('stero_pan', reader.readByte());
	if (reader.data.header.version === 1.7) {
		reader.skip(2);
	} else {
		reader.skip(3);
	}

	reader.skip(2);
	var lyrics = reader.readShort();
	var noLyrics = reader.readShort();

	console.log('noLyrics' ,noLyrics);

	if (lyrics) {
		var lyricsOption = reader.readShort();
		reader.skip(3);

		for (var i = 0; i < noLyrics; i++) {
			var lyrics = [];
			lyrics.push(Lyrics(reader));
			reader.emit('lyrics', lyrics);
		}
		reader.skip(1);
	}

	reader.skip();
	reader.emit('color', reader.readByte() & 3);

	var tokens = reader.readShort();
	reader.emit('tokens', []);

	// console.log('Tokens', tokens);
	for (var i = 0; i < tokens - 2; i++) {
		if (reader.data.header.version === 1.7) {
			reader.skip(2);
		}
		var token = reader.readByte();

		reader.descend('score.staves.' + staff + '.tokens.' + i);
		var func = TOKENS[token];
		if (!func) console.log('Warning, token not recongnized', token);
		func(reader);
		if (RestChord === func) {
			i--;
		}
	}
}
/**********************
 *
 *   Token Modes
 *
 **********************/

function Clef(reader) {
	reader.emit('type', 'Clef');
	var data = reader.readBytes(6);
	reader.emit('clef', CLEF_NAMES[data[2] & 3]);
	reader.emit('octave', data[4] & 3);
}

function KeySignature(reader) {
	reader.emit('type', 'KeySignature');
	var data = reader.readBytes(12);
	reader.emit('flats', data[2]);
	reader.emit('sharps', data[4]);
}

function Barline(reader) {
	reader.emit('type', 'Barline');
	var data = reader.readBytes(4);
	reader.emit('barline', data[2] & 15);
}

function Repeat(reader) {
	reader.emit('type', 'Repeat');
	var data = reader.readBytes(4);
	reader.emit('repeat', data[2]);
}

function InstrumentPatch(reader) {
	reader.emit('type', 'InstrumentPatch');
	var data = reader.readBytes(10);
}

function TimeSignature(reader) {
	reader.emit('type', 'TimeSignature');
	var data = reader.readBytes(8);

	reader.emit('group', data[2]);
	reader.emit('beat', data[4]);
	reader.emit('signature', data[2] + '/' + data[4]);

}

function Tempo(reader) {
	reader.emit('type', 'Tempo');
	var data = reader.readBytes(7);
	reader.readLine(); // ?

	reader.emit('note', data[6]);
	reader.emit('duration', data[4]);
}

function Dynamic(reader) {
	reader.emit('type', 'Dynamic');
	var data = reader.readBytes(9);
	reader.emit('dynamic', data[4] & 7);
}


function Note(reader) {
	reader.emit('type', 'Note');
	var data = reader.readBytes(10);
	NoteValue(reader, data);
}

function NoteValue(reader, data) {
	var position = data[8];
	position = position > 127 ? 256 - position : - position;
	reader.emit('position', position);

	var accidental = data[9] & 7;
	reader.emit('accidental', accidental);
	var durationBit = data[2] & 7;

	reader.emit('duration', DURATIONS[durationBit]);

	var durationDotBit = data[6];

	var dots = durationDotBit & 1 << 2 ? 1 :
		durationDotBit & 1 ? 2 :
			0;

	reader.emit('dots', dots);
	reader.emit('stem', data[4] >> 4 & 3);
	reader.emit('triplet', data[4] >> 2 & 3);
	reader.emit('tie', data[6] >> 4 & 1);

	reader.emit('staccato', data[6] >> 1 & 1);
	reader.emit('accent', data[6] >> 5 & 1);
	reader.emit('tenuto', data[7] >> 2 & 1);
	reader.emit('grace', data[7] >> 5 & 1);
	reader.emit('slur', data[7] & 3);
}


function Rest(reader) {
	reader.emit('type', 'Rest');
	var data = reader.readBytes(10);
	NoteValue(reader, data);
}

function Chord(reader) {
	reader.emit('type', 'Chord');
	var data = reader.readBytes(12);

	var chords = data[10];
	// NoteValue(reader, data);

	for (var i = 0; i < chords; i++) {
		reader.skip();
		data = reader.readBytes(10);
		NoteValue(reader, data)
	}
}

function RestChord(reader) {
	reader.emit('type', 'RestChord');
	var data = reader.readBytes(12);
	NoteValue(reader, data);
}

function Pedal(reader) {
	reader.emit('type', 'Pedal');
	var data = reader.readBytes(5);
	reader.emit('sustain', data[4]);
}

function MidiInstruction(reader) {
	reader.emit('type', 'MidiInstruction');
	var data = reader.readBytes(36);
}

function Fermata(reader) {
	reader.emit('type', 'Fermata');
	var data = reader.readBytes(6);
	// TODO
	reader.emit('sustain', data[4]);
}

function DynamicVariance(reader) {
	reader.emit('type', 'DynamicVariance');
	var data = reader.readBytes(5);
	reader.emit('sustain', data[4]);
	// TODO
}

function PerformanceStyle(reader) {
	reader.emit('type', 'PerformanceStyle');
	var data = reader.readBytes(5);
	reader.emit('style', data[4]);
	// TODO
}

function Text(reader) {
	reader.emit('type', 'Text');
	reader.skip(2);
	reader.emit('position', reader.readByte());
	reader.skip(2);
	reader.emit('text', reader.readString());
}


// TODO
// Clef.type = 'Clef'
// Clef.token = 0
// Clef.load(stream);
// Clef.write();

function Lyrics(reader) {
	var data = reader.readByte();
	if (!data) return;

	var blocks;
	switch (reader.readByte()) {
		case 4:
			blocks = 1;
			break;
		case 8:
			blocks = 1;
			break;
		default:
			return;
	}

	// dump(reader.array, reader.start);

	var lyricsLen = reader.readShort();
	reader.skip(1);

	var chunk = reader.readBytes(1024 * blocks);
	var cs = shortArrayToString(chunk);
	console.log('cs', cs, cs.toString(16));
	var lyrics = chunk.subarray(0, lyricsLen);
	return shortArrayToString(lyrics);
}

/**********************
 *
 *   Data Access
 *
 **********************/

function DataReader(array) {
	this.array = array;
	this.start = 0;
	this.pos   = 0; // cursor

	this.data = {};
	this.pointer = this.data;
}

DataReader.prototype.descend = function(path) {
	var node = this.data;
	var self = this;
	path.split('.').forEach(function(p) {
		if (!(p in node)) {
			node[p] = {};
		}
		node = node[p];
		self.pointer = node;
	});
	// this.pointer = this.data[name] = {};
};

DataReader.prototype.emit = function(name, value) {
	this.pointer[name] = value;
};

DataReader.prototype.push = function(value) {
	this.pointer.push(value);
};

DataReader.prototype.readUntil = function(x) {
	while (this.array[this.pos] !== x) {
		this.pos++;
	}

	var slice = this.array.subarray(this.start, this.pos);
	this.pos++;
	this.start = this.pos;
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
	this.start = this.pos;
	return slice;
};

DataReader.prototype.readShort = function() {
	var num = this.readBytes(2);
	return num[0] + num[1] * 256;
};

DataReader.prototype.readBytes = function(k) {
	this.pos += k;
	var slice = this.array.subarray(this.start, this.pos);
	this.start = this.pos;
	return slice;
};

DataReader.prototype.skip = function(k) {
	this.pos += k || 1;
	this.start = this.pos;
};