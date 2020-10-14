const
    { promisify } = require('util'),
    stream = require('stream'),
    { Readable, Writable } = stream,
    pipeline = promisify(stream.pipeline),
    { fileURLToPath, pathToFileURL } = require('url'),
    { join: joinPath } = require('path'),
    { createReadStream } = fs = require('fs'),
    readFile = promisify(fs.readFile),
    rdfExt = require('rdf-ext'),
    ParserN3 = require('@rdfjs/parser-n3'),
    SHACLValidator = require('rdf-validate-shacl'),
    rdfLib = require('rdflib'),
    jsonld = require('jsonld'),
    N3 = require('n3'),
    fetch = require('node-fetch');

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
 */

/**
 * https://rdf.js.org/dataset-spec/
 * @extends N3.Store 
 */
module.exports = class Dataset extends N3.Store {

    /**
     * @param {Array<Quad>} quads
     */
    constructor(quads = []) {
        super(quads, {
            factory: rdfLib.DataFactory
        });
    }

    /**
     * https://rdf.js.org/dataset-spec/#dfn-add
     * @param {Quad} quad
     * @returns {Dataset}
     */
    add(quad) {
        super.addQuad(quad);
        return this;
    }

    /**
     * https://rdf.js.org/dataset-spec/#dfn-delete
     * @param {Quad} quad
     * @returns {Dataset}
     */
    delete(quad) {
        super.removeQuad(quad);
        return this;
    }

    /**
     * https://rdf.js.org/dataset-spec/#dfn-has
     * @param {Quad} quad
     * @returns {Boolean}
     */
    has(quad) {
        throw new Error("not implemented yet"); // TODO
    }

    /**
     * https://rdf.js.org/dataset-spec/#dfn-match
     * @param {Term} subject
     * @param {Term} predicate
     * @param {Term} object
     * @param {Term} graph
     */
    match(subject, predicate, object, graph) {
        throw new Error("not implemented yet"); // TODO
    }

};