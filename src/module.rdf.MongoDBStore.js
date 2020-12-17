const
    module_name = 'module.rdf.MongoDBStore',
    { EventEmitter } = require('events'),
    { MongoClient } = require('mongodb'),
    Dataset = require('./module.rdf.Dataset.js'),
    { isQuad, isNamedNode,  isLiteral, isSubject, isPredicate, isRDFObject: isObject } = require('rdflib');

class MongoDBStore extends EventEmitter {

    #graph = null;
    #db = null;

    constructor(graph, db) {
        if(!isNamedNode(graph))
            throw new Error(`${module_name}#constructor : invalid graph`);
        if(!(db && typeof db.collection === 'function'))
            throw new Error(`${module_name}#constructor : invalid db`);

        super();
        this.#graph = graph;
        this.#db = db;
    }

    /**
     * @returns {Promise<Number>} the number of quads
     */
    async size() {
        // TODO
    } // Neo4jStore#size

    /**
     * @param {Quad} quad
     * @returns {Promise<Boolean>} true, if an actual quad got added
     */
    async add(quad) {
        // TODO
    } // Neo4jStore#add

    /**
     * @param {Quad} quad
     * @returns {Promise<Boolean>} true, if an actual quad got deleted
     */
    async delete(quad) {
        // TODO
    } // Neo4jStore#delete

    /**
     * @param {Quad} quad
     * @returns {Promise<Boolean>} true, if the store contains the quad
     */
    async has(quad) {
        // TODO
    } // Neo4jStore#has

    /**
     * @param {Term} [subject]
     * @param {Term} [predicate]
     * @param {Term} [object]
     * @returns {Promise<Dataset>} new dataset with matching quads
     */
    async match(subject, predicate, object) {
        // TODO
    } // Neo4jStore#match

} // MongoDBStore

module.exports = MongoDBStore;