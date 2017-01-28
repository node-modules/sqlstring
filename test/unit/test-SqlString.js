var assert          = require('assert');
var SqlString       = require('../common').SqlString;
var test            = require('utest');
var iterableSupport = require('../common').iterableSupport;

test('SqlString.escapeId', {
  'value is quoted': function() {
    assert.equal('`id`', SqlString.escapeId('id'));
  },

  'value can be a number': function() {
    assert.equal('`42`', SqlString.escapeId(42));
  },

  'value containing escapes is quoted': function() {
    assert.equal('`i``d`', SqlString.escapeId('i`d'));
  },

  'value containing separator is quoted': function() {
    assert.equal('`id1`.`id2`', SqlString.escapeId('id1.id2'));
  },

  'value containing separator and escapes is quoted': function() {
    assert.equal('`id``1`.`i``d2`', SqlString.escapeId('id`1.i`d2'));
  },

  'value containing separator is fully escaped when forbidQualified': function() {
    assert.equal('`id1.id2`', SqlString.escapeId('id1.id2', true));
  },

  'arrays are turned into lists': function() {
    assert.equal(SqlString.escapeId(['a', 'b', 't.c']), "`a`, `b`, `t`.`c`");
  },

  'sets are turned into lists': function() {
    if (!iterableSupport) return;
    var set = new Set();
    set.add('a');
    set.add('b');
    set.add('t.c');
    assert.equal(SqlString.escapeId(set), "`a`, `b`, `t`.`c`");
  },

  'nested arrays are flattened': function() {
    assert.equal(SqlString.escapeId(['a', ['b', ['t.c']]]), "`a`, `b`, `t`.`c`");
  }
});

test('SqlString.escape', {
  'undefined -> NULL': function() {
    assert.equal(SqlString.escape(undefined), 'NULL');
  },

  'null -> NULL': function() {
    assert.equal(SqlString.escape(null), 'NULL');
  },

  'booleans convert to strings': function() {
    assert.equal(SqlString.escape(false), 'false');
    assert.equal(SqlString.escape(true), 'true');
  },

  'numbers convert to strings': function() {
    assert.equal(SqlString.escape(5), '5');
  },

  'objects are turned into key value pairs': function() {
    assert.equal(SqlString.escape({a: 'b', c: 'd'}), "`a` = 'b', `c` = 'd'");
  },

  'maps are turned into key value pairs': function() {
    if (!iterableSupport) return;
    var map = new Map();
    map.set('a', 'b');
    map.set('c', 'd');
    assert.equal(SqlString.escape(map), "`a` = 'b', `c` = 'd'");
  },

  'objects function properties are ignored': function() {
    assert.equal(SqlString.escape({a: 'b', c: function() {}}), "`a` = 'b'");
  },

  'nested objects are cast to strings': function() {
    assert.equal(SqlString.escape({a: {nested: true}}), "`a` = '[object Object]'");
  },

  'arrays are turned into lists': function() {
    assert.equal(SqlString.escape([1, 2, 'c']), "1, 2, 'c'");
  },

  'sets are turned into lists': function() {
    if (!iterableSupport) return;
    assert.equal(SqlString.escape(new Set([1, 2, 'c'])), "1, 2, 'c'");
  },

  'nested arrays are turned into grouped lists': function() {
    assert.equal(SqlString.escape([[1,2,3], [4,5,6], ['a', 'b', {nested: true}]]), "(1, 2, 3), (4, 5, 6), ('a', 'b', '[object Object]')");
  },

  'array of sets are turned into grouped lists': function() {
    if (!iterableSupport) return;
    assert.equal(SqlString.escape([new Set([1,2,3]), new Set([4,5,6]), new Set(['a', 'b', {nested: true}])]), "(1, 2, 3), (4, 5, 6), ('a', 'b', '[object Object]')");
  },

  'nested objects inside arrays are cast to strings': function() {
    assert.equal(SqlString.escape([1, {nested: true}, 2]), "1, '[object Object]', 2");
  },

  'strings are quoted': function() {
    assert.equal(SqlString.escape('Super'), "'Super'");
  },

  '\0 gets escaped': function() {
    assert.equal(SqlString.escape('Sup\0er'), "'Sup\\0er'");
    assert.equal(SqlString.escape('Super\0'), "'Super\\0'");
  },

  '\b gets escaped': function() {
    assert.equal(SqlString.escape('Sup\ber'), "'Sup\\ber'");
    assert.equal(SqlString.escape('Super\b'), "'Super\\b'");
  },

  '\n gets escaped': function() {
    assert.equal(SqlString.escape('Sup\ner'), "'Sup\\ner'");
    assert.equal(SqlString.escape('Super\n'), "'Super\\n'");
  },

  '\r gets escaped': function() {
    assert.equal(SqlString.escape('Sup\rer'), "'Sup\\rer'");
    assert.equal(SqlString.escape('Super\r'), "'Super\\r'");
  },

  '\t gets escaped': function() {
    assert.equal(SqlString.escape('Sup\ter'), "'Sup\\ter'");
    assert.equal(SqlString.escape('Super\t'), "'Super\\t'");
  },

  '\\ gets escaped': function() {
    assert.equal(SqlString.escape('Sup\\er'), "'Sup\\\\er'");
    assert.equal(SqlString.escape('Super\\'), "'Super\\\\'");
  },

  '\u001a (ascii 26) gets replaced with \\Z': function() {
    assert.equal(SqlString.escape('Sup\u001aer'), "'Sup\\Zer'");
    assert.equal(SqlString.escape('Super\u001a'), "'Super\\Z'");
  },

  'single quotes get escaped': function() {
    assert.equal(SqlString.escape('Sup\'er'), "'Sup\\'er'");
    assert.equal(SqlString.escape('Super\''), "'Super\\''");
  },

  'double quotes get escaped': function() {
    assert.equal(SqlString.escape('Sup"er'), "'Sup\\\"er'");
    assert.equal(SqlString.escape('Super"'), "'Super\\\"'");
  },

  'dates are converted to YYYY-MM-DD HH:II:SS.sss': function() {
    var expected = '2012-05-07 11:42:03.002';
    var date     = new Date(2012, 4, 7, 11, 42, 3, 2);
    var string   = SqlString.escape(date);

    assert.strictEqual(string, "'" + expected + "'");
  },

  'dates are converted to specified time zone "Z"': function() {
    var expected = '2012-05-07 11:42:03.002';
    var date     = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
    var string   = SqlString.escape(date, false, 'Z');

    assert.strictEqual(string, "'" + expected + "'");
  },

  'dates are converted to specified time zone "+01"': function() {
    var expected = '2012-05-07 12:42:03.002';
    var date     = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
    var string   = SqlString.escape(date, false, '+01');

    assert.strictEqual(string, "'" + expected + "'");
  },

  'dates are converted to specified time zone "+0200"': function() {
    var expected = '2012-05-07 13:42:03.002';
    var date     = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
    var string   = SqlString.escape(date, false, '+0200');

    assert.strictEqual(string, "'" + expected + "'");
  },

  'dates are converted to specified time zone "-05:00"': function() {
    var expected = '2012-05-07 06:42:03.002';
    var date     = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
    var string   = SqlString.escape(date, false, '-05:00');

    assert.strictEqual(string, "'" + expected + "'");
  },

  'dates are converted to UTC for unknown time zone': function() {
    var date     = new Date(Date.UTC(2012, 4, 7, 11, 42, 3, 2));
    var expected = SqlString.escape(date, false, 'Z');
    var string   = SqlString.escape(date, false, 'foo');

    assert.strictEqual(string, expected);
  },

  'invalid dates are converted to null': function() {
    var date   = new Date(NaN);
    var string = SqlString.escape(date);

    assert.strictEqual(string, 'NULL');
  },

  'buffers are converted to hex': function() {
    var buffer = new Buffer([0, 1, 254, 255]);
    var string = SqlString.escape(buffer);

    assert.strictEqual(string, "X'0001feff'");
  },

  'buffers object cannot inject SQL': function() {
    var buffer = new Buffer([0, 1, 254, 255]);
    buffer.toString = function() { return "00' OR '1'='1"; };
    var string = SqlString.escape(buffer);

    assert.strictEqual(string, "X'00\\' OR \\'1\\'=\\'1'");
  },

  'NaN -> NaN': function() {
    assert.equal(SqlString.escape(NaN), 'NaN');
  },

  'Infinity -> Infinity': function() {
    assert.equal(SqlString.escape(Infinity), 'Infinity');
  }
});

test('SqlString.format', {
  'question marks are replaced with escaped array values': function() {
    var sql = SqlString.format('? and ?', ['a', 'b']);
    assert.equal(sql, "'a' and 'b'");
  },

  'question marks are replaced with escaped set values': function() {
    if (!iterableSupport) return;
    var set = new Set();
    set.add('a');
    set.add('b');
    var sql = SqlString.format('? and ?', set);
    assert.equal(sql, "'a' and 'b'");
  },

  'double quest marks are replaced with escaped id': function () {
    var sql = SqlString.format('SELECT * FROM ?? WHERE id = ?', ['table', 42]);
    assert.equal(sql, 'SELECT * FROM `table` WHERE id = 42');
  },

  'extra question marks are left untouched': function() {
    var sql = SqlString.format('? and ?', ['a']);
    assert.equal(sql, "'a' and ?");
  },

  'extra arguments are not used': function() {
    var sql = SqlString.format('? and ?', ['a', 'b', 'c']);
    assert.equal(sql, "'a' and 'b'");
  },

  'extra arguments in a set are not used': function() {
    if (!iterableSupport) return;
    var set = new Set();
    set.add('a');
    set.add('b');
    set.add('c');
    var sql = SqlString.format('? and ?', set);
    assert.equal(sql, "'a' and 'b'");
  },

  'question marks within values do not cause issues': function() {
    var sql = SqlString.format('? and ?', ['hello?', 'b']);
    assert.equal(sql, "'hello?' and 'b'");
  },

  'undefined is ignored': function () {
    var sql = SqlString.format('?', undefined, false);
    assert.equal(sql, '?');
  },

  'objects is converted to values': function () {
    var sql = SqlString.format('?', { 'hello': 'world' }, false);
    assert.equal(sql, "`hello` = 'world'");
  },

  'maps is converted to values': function () {
    if (!iterableSupport) return;
    var map = new Map();
    map.set('hello', 'world');
    var sql = SqlString.format('?', map, false);
    assert.equal(sql, "`hello` = 'world'");
  },

  'objects is not converted to values': function () {
    var sql = SqlString.format('?', { 'hello': 'world' }, true);
    assert.equal(sql, "'[object Object]'");

    var sql = SqlString.format('?', { toString: function () { return 'hello'; } }, true);
    assert.equal(sql, "'hello'");
  },

  'maps is not converted to values': function () {
    if (!iterableSupport) return;
    var map = new Map();
    map.set('hello', 'world');

    var sql = SqlString.format('?', map, true);
    assert.equal(sql, "'[object Object]'");

    map.toString = function () { return 'hello'; };

    var sql = SqlString.format('?', map, true);
    assert.equal(sql, "'hello'");
  },

  'sql is untouched if no values are provided': function () {
    var sql = SqlString.format('SELECT ??');
    assert.equal(sql, 'SELECT ??');
  },

  'sql is untouched if values are provided but there are no placeholders': function () {
    var sql = SqlString.format('SELECT COUNT(*) FROM table', ['a', 'b']);
    assert.equal(sql, 'SELECT COUNT(*) FROM table');
  }
});
