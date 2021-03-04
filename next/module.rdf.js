const
    rdf                      = exports,
    _                        = require('./module.rdf.util.js'),
    {TermFactory, Dataset}   = require('@nrd/fua.module.persistence'),
    {Readable, Writable}     = require('stream'),
    //SHACLValidator          = require('rdf-validate-shacl'),
    {default: rdfParser}     = require('rdf-parse'),
    {default: rdfSerializer} = require('rdf-serialize');

rdf.wrapFactory = function (factory) {
    _.assert(factory instanceof TermFactory, 'wrapFactory : invalid factory', TypeError);
    return {
        namedNode:    (iri) => factory.namedNode(iri),
        blankNode:    (id) => factory.blankNode(id),
        literal:      (value, langOrDt) => factory.literal(value, langOrDt),
        variable:     (name) => factory.variable(name),
        defaultGraph: () => factory.defaultGraph(),
        quad:         (subj, pred, obj, graph) => factory.quad(subj, pred, obj, graph),
        fromTerm:     (orig) => factory.fromTerm(orig),
        fromQuad:     (orig) => factory.fromQuad(orig),
        dataset:      (quads) => new Dataset(quads, factory)
    };
}; // rdf.wrapFactory

rdf.parseStream = async function (textStream, contentType, factory) {
    _.assert(textStream instanceof Readable, 'parseStream : invalid textStream', TypeError);
    _.assert(_.isString(contentType), 'parseStream : invalid contentType', TypeError);
    _.assert(factory instanceof TermFactory, 'parseStream : invalid factory', TypeError);

    _.assert(!textStream.readableObjectMode, 'parseStream : textStream in objectMode');
    /** @type {Array<string>} */ const contentTypes = await rdfParser.getContentTypes();
    _.assert(contentTypes.includes(contentType), 'parseStream : unknown contentType ' + contentType);

    const quadStream = rdfParser.parse(textStream, {contentType});

    // TODO
}; // rdf.parseStream

rdf.serializeStream = async function (quadStream, contentType, factory) {
    _.assert(quadStream instanceof Readable, 'serializeStream : invalid quadStream', TypeError);
    _.assert(_.isString(contentType), 'serializeStream : invalid contentType', TypeError);
    _.assert(factory instanceof TermFactory, 'serializeStream : invalid factory', TypeError);

    _.assert(quadStream.readableObjectMode, 'serializeStream : quadStream not in objectMode');
    /** @type {Array<string>} */ const contentTypes = await rdfSerializer.getContentTypes();
    _.assert(contentTypes.includes(contentType), 'serializeStream : unknown contentType');

    const textStream = rdfSerializer.serialize(quadStream, {contentType});

    // TODO
}; // rdf.serializeStream

rdf.transformStream = async function (quadStream, transformer, factory) {
    _.assert(quadStream instanceof Readable, 'transformStream : invalid quadStream', TypeError);
    _.assert(_.isFunction(transformer), 'transformStream : invalid transformer', TypeError);
    _.assert(factory instanceof TermFactory, 'transformStream : invalid factory', TypeError);

    _.assert(quadStream.readableObjectMode, 'transformStream : quadStream not in objectMode');

    // TODO
};