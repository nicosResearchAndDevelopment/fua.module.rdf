const
    { Readable, Writable } = require('stream'),
    { createReadStream } = require('fs'),
    { fileURLToPath, pathToFileURL, URL } = require('url'),
    isFileURL = (re => re.test.bind(re))(/^file:\/\//),
    fetch = require('node-fetch'),
    SHACLValidator = require('rdf-validate-shacl'),
    { Statement: Quad, NamedNode, BlankNode, Literal, Variable, Collection, Namespace, defaultGraph } = require('rdflib'),
    { Store, StreamParser, Writer } = require('n3');

/**
 * @typedef {NamedNode} DefaultGraph
 * @typedef {{termType: String, value: String}} Term http://rdf.js.org/data-model-spec/#term-interface
 * @typedef {String} TTL A string of content type 'text/turtle'.
 * @typedef {String} URI Unique Resource Identifier
 * @typedef {String} Prefix
 * @typedef {{message, path, focusNode, severity, sourceConstraintComponent, sourceShape}} ValidationResult
 * @typedef {{conforms: Boolean, results: Array<ValidationResult>}} ValidationReport
 */

/**
 * - https://rdf.js.org/dataset-spec/#dom-datasetfactory
 * - https://rdf.js.org/data-model-spec/#dfn-datafactory
 */
class Dataset extends Store {

    /**
     * - https://rdf.js.org/dataset-spec/#dfn-dataset
     * @param {Array<Quad>} quads
     * @constructs Dataset
     */
    constructor(quads = []) {
        super(quads, { factory: Dataset });
    } // Dataset#constructor

    /**
     * Can be used to import a stream with ttl content.
     * @param {Readable<TTL>} stream 
     * @param {NamedNode} [defaultGraph]
     * @returns {Promise}
     */
    async importTTL(stream, defaultGraph) {
        const parser = new StreamParser({
            factory: defaultGraph ? {
                namedNode: Dataset.namedNode,
                blankNode: Dataset.blankNode,
                literal: Dataset.literal,
                variable: Dataset.variable,
                defaultGraph: () => defaultGraph,
                quad: Dataset.quad,
                fromTerm: Dataset.fromTerm,
                fromQuad: Dataset.fromQuad
            } : Dataset
        });
        return this.import(parser.import(stream));
    } // Dataset#importTTL

    /**
     * Can be used to load a ttl file from disc or from the web. 
     * @param {URI} uri 
     * @param {NamedNode} [defaultGraph]
     * @returns {Promise}
     */
    async loadTTL(uri, defaultGraph) {
        if (uri instanceof URL) uri = uri.toString();
        if (isFileURL(uri)) {
            const reader = createReadStream(fileURLToPath(uri));
            return this.importTTL(reader, defaultGraph || new NamedNode(uri));
        } else {
            const response = await fetch(uri, {
                method: 'get',
                headers: { Accept: 'text/turtle' }
            });
            return this.importTTL(response.body, defaultGraph || new NamedNode(uri));
        }
    } // Dataset#loadTTL

    /**
     * Can be used to generate a map with fully meshed nodes.
     * @param {Object<Prefix, URI>} [context={}]
     * @param {Object} [optns]
     * @param {Boolean} [optns.compact=true]
     * @param {Boolean} [optns.meshed=true]
     * @returns {Map<URI, Object>}
     */
    generateGraph(context = {}, { compact = true, meshed = true, blanks = false } = {}) {
        const
            /** @type {Map<URI, Object>} */
            subjectMap = new Map(),
            /** @type {Map<URI, { "@id": String, [missingRef]: Array<[URI, URI]> }>} */
            missingMap = new Map(),
            /** @type {Map<URI, Object>} */
            blankMap = new Map(),
            /** @type {Map<URI, URI>} */
            idMap = new Map([
                ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type', '@type']
            ]),
            /** @type {Map<Prefix, URI>} */
            prefixMap = new Map(Object.entries(context));

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
                    node = subjectMap.get(nodeId) || missingMap.get(nodeId);
                    if (!node) {
                        node = { '@id': nodeId };
                        missingMap.set(nodeId, node);
                    }
                    break;

                case 'BlankNode':
                    nodeId = term.value;
                    node = blankMap.get(nodeId);
                    if (!node) {
                        node = blanks ? { '@id': nodeId } : {};
                        blankMap.set(nodeId, node);
                    }
                    break;

                case 'Literal':
                    if (term.lang) {
                        node = {
                            '@value': term.value,
                            '@language': term.lang
                        };
                    } else if (term.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
                        node = {
                            '@value': term.value,
                            '@type': _prefixId(term.datatype.value)
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
        function _processQuad({ subject, predicate, object, graph }) {
            const
                subj = _parseTerm(subject),
                pred = _prefixId(predicate.value),
                obj = meshed || object.termType !== 'NamedNode' || (blanks && object.termType === 'BlankNode')
                    ? _parseTerm(object)
                    : { '@id': _parseTerm(object)['@id'] };

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
        Array.from(this).forEach(_processQuad);
        if (blanks) blankMap.forEach(blankNode => subjectMap.set(blankNode['@id'], blankNode));
        return subjectMap;
    } // Dataset#generateGraph

    /**
     * Can be used to validate this dataset, if the given dataset contains shacl shapes.
     * @param {Dataset} shapeset 
     * @returns {ValidationReport} https://www.npmjs.com/package/rdf-validate-shacl
     */
    shaclValidate(shapeset) {
        const validator = new SHACLValidator(shapeset, { factory: Dataset });
        return validator.validate(this);
    } // Dataset#shaclValidate

    async exportTTL(context = {}) {
        const writer = new Writer({
            prefixes: context
        });
        for (let quad of this) {
            writer.addQuad(quad);
        }
        const result = await new Promise((resolve, reject) => writer.end(
            (err, result) => err ? reject(err) : resolve(result)
        ));
        return result;
    } // Dataset#exportTTL

    //#region RDF/JS: DatasetCore

    /**
     * https://rdf.js.org/dataset-spec/#dfn-size
     * @type {Number}
     */
    get size() {
        return super.size;
    } // Dataset#size

    /**
     * @returns {Iterable<Quad>}
     */
    [Symbol.iterator]() {
        // TODO iterate more efficiently without creating an array
        const quads = super.getQuads();
        return quads[Symbol.iterator]();
    } // Dataset#[Symbol.iterator]

    /**
     * https://rdf.js.org/dataset-spec/#dfn-add
     * @param {Quad} quad
     * @returns {Dataset} this
     */
    add(quad) {
        super.addQuad(quad);
        return this;
    } // Dataset#add

    /**
     * https://rdf.js.org/dataset-spec/#dfn-delete
     * @param {Quad} quad
     * @returns {Dataset} this
     */
    delete(quad) {
        super.removeQuad(quad);
        return this;
    } // Dataset#delete

    /**
     * https://rdf.js.org/dataset-spec/#dfn-has
     * @param {Quad} quad
     * @returns {Boolean} true, if this contains the quad
     */
    has(quad) {
        return super.countQuads(
            quad.subject, quad.predicate, quad.object, quad.graph
        ) > 0;
    } // Dataset#has

    /**
     * https://rdf.js.org/dataset-spec/#dfn-match
     * @param {Term} subject
     * @param {Term} predicate
     * @param {Term} object
     * @param {Term} graph
     * @returns {Dataset} new dataset with matching quads
     */
    match(subject, predicate, object, graph) {
        return new Dataset(super.getQuads(subject, predicate, object, graph));
    } // Dataset#match

    //#endregion RDF/JS: DatasetCore

    //#region RDF/JS: Dataset

    /**
     * https://rdf.js.org/dataset-spec/#dfn-addall
     * @param {Array<Quad>} quads 
     * @returns {Dataset} this
     */
    addAll(quads) {
        super.addQuads(quads);
        return this;
    } // Dataset#addAll

    /**
     * https://rdf.js.org/dataset-spec/#dfn-contains
     * @param {Dataset} dataset 
     * @returns {Boolean} true, if dataset is subset of this
     */
    contains(dataset) {
        return dataset.every(quad => this.has(quad));
    } // Dataset#contains

    /**
     * https://rdf.js.org/dataset-spec/#dfn-deletematches
     * @param {Term} subject
     * @param {Term} predicate
     * @param {Term} object
     * @param {Term} graph
     * @returns {Dataset} this
     */
    deleteMatches(subject, predicate, object, graph) {
        super.removeMatches(subject, predicate, object, graph);
        return this;
    } // Dataset#deleteMatches

    /**
     * https://rdf.js.org/dataset-spec/#dfn-difference
     * @param {Dataset} dataset 
     * @returns {Dataset} new dataset without the quads of the given dataset
     */
    difference(dataset) {
        return this.filter(quad => !dataset.has(quad));
    } // Dataset#difference

    /**
     * https://rdf.js.org/dataset-spec/#dfn-equals
     * @param {Dataset} dataset 
     * @returns {Boolean} true, if graph structure is equal
     */
    equals(dataset) {
        return this.size === dataset.size
            && this.contains(dataset)
            && dataset.contains(this);
    } // Dataset#equals

    /**
     * https://rdf.js.org/dataset-spec/#dfn-every
     * @param {(quad: Quad, dataset: Dataset) => Boolean} iteratee 
     * @returns {Boolean} true, if iteratee never returns false
     */
    every(iteratee) {
        return super.every(
            quad => iteratee(quad, this)
        );
    } // Dataset#every

    /**
     * https://rdf.js.org/dataset-spec/#dfn-filter
     * @param {(quad: Quad, dataset: Dataset) => Boolean} iteratee 
     * @returns {Dataset} new dataset with all passing quads
     */
    filter(iteratee) {
        return new Dataset(
            super.getQuads().filter(
                quad => iteratee(quad, this)
            )
        );
    } // Dataset#filter

    /**
     * https://rdf.js.org/dataset-spec/#dfn-foreach
     * @param {(quad: Quad, dataset: Dataset) => *} iteratee 
     * @returns {Dataset} this
     */
    forEach(iteratee) {
        super.forEach(
            quad => iteratee(quad, this)
        );
        return this;
    } // Dataset#forEach

    /**
     * https://rdf.js.org/dataset-spec/#dfn-import
     * @param {Readable<Quad>} stream 
     * @returns {Promise}
     */
    import(stream) {
        return new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
            super.import(stream);
        });
    } // Dataset#import

    /**
     * https://rdf.js.org/dataset-spec/#dfn-intersection
     * @param {Dataset} dataset 
     * @returns {Dataset} new dataset with all quads that are in both datasets
     */
    intersection(dataset) {
        return this.filter(quad => dataset.has(quad));
    } // Dataset#intersection

    /**
     * https://rdf.js.org/dataset-spec/#dfn-map
     * @param {(quad: Quad, dataset: Dataset) => Quad} iteratee 
     * @returns {Dataset} new dataset with mapped quads
     */
    map(iteratee) {
        return new Dataset(
            super.getQuads().map(
                quad => iteratee(quad, this)
            )
        );
    } // Dataset#map

    /**
     * https://rdf.js.org/dataset-spec/#dfn-reduce
     * @param {(acc: *, quad: Quad, dataset: Dataset) => *} iteratee 
     * @param {*} [initialValue]
     * @returns {*}
     */
    reduce(iteratee, initialValue) {
        return super.getQuads().reduce(
            (acc, val) => iteratee(acc, val, this),
            initialValue
        );
    } // Dataset#reduce

    /**
     * https://rdf.js.org/dataset-spec/#dfn-some
     * @param {(quad: Quad, dataset: Dataset) => Boolean} iteratee 
     * @returns {Boolean} true, if iteratee once returns true
     */
    some(iteratee) {
        return super.some(
            quad => iteratee(quad, this)
        );
    } // Dataset#some

    /**
     * https://rdf.js.org/dataset-spec/#dfn-toarray
     * @returns {Array<Quad>}
     */
    toArray() {
        return super.getQuads();
    } // Dataset#toArray

    /**
     * https://rdf.js.org/dataset-spec/#dfn-tocanonical
     * @returns {String}
     */
    toCanonical() {
        // TODO implement rdf normalization algorithm
        throw new Error("curently not implemented");
    } // Dataset#toCanonical

    /**
     * https://rdf.js.org/dataset-spec/#dfn-tostream
     * @returns {Readable<Quad>}
     */
    toStream() {
        return super.match();
    } // Dataset#toStream

    /**
     * https://rdf.js.org/dataset-spec/#dfn-tostring
     * @returns {String}
     */
    toString() {
        // TODO multiline literals are currently parsed invalid
        return super.getQuads().map(
            quad => quad.toString()
        ).join("\n");
    } // Dataset#toString

    /**
     * https://rdf.js.org/dataset-spec/#dfn-union
     * @param {Dataset} dataset 
     * @returns {Dataset} new dataset with all quads of both datasets
     */
    union(dataset) {
        return new Dataset(
            super.getQuads().concat(
                dataset
                    .difference(this)
                    .toArray()
            )
        );
    } // Dataset#union

    //#endregion RDF/JS: Dataset

    //#region RDF/JS: DatasetFactory

    /**
     * https://rdf.js.org/dataset-spec/#dom-datasetfactory-dataset
     * @param {Dataset|Array<Quad>|Iterable<Quad>} [quads] 
     * @returns {Dataset} new dataset with given quads
     */
    static dataset(quads) {
        return new Dataset(quads ? Array.isArray(quads) ? quads : Array.from(quads) : []);
    } // Dataset.dataset

    //#endregion RDF/JS: DatasetFactory

    //#region RDF/JS: DataFactory

    /**
     * https://rdf.js.org/data-model-spec/#dfn-namednode
     * @param {URI} iri 
     * @returns {NamedNode}
     */
    static namedNode(iri) {
        return new NamedNode(iri);
    } // Dataset.namedNode

    /**
     * https://rdf.js.org/data-model-spec/#dfn-blanknode
     * @param {String} [id] 
     * @returns {BlankNode}
     */
    static blankNode(id) {
        // TODO generate id from uuid
        return new BlankNode(id);
    } // Dataset.blankNode

    /**
     * https://rdf.js.org/data-model-spec/#dfn-literal
     * @param {String} value 
     * @param {String|NamedNode} [langOrDatatype]
     * @returns {Literal}
     */
    static literal(value, langOrDatatype) {
        return new Literal(
            value,
            typeof langOrDatatype === 'string' ? langOrDatatype : undefined,
            langOrDatatype instanceof NamedNode ? langOrDatatype : undefined
        );
    } // Dataset.literal

    /**
     * https://rdf.js.org/data-model-spec/#dfn-variable
     * @param {String} [name] 
     */
    static variable(name) {
        return new Variable(name);
    } // Dataset.variable

    /**
     * https://rdf.js.org/data-model-spec/#dfn-defaultgraph
     * @returns {DefaultGraph}
     */
    static defaultGraph() {
        return defaultGraph();
    } // Dataset.defaultGraph

    /**
     * https://rdf.js.org/data-model-spec/#dfn-quad-0
     * @param {Term} subject 
     * @param {Term} predicate 
     * @param {Term} object 
     * @param {Term} [graph=this.defaultGraph()] 
     * @returns {Quad}
     */
    static quad(subject, predicate, object, graph = this.defaultGraph()) {
        return new Quad(subject, predicate, object, graph);
    } // Dataset.quad

    /**
     * https://rdf.js.org/data-model-spec/#dfn-fromterm
     * @param {Term} original 
     * @returns {Term} 
     */
    static fromTerm(original) {
        switch (original.termType) {
            case 'NamedNode': return this.namedNode(original.value);
            case 'BlankNode': return this.blankNode(original.value);
            case 'Literal': return this.literal(original.value, original.lang, original.datatype);
            case 'Variable': return this.variable(original.value);
        }
    } // Dataset.fromTerm

    /**
     * https://rdf.js.org/data-model-spec/#dfn-fromquad
     * @param {Quad} original 
     * @returns {Quad}
     */
    static fromQuad(original) {
        return this.quad(
            this.fromTerm(original.subject),
            this.fromTerm(original.predicate),
            this.fromTerm(original.object),
            this.fromTerm(original.graph)
        );
    } // Dataset.fromQuad

    //#endregion RDF/JS: DataFactory

} // Dataset

module.exports = Dataset;