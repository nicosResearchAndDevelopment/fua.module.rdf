const
    {PassThrough} = require('stream'),
    is            = require('@fua/core.is'),
    uuid          = require('@fua/core.uuid'),
    xsd_prefix    = 'xsd:',
    xsd_iri       = 'http://www.w3.org/2001/XMLSchema#';

exports.generateFileId = () => 'file://' + uuid.v4();

exports.isNonEmptyString = new is.validator.string(/\S/);
/**
 * @see https://tools.ietf.org/html/rfc3987#section-2.2
 * @see https://stackoverflow.com/questions/1547899/which-characters-make-a-url-invalid/36667242#answer-36667242
 */
exports.isIRIString = new is.validator.string(/^[a-z][a-z0-9+.-]*:[^\s"<>\\^`{|}]*$/i);
exports.isPrefixString     = new is.validator.string(/^[a-z][a-z0-9+.-]*$/i);
exports.isIdentifierString = new is.validator.string(/^\S+$/);
exports.isLanguageString   = new is.validator.string(/^[a-z]{1,3}(?:-[a-z0-9]{1,8})*$/i);

exports.nativeValueParser = function (type, value) {
    switch (type) {
        case xsd_prefix + 'boolean':
        case xsd_iri + 'boolean':
            return !['false', 'null', 'off', 'no', 'n', 'f', '0', ''].includes(value.toLowerCase());

        case xsd_prefix + 'integer':
        case xsd_iri + 'integer':
        case xsd_prefix + 'nonNegativeInteger':
        case xsd_iri + 'nonNegativeInteger':
        case xsd_prefix + 'positiveInteger':
        case xsd_iri + 'positiveInteger':
        case xsd_prefix + 'nonPositiveInteger':
        case xsd_iri + 'nonPositiveInteger':
        case xsd_prefix + 'negativeInteger':
        case xsd_iri + 'negativeInteger':
        case xsd_prefix + 'byte':
        case xsd_iri + 'byte':
        case xsd_prefix + 'unsignedByte':
        case xsd_iri + 'unsignedByte':
        case xsd_prefix + 'int':
        case xsd_iri + 'int':
        case xsd_prefix + 'unsignedInt':
        case xsd_iri + 'unsignedInt':
        case xsd_prefix + 'long':
        case xsd_iri + 'long':
        case xsd_prefix + 'unsignedLong':
        case xsd_iri + 'unsignedLong':
        case xsd_prefix + 'short':
        case xsd_iri + 'short':
        case xsd_prefix + 'unsignedShort':
        case xsd_iri + 'unsignedShort':
            return parseInt(value);

        case xsd_prefix + 'decimal':
        case xsd_iri + 'decimal':
        case xsd_prefix + 'float':
        case xsd_iri + 'float':
        case xsd_prefix + 'double':
        case xsd_iri + 'double':
            return parseFloat(value);

        case xsd_prefix + 'string':
        case xsd_iri + 'string':
        case xsd_prefix + 'anyURI':
        case xsd_iri + 'anyURI':
        default:
            return value;
    }
};

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
