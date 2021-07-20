const
    {PassThrough} = require('stream'),
    util          = require('@nrd/fua.core.util');

exports = module.exports = {
    ...util,
    assert:           new util.Assert('module.rdf'),
    isNonEmptyString: new util.StringValidator(/\S/),
    /**
     * @see https://tools.ietf.org/html/rfc3987#section-2.2
     * @see https://stackoverflow.com/questions/1547899/which-characters-make-a-url-invalid/36667242#answer-36667242
     */
    isIRIString:        new util.StringValidator(/^[a-z][a-z0-9+.-]*:[^\s"<>\\^`{|}]*$/i),
    isPrefixString:     new util.StringValidator(/^[a-z][a-z0-9+.-]*$/i),
    isIdentifierString: new util.StringValidator(/^\S+$/),
    isLanguageString:   new util.StringValidator(/^[a-z]{1,3}(?:-[a-z0-9]{1,8})*$/i)
};

exports.strValidator = util.StringValidator;
exports.arrValidator = util.ArrayValidator;

exports.toArray = function (arrayLike) {
    if (!arrayLike) {
        return [];
    } else if (typeof arrayLike === 'object') {
        if (Array.isArray(arrayLike)) return arrayLike;
        else if (typeof arrayLike[Symbol.iterator] === 'function') return Array.from(arrayLike);
        else return [arrayLike];
    } else {
        return [arrayLike];
    }
}; // toArray

exports.mergeStreams = function (...streams) {
    if (streams.length < 2) return streams[0];
    const pass  = new PassThrough();
    let waiting = streams.length;
    for (let stream of streams) {
        stream.pipe(pass, {end: false});
        stream.once('end', () => --waiting === 0 && pass.end());
    }
    return pass;
};

exports.concatStreams = function (...streams) {
    if (streams.length < 2) return streams[0];
    const pass = new PassThrough();
    for (let i = 1; i < streams.length; i++) {
        const prev = streams[i - 1], next = streams[i];
        prev.once('end', () => next.pipe(pass, {end: false}));
    }
    const first = streams[0], last = streams[streams.length - 1];
    first.pipe(pass, {end: false});
    last.once('end', () => pass.end());
    return pass;
};