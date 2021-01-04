const
    { describe, it, before } = require('mocha'),
    expect = require('expect'),
    neo4j = require('neo4j-driver'),
    { Dataset, Neo4jStore } = require('../src/module.rdf.js');

describe('module.rdf.Neo4jStore', function() {

    // docker run \
    //     --publish=7474:7474 --publish=7687:7687 \
    //     --volume=C:/Users/spetrac/Fua/fua-js/lib/module.rdf/test/data/neo4j:/data \
    //     neo4j

    let driver, store, graph, quad_1, quad_2;

    before('construct the driver, the store, a graph node and two quads', async function() {
        graph = Dataset.namedNode('bolt://localhost:7687/');
        driver = neo4j.driver(graph.value, neo4j.auth.basic('neo4j', 'neo4j'));
        store = new Neo4jStore(graph, driver);
        quad_1 = Dataset.quad(
            Dataset.namedNode('http://example.com/subject'),
            Dataset.namedNode('http://example.com/predicate'),
            Dataset.namedNode('http://example.com/object'),
            graph
        );
        quad_2 = Dataset.quad(
            quad_1.subject,
            quad_1.predicate,
            Dataset.literal('Hello World', 'en'),
            graph
        );
    });

    it('should add the two quads to the store once', async function() {
        expect(await store.add(quad_1)).toBeTruthy();
        expect(await store.add(quad_2)).toBeTruthy();
        expect(await store.add(quad_1)).toBeFalsy();
        expect(await store.add(quad_2)).toBeFalsy();
    });

    it('should match the two added quads by their subject', async function() {
        /** @type {Dataset} */
        const dataset = await store.match(quad_1.subject);
        expect(dataset).toBeInstanceOf(Dataset);
        expect(dataset.has(quad_1)).toBeTruthy();
        expect(dataset.has(quad_2)).toBeTruthy();
    });

    it('should currently have a size of 2', async function() {
        expect(await store.size()).toBe(2);
    });

    it('should delete the first quad once', async function() {
        expect(await store.delete(quad_1)).toBeTruthy();
        expect(await store.delete(quad_1)).toBeFalsy();
    });

    it('should only have the second quad stored', async function() {
        expect(await store.has(quad_1)).toBeFalsy();
        expect(await store.has(quad_2)).toBeTruthy();
    });

    it('should match the remaining quad by its object', async function() {
        /** @type {Dataset} */
        const dataset = await store.match(null, null, quad_2.object);
        expect(dataset).toBeInstanceOf(Dataset);
        expect(dataset.has(quad_1)).toBeFalsy();
        expect(dataset.has(quad_2)).toBeTruthy();
    });

    it('should have a size of 0, after it deleted the second quad', async function() {
        await store.delete(quad_2);
        expect(await store.size()).toBe(0);
    });

});