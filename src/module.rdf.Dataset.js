const
    { promisify } = require('util'),
    Stream = require('stream'),
    { Readable, Writable } = Stream,
    pipeline = promisify(Stream.pipeline),
    fs = require('fs'),
    { createReadStream } = fs,
    readFile = promisify(fs.readFile),
    { join: joinPath } = require('path'),
    { fileURLToPath, pathToFileURL } = require('url'),
    // rdfExt = require('rdf-ext'),
    // ParserN3 = require('@rdfjs/parser-n3'),
    fetch = require('node-fetch'),
    SHACLValidator = require('rdf-validate-shacl'),
    jsonld = require('jsonld'),
    rdfLib = require('rdflib'),
    n3 = require('n3');

/**
 * @typedef {rdfLib.DataFactory} DataFactory http://rdf.js.org/data-model-spec/#datafactory-interface
 * @typedef {rdfLib.IndexedFormula} Store http://rdf.js.org/stream-spec/#store-interface
 * @typedef {rdfLib.Statement} Quad http://rdf.js.org/data-model-spec/#quad-interface
 * @typedef {{termType: String, value: String}} Term http://rdf.js.org/data-model-spec/#term-interface
 * @typedef {rdfLib.NamedNode} NamedNode http://rdf.js.org/data-model-spec/#namednode-interface
 * @typedef {rdfLib.BlankNode} BlankNode http://rdf.js.org/data-model-spec/#blanknode-interface
 * @typedef {rdfLib.Literal} Literal http://rdf.js.org/data-model-spec/#literal-interface
 * @typedef {rdfLib.Variable} Variable http://rdf.js.org/data-model-spec/#variable-interface
 * @typedef {rdfLib.Collection} Collection
 * @typedef {rdfLib.Namespace} Namespace
 * @typedef {String} TTL A string of content type 'text/turtle'.
 */

/**
 * https://rdf.js.org/dataset-spec/#dfn-dataset
 * @class
 * @extends n3.Store 
 */
class Dataset extends n3.Store {

    /**
     * @param {Array<Quad>} quads
     * @constructs Dataset
     */
    constructor(quads = []) {
        super(quads, {
            factory: rdfLib.DataFactory
        });
    } // Dataset#constructor

    //#region RDF/JS: DatasetCore

    /**
     * https://rdf.js.org/dataset-spec/#dfn-size
     * @type {Number}
     */
    get size() {
        return super.size;
    } // Dataset#size

    [Symbol.iterator]() {
        // TODO iterate more efficiently without creating an array
        return super.getQuads()[Symbol.iterator]();
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
     * @param {*} initialValue
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
        // TODO
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
        return super.getQuads().map(
            quad => quad.toNQ()
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

    /**
     * @param {Readable<TTL>} stream 
     * @returns {Promise}
     */
    async importTTL(stream) {
        const parser = new n3.StreamParser({
            factory: rdfLib.DataFactory
        });
        return this.import(parser.import(stream));
    } // Dataset#importTTL

    /**
     * @param {String} filepath 
     * @returns {Promise}
     */
    async loadTTL(filepath) {
        const reader = createReadStream(filepath);
        return this.importTTL(reader);
    } // Dataset#loadTTL

} // Dataset

module.exports = Dataset;