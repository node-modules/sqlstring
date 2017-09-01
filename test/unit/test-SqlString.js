var assert    = require('assert');
var SqlString = require('../../');
var test      = require('utest');

test('SqlString.escapeId', {
  'value is quoted': function() {
    assert.equal(SqlString.escapeId('id'), '`id`');
  },

  'value can be a number': function() {
    assert.equal(SqlString.escapeId(42), '`42`');
  },

  'value can be an object': function() {
    assert.equal(SqlString.escapeId({}), '`[object Object]`');
  },

  'value toString is called': function() {
    assert.equal(SqlString.escapeId({ toString: function() { return 'foo'; } }), '`foo`');
  },

  'value toString is quoted': function() {
    assert.equal(SqlString.escapeId({ toString: function() { return 'f`oo'; } }), '`f``oo`');
  },

  'value containing escapes is quoted': function() {
    assert.equal(SqlString.escapeId('i`d'), '`i``d`');
  },

  'value containing separator is quoted': function() {
    assert.equal(SqlString.escapeId('id1.id2'), '`id1`.`id2`');
  },

  'value containing separator and escapes is quoted': function() {
    assert.equal(SqlString.escapeId('id`1.i`d2'), '`id``1`.`i``d2`');
  },

  'value containing separator is fully escaped when forbidQualified': function() {
    assert.equal(SqlString.escapeId('id1.id2', true), '`id1.id2`');
  },

  'arrays are turned into lists': function() {
    assert.equal(SqlString.escapeId(['a', 'b', 't.c']), '`a`, `b`, `t`.`c`');
  },

  'nested arrays are flattened': function() {
    assert.equal(SqlString.escapeId(['a', ['b', ['t.c']]]), '`a`, `b`, `t`.`c`');
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

  'objects function properties are ignored': function() {
    assert.equal(SqlString.escape({a: 'b', c: function() {}}), "`a` = 'b'");
  },

  'nested objects are cast to strings': function() {
    assert.equal(SqlString.escape({a: {nested: true}}), "`a` = '[object Object]'");
  },

  'nested objects use toString': function() {
    assert.equal(SqlString.escape({a: { toString: function() { return 'foo'; } }}), "`a` = 'foo'");
  },

  'nested objects use toString is quoted': function() {
    assert.equal(SqlString.escape({a: { toString: function() { return "f'oo"; } }}), "`a` = 'f\\'oo'");
  },

  'arrays are turned into lists': function() {
    assert.equal(SqlString.escape([1, 2, 'c']), "1, 2, 'c'");
  },

  'nested arrays are turned into grouped lists': function() {
    assert.equal(SqlString.escape([[1,2,3], [4,5,6], ['a', 'b', {nested: true}]]), "(1, 2, 3), (4, 5, 6), ('a', 'b', '[object Object]')");
  },

  'nested objects inside arrays are cast to strings': function() {
    assert.equal(SqlString.escape([1, {nested: true}, 2]), "1, '[object Object]', 2");
  },

  'nested objects inside arrays use toString': function() {
    assert.equal(SqlString.escape([1, { toString: function() { return 'foo'; } }, 2]), "1, 'foo', 2");
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

  'SqlString.fn is available if Proxy is supported, otherwise not': function() {
    assert.equal(!!SqlString.fn, typeof Proxy === 'function');
  },

  'SqlString.fn escapes SQL functions properly, if Proxy is supported': function() {
    if (typeof Proxy !== 'function') {
      return;
    }

    var a = SqlString.fn.POINT(123, 456);
    var b = SqlString.fn.CURRENT_TIMESTAMP();

    assert.strictEqual(SqlString.escape(a), 'POINT(123, 456)');
    assert.strictEqual(SqlString.escape(b), 'CURRENT_TIMESTAMP()');
  },

  'SqlString.fn escapes nested SQL functions properly, if Proxy is supported': function() {
    if (typeof Proxy !== 'function') {
      return;
    }

    var fn = SqlString.fn.CONCAT(SqlString.fn.UPPER('abc'), SqlString.fn.LOWER('ABC'));

    assert.strictEqual(SqlString.escape(fn), "CONCAT(UPPER('abc'), LOWER('ABC'))");
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

  'objects is not converted to values': function () {
    var sql = SqlString.format('?', { 'hello': 'world' }, true);
    assert.equal(sql, "'[object Object]'");

    var sql = SqlString.format('?', { toString: function () { return 'hello'; } }, true);
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
