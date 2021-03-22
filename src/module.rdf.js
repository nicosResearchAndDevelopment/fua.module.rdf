const
    rdf                      = exports,
    _                        = require('./module.rdf.util.js'),
    loadDataset              = require('./module.rdf.load.js'),
    {TermFactory, Dataset}   = require('@nrd/fua.module.persistence'),
    {Transform}              = require('stream'),
    SHACLValidator           = require('rdf-validate-shacl'),
    {default: rdfParser}     = require('rdf-parse'),
    {default: rdfSerializer} = require('rdf-serialize'),
    rdflib                   = require('rdflib'),
    n3                       = require('n3'),
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
    return await loadDataset.call(factory, config);
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
    const
        /** @type {Map<URI, Object>} */
        subjectMap = new Map(),
        /** @type {Map<URI, { "@id": String, [missingRef]: Array<[URI, URI]> }>} */
        missingMap = new Map(),
        /** @type {Map<URI, Object>} */
        blankMap   = new Map(),
        /** @type {Map<URI, URI>} */
        idMap      = new Map([
            ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type', '@type']
        ]),
        /** @type {Map<Prefix, URI>} */
        prefixMap  = new Map(Object.entries(context));

    /**
     * This function prefixes uris and caches them for this generation.
     * @param {URI} uri
     * @returns {URI}
     */
    function _prefixId(uri) {
        // return if already in idMap
        if (idMap.has(uri))
            return idMap.get(uri);

        // compact means, no prefixes gets registered
        if (!compact) return uri;

        // search all prefixes
        for (let [prefix, target] of prefixMap.entries()) {
            // if uri starts with a prefix, save entry in idMap and return
            if (uri.startsWith(target)) {
                let short = prefix + ":" + uri.substring(target.length);
                idMap.set(uri, short);
                return short;
            }
        }

        // if not returned already, there is no prefix for this uri
        idMap.set(uri, uri);
        return uri;
    } // _prefixId

    /**
     * This function takes a term, returns the corresponding value in jsonld and caches any nodes.
     * @param {Term} term
     * @returns {{"@id": String} | Object | String}
     */
    function _parseTerm(term) {
        let nodeId, node;
        switch (term.termType) {
            case 'NamedNode':
                nodeId = _prefixId(term.value);
                node   = subjectMap.get(nodeId) || missingMap.get(nodeId);
                if (!node) {
                    node = {'@id': nodeId};
                    missingMap.set(nodeId, node);
                }
                break;

            case 'BlankNode':
                nodeId = term.value;
                node   = blankMap.get(nodeId);
                if (!node) {
                    node = blanks ? {'@id': nodeId} : {};
                    blankMap.set(nodeId, node);
                }
                break;

            case 'Literal':
                if (term.lang) {
                    node = {
                        '@value':    term.value,
                        '@language': term.lang
                    };
                } else if (term.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
                    node = {
                        '@value': term.value,
                        '@type':  _prefixId(term.datatype.value)
                    };
                } else {
                    node = term.value;
                }
                break;

            default:
                node = null;
                break;
        }
        return node;
    } // _parseTerm

    /**
     * This function takes a quad and processes it to fill the graph and mesh nodes.
     * @param {{subject: Term, predicate: Term, object: Term, graph: Term}} term
     * @returns {undefined}
     */
    function _processQuad({subject, predicate, object, graph}) {
        const
            subj = _parseTerm(subject),
            pred = _prefixId(predicate.value),
            obj  = meshed || object.termType !== 'NamedNode' || (blanks && object.termType === 'BlankNode')
                ? _parseTerm(object)
                : {'@id': _parseTerm(object)['@id']};

        // add object to subject
        if (Array.isArray(subj[pred])) {
            subj[pred].push(obj);
        } else if (Reflect.has(subj, pred)) {
            subj[pred] = [subj[pred], obj];
        } else {
            subj[pred] = obj;
        }

        // move from missingMap to subjectMap, if necessary
        if (missingMap.has(subj['@id'])) {
            missingMap.delete(subj['@id']);
            subjectMap.set(subj['@id'], subj);
        }
    } // _processQuad

    // iterates over all quads, parses their terms and meshes them
    Array.from(dataset).forEach(_processQuad);
    if (blanks) blankMap.forEach(blankNode => subjectMap.set(blankNode['@id'], blankNode));
    return subjectMap;
}; // rdf.generateGraph

class N3Store extends n3.Store {
    [Symbol.iterator]() {
        const quads = this.getQuads();
        return quads[Symbol.iterator]();
    }

    match(...args) {
        return new N3Store(this.getQuads(...args));
    }

    add(quad) {
        this.addQuad(quad);
    }

    delete(quad) {
        this.removeQuad(quad);
    }
}

const N3DataFactory = Object.assign({}, n3.DataFactory, {
    dataset: (quads) => new N3Store(quads),
    fromTerm(term) {
        switch (term.termType) {
            case 'NamedNode':
                return N3DataFactory.namedNode(term.value);
            case 'BlankNode':
                return N3DataFactory.blankNode(term.value);
            case 'Literal':
                return N3DataFactory.literal(term.value, term.language || N3DataFactory.fromTerm(term.datatype));
            case 'Variable':
                return N3DataFactory.variable(term.value);
            case 'DefaultGraph':
                return N3DataFactory.defaultGraph();
            case 'Quad':
                return N3DataFactory.fromQuad(term);
        }
    },
    fromQuad(quad) {
        return N3DataFactory.quad(
            N3DataFactory.fromTerm(quad.subject),
            N3DataFactory.fromTerm(quad.predicate),
            N3DataFactory.fromTerm(quad.object),
            N3DataFactory.fromTerm(quad.graph)
        );
    }
});

function _datasetToN3Store(dataset) {
    const store = N3DataFactory.dataset();
    for (let quad of dataset) {
        store.addQuad(N3DataFactory.fromQuad(
            dataset.factory.resolveQuad(quad)
        ));
    }
    return store;
} // _datasetToN3Store

function _n3StoreToDataset(store, factory) {
    const quads = store.getQuads().map(quad => factory.fromQuad(quad));
    return new Dataset(quads, factory);
} // _n3StoreToDataset

/**
 * @param {Dataset} dataset
 * @param {Dataset} shapeset
 * @returns {Promise<Dataset>}
 */
rdf.shaclValidate = async function (dataset, shapeset) {
    _.assert(dataset instanceof Dataset, 'shaclValidate : invalid dataset', TypeError);
    _.assert(shapeset instanceof Dataset, 'shaclValidate : invalid shapeset', TypeError);
    /*  REM
        The following conversion of datasets into n3 stores is necessary, because the rdf-validate-shacl package
        causes bugs because of some of its dependencies. They claim that it would be compatible with
        rdf/js compliant factories, but it turned out that it was not even easily compatible with 
        major rdf/js implementations, like n3 and rdflib. The N3Store and N3DataFactory are wrapper of n3 
        and necessary to add missing functionality on which rdf-validate-shacl relies on. The results are
        then again transformed back into a dataset.
        */
    const
        _dataset   = _datasetToN3Store(dataset),
        _shapeset  = _datasetToN3Store(shapeset),
        _validator = new SHACLValidator(_shapeset, {factory: N3DataFactory}),
        _report    = await _validator.validate(_dataset),
        reportset  = _n3StoreToDataset(_report.dataset, dataset.factory);
    return reportset;
}; // rdf.shaclValidate