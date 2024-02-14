const
    rdf                      = exports,
    _                        = require('./module.rdf.util.js'),
    loadDataFiles            = require('./module.rdf.load.js'),
    shaclValidate            = require('./module.rdf.shacl.js'),
    jsonModel                = require('./module.rdf.json-model.js'),
    {TermFactory, Dataset}   = require('@nrd/fua.module.persistence'),
    {Readable, Transform}    = require('stream'),
    {default: rdfParser}     = require('rdf-parse'),
    {default: rdfSerializer} = require('rdf-serialize'),
    contentTypes             = Object.freeze([
        'text/turtle', 'application/ld+json', 'application/json',
        'application/n-quads', 'application/n-triples', 'application/trig',
        // REM: rdf+xml is currently only supported by the parser, not the serializer
        'application/rdf+xml'
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
 * @param {string} [baseIRI]
 * @returns {Readable<Quad>}
 */
rdf.parseStream = function (textStream, contentType, factory, baseIRI) {
    _.assert(textStream && _.isFunction(textStream.pipe), 'parseStream : invalid textStream', TypeError);
    _.assert(_.isString(contentType), 'parseStream : invalid contentType', TypeError);
    _.assert(factory instanceof TermFactory, 'parseStream : invalid factory', TypeError);
    if (baseIRI) _.assert(_.isString(baseIRI), 'parseStream : invalid factory');

    _.assert(!textStream.readableObjectMode, 'parseStream : textStream in objectMode');
    _.assert(contentTypes.includes(contentType), 'parseStream : unknown contentType ' + contentType);

    const
        quadStream      = rdfParser.parse(textStream, {contentType, baseIRI: baseIRI || undefined}),
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

    // REM: nice idea and it would work, but the problem is that prefixed iris also gets wrapped in <>
    //const
    //    prefixArray  = Object.entries(factory.context()).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`),
    //    prefixStream = Readable.from([...prefixArray, '\n']),
    //    textStream   = rdfSerializer.serialize(quadStream, {contentType});
    //
    //return _.concatStreams(prefixStream, textStream);
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

    const
        textStream     = rdf.serializeStream(dataset.toStream(), contentType, dataset.factory),
        textResult     = await new Promise((resolve, reject) => {
            const chunks = [];
            textStream.on('data', chunk => chunks.push(chunk.toString()));
            textStream.on('error', err => reject(err));
            textStream.on('end', () => resolve(chunks.join('')));
        }),
        contextEntries = Object.entries(dataset.context());

    if (contentType === 'text/turtle') {
        const
            prefixText = contextEntries.length > 0
                ? contextEntries.map(([prefix, iri]) => `@prefix ${prefix}: <${iri}>.`).join('\n') + '\n\n'
                : '',
            mainText   = contextEntries.length > 0
                ? textResult.replace(/<([^ <>"{}|^`\\]+)>/g, (match, original) => {
                    for (let [prefix, iri] of contextEntries) {
                        if (original.startsWith(iri) && original.length > iri.length)
                            return prefix + ':' + original.substr(iri.length);
                    }
                    return match;
                })
                : textResult;
        return prefixText + mainText;
    } else if (contentType === 'application/ld+json') {
        const
            contextText = contextEntries.length > 0
                ? JSON.stringify(Object.fromEntries(contextEntries), null, 2)
                : '{}',
            graphText   = contextEntries.length > 0
                ? textResult.replace(/"([^ <>"{}|^`\\]+)"/g, (match, original) => {
                    for (let [prefix, iri] of contextEntries) {
                        if (original.startsWith(iri) && original.length > iri.length)
                            return '"' + prefix + ':' + original.substr(iri.length) + '"';
                    }
                    return match;
                }).trim()
                : textResult.trim();
        return `{\n  "@context": ${contextText.replace(/^/mg, '  ')},\n  "@graph": ${graphText.replace(/^/mg, '  ')}\n}`;
    } else {
        return textResult;
    }
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
 * @typedef {{ '@context'?: 'fua.load.rdf', '@id'?: string, 'dct:identifier': string, 'dct:format': string, 'dct:title'?: string, 'dct:alternative'?: string, 'dct:requires'?: Array<FuaLoadRDF> }} FuaLoadRDF
 */
/**
 * @typedef {{ id: string, identifier: string, format: string, title: string, alternative: string, requires: Array<string>, dataset?: Dataset }} FuaLoadRDFResult
 */
/**
 * @param {FuaLoadRDF|Array<FuaLoadRDF>} config
 * @param {TermFactory} [factory]
 * @returns {Promise<Array<FuaLoadRDFResult>>}
 */
rdf.loadDataFiles = async function (config, factory = defaultFactory) {
    _.assert(_.isObject(config), 'loadDataFiles : invalid config');
    _.assert(factory instanceof TermFactory, 'loadDataFiles : invalid factory');
    return await loadDataFiles.call(factory, config);
}; // rdf.loadDataFiles

/**
 * @type {{[key: FuaGraphPreset]: FuaGraphOptions}}
 * @private
 */
const _graphOptionPresets = {
    'default': {},
    'flat':    {
        meshed:   false,
        blanks:   true,
        compact:  false,
        lists:    false,
        prefixes: false,
        strings:  false,
        types:    false
    },
    'minimal': {
        meshed:   true,
        blanks:   false,
        compact:  true,
        lists:    true,
        prefixes: true,
        strings:  true,
        types:    false
    }
};

/**
 * @typedef {"default"|"flat"|"minimal"} FuaGraphPreset
 */
/**
 * @typedef {{}} FuaGraphOptions
 * @property {boolean} meshed If true, the graph uses real object references, else it uses @id references.
 * @property {boolean} blanks If true, the blank nodes will be added to the graph, else they will only be included in the references.
 * @property {boolean} compact If true, single references will be referenced directly, else an array will always be used.
 * @property {boolean} lists If true, rdf collections will be collected in a list array, else they will be referenced as chain.
 * @property {boolean} prefixes If true, the prefixed ids will be used, else they will be resolved to full iris.
 * @property {boolean} strings If true, xsd strings will be used directly, else they will also be used with @value.
 * @property {boolean} types If true, the types will reference the type node, else it uses string id references.
 */
/**
 * Can be used to generate a map with fully meshed nodes.
 * @param {Dataset} dataset
 * @param {FuaGraphPreset|FuaGraphOptions} [options]
 * @returns {Map<URI, Object>}
 */
rdf.generateGraph = function (dataset, options = 'default') {
    _.assert(dataset instanceof Dataset, 'generateGraph : invalid dataset', TypeError);
    if (_.isString(options)) {
        _.assert(options in _graphOptionPresets, 'generateGraph : preset "' + options + '" not found');
        options = _graphOptionPresets[options];
    }
    return jsonModel.Graph.fromDataset(dataset, options);
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
