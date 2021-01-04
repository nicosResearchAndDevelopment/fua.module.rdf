const
    Neo4jStore = require('../src/module.rdf.Neo4jStore.js'),
    { namedNode, quad, literal, Namespace } = require('rdflib'),
    neo4j = require('neo4j-driver'),
    TEST = Namespace('http://example.com/'),
    XSD = Namespace('http://www.w3.org/2001/XMLSchema#'),
    graph = namedNode('bolt://localhost:7687/'),
    driver = neo4j.driver(graph.value, neo4j.auth.basic('neo4j', 'idsa')),
    store = new Neo4jStore(graph, driver);

(async (/* async-iife */) => {

    const
        q1 = quad(
            TEST('subject'),
            TEST('predicate'),
            TEST('object')
        ),
        q2 = quad(
            TEST('subject'),
            TEST('predicate'),
            literal('Hello World', 'en', XSD('langString'))
        ),
        q3 = quad(
            TEST('subject'),
            TEST('predicate'),
            TEST('subject')
        );

    console.log('add:', await store.add(q1));
    console.log('add:', await store.add(q2));

    console.log('match:', (await store.match(q1.subject, null, null)).toString());

    console.log('size:', (await store.size()));

    console.log('delete:', await store.delete(q1));

    console.log('has:', await store.has(q1));
    console.log('has:', await store.has(q2));
    console.log('has:', await store.has(q3));

    console.log('match:', (await store.match(null, null, q2.object)).toString());

    console.log('delete:', await store.delete(q2));

    console.log('size:', (await store.size()));

    debugger;

})(/* async-iife */).catch(console.error);