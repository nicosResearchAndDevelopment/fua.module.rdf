const
    rdf                      = exports,
    _                        = require('./module.rdf.util.js'),
    loadDataFiles            = require('./module.rdf.load.js'),
    shaclValidate            = require('./module.rdf.shacl.js'),
    generateGraph            = require('./module.rdf.graph.js'),
    {TermFactory, Dataset}   = require('@nrd/fua.module.persistence'),
    {Transform}              = require('stream'),
    {default: rdfParser}     = require('rdf-parse'),
    {default: rdfSerializer} = require('rdf-serialize'),
    contentTypes             = Object.freeze([
        'text/turtle', 'application/ld+json', 'text/rdf+xml',
        'application/n-quads', 'application/n-triples', 'application/trig'
    ]),
    defaultFactory           = new TermFactory();

rdf.contentTypes = contentTypes;

/**
 * @param {TermFactory} factory
 * @returns {{namedNode, blankNode, literal, variable, defaultGraph, quad, fromTerm, fromQuad, dataset}}
 */
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

/**
 * @param {Readable<string>} textStream
 * @param {string} contentType
 * @param {TermFactory} factory
 * @returns {Readable<Quad>}
 */
rdf.parseStream = function (textStream, contentType, factory) {
    _.assert(textStream && _.isFunction(textStream.pipe), 'parseStream : invalid textStream', TypeError);
    _.assert(_.isString(contentType), 'parseStream : invalid contentType', TypeError);
    _.assert(factory instanceof TermFactory, 'parseStream : invalid factory', TypeError);

    _.assert(!textStream.readableObjectMode, 'parseStream : textStream in objectMode');
    _.assert(contentTypes.includes(contentType), 'parseStream : unknown contentType ' + contentType);

    const
        quadStream      = rdfParser.parse(textStream, {contentType}),
        transformStream = new Transform({
            readableObjectMode: true,
            writableObjectMode: true,
            transform(quadDoc, encoding, callback) {
                try {
                    const quad = factory.fromQuad(quadDoc);
                    callback(null, quad);
                } catch (err) {
                    callback(err);
                }
            }
        });

    quadStream.pipe(transformStream);
    return transformStream;
}; // rdf.parseStream

/**
 * @param {Readable<Quad>} quadStream
 * @param {string} contentType
 * @param {TermFactory} factory
 * @returns {Readable<string>}
 */
rdf.serializeStream = function (quadStream, contentType, factory) {
    _.assert(quadStream && _.isFunction(quadStream.pipe), 'serializeStream : invalid quadStream', TypeError);
    _.assert(_.isString(contentType), 'serializeStream : invalid contentType', TypeError);
    _.assert(factory instanceof TermFactory, 'serializeStream : invalid factory', TypeError);

    _.assert(quadStream.readableObjectMode, 'serializeStream : quadStream not in objectMode');
    _.assert(contentTypes.includes(contentType), 'serializeStream : unknown contentType');

    const
        transformStream = new Transform({
            readableObjectMode: true,
            writableObjectMode: true,
            transform(quad, encoding, callback) {
                try {
                    _.assert(factory.isQuad(quad), 'serializeStream : invalid quad', TypeError);
                    const transformed = factory.resolveQuad(quad);
                    callback(null, transformed);
                } catch (err) {
                    callback(err);
                }
            }
        }),
        textStream      = rdfSerializer.serialize(transformStream, {contentType});

    quadStream.pipe(transformStream);
    return textStream;
}; // rdf.serializeStream

/**
 * @param {Dataset} dataset
 * @param {string} contentType
 * @returns {Promise<string>}
 */
rdf.serializeDataset = async function (dataset, contentType) {
    _.assert(dataset instanceof Dataset, 'serializeDataset : invalid dataset', TypeError);
    _.assert(_.isString(contentType), 'serializeDataset : invalid contentType', TypeError);
    _.assert(contentTypes.includes(contentType), 'serializeDataset : unknown contentType');

    const textStream = rdf.serializeStream(dataset.toStream(), contentType, dataset.factory);

    return new Promise((resolve, reject) => {
        const chunks = [];
        textStream.on('data', chunk => chunks.push(chunk.toString()));
        textStream.on('error', err => reject(err));
        textStream.on('end', () => resolve(chunks.join('')));
    });
}; // rdf.serializeDataset

/**
 * @param {Readable<Quad>} quadStream
 * @param {function(Quad, TermFactory): Quad | null} transformer
 * @param {TermFactory} factory
 * @returns {Readable<Quad>}
 */
rdf.transformStream = function (quadStream, transformer, factory) {
    _.assert(quadStream && _.isFunction(quadStream.pipe), 'transformStream : invalid quadStream', TypeError);
    _.assert(_.isFunction(transformer), 'transformStream : invalid transformer', TypeError);
    _.assert(factory instanceof TermFactory, 'transformStream : invalid factory', TypeError);

    _.assert(quadStream.readableObjectMode, 'transformStream : quadStream not in objectMode');

    const
        transformStream = new Transform({
            readableObjectMode: true,
            writableObjectMode: true,
            async transform(quad, encoding, callback) {
                try {
                    _.assert(factory.isQuad(quad), 'transformStream : invalid quad', TypeError);
                    const transformed = await transformer(quad, factory);
                    if (transformed) {
                        _.assert(factory.isQuad(quad), 'transformStream : invalid transformed', TypeError);
                        callback(null, transformed);
                    } else {
                        callback();
                    }
                } catch (err) {
                    callback(err);
                }
            }
        });

    quadStream.pipe(transformStream);
    return transformStream;
}; // rdf.transformStream

/**
 * @typedef {{ '@context'?: 'fua.load.rdf', 'dct:identifier': string, 'dct:format': string, 'dct:title'?: string, 'dct:alternative'?: string, 'dct:requires'?: Array<FuaLoadRDF> }} FuaLoadRDF
 */
/**
 * @typedef {{ identifier: string, format: string, title: string, alternative: string, requires: Array<string> }} FuaLoadRDFResult
 */
/**
 * @param {FuaLoadRDF|Array<FuaLoadRDF>} config
 * @param {TermFactory} [factory]
 * @returns {Promise<Array<FuaLoadRDFResult>>}
 */
rdf.loadDataFiles = async function (config, factory = defaultFactory) {
    _.assert(_.isObject(config), 'loadDataset : invalid config');
    _.assert(factory instanceof TermFactory, 'loadDataset : invalid factory');
    return await loadDataFiles.call(factory, config);
}; // rdf.loadDataFiles

/**
 * Can be used to generate a map with fully meshed nodes.
 * @param {Dataset} dataset
 * @param {Object<Prefix, URI>} [context={}]
 * @param {Boolean} [compact=true]
 * @param {Boolean} [meshed=true]
 * @param {Boolean} [blanks=false]
 * @returns {Map<URI, Object>}
 *
 * @deprecated
 */
rdf.generateGraph = function (dataset, context = {}, {compact = true, meshed = true, blanks = false} = {}) {
    _.assert(dataset instanceof Dataset, 'shaclValidate : invalid dataset', TypeError);
    _.assert(_.isObject(context), 'shaclValidate : invalid context', TypeError);
    _.assert(_.isBoolean(compact), 'shaclValidate : invalid config.compact', TypeError);
    _.assert(_.isBoolean(meshed), 'shaclValidate : invalid config.meshed', TypeError);
    _.assert(_.isBoolean(blanks), 'shaclValidate : invalid config.blanks', TypeError);
    return generateGraph(dataset, context, {compact, meshed, blanks});
}; // rdf.generateGraph

/**
 * @param {Dataset} dataset
 * @param {Dataset} shapeset
 * @returns {Promise<Dataset>}
 */
rdf.shaclValidate = async function (dataset, shapeset) {
    _.assert(dataset instanceof Dataset, 'shaclValidate : invalid dataset', TypeError);
    _.assert(shapeset instanceof Dataset, 'shaclValidate : invalid shapeset', TypeError);
    return await shaclValidate(dataset, shapeset);
}; // rdf.shaclValidate