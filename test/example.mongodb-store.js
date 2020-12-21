const
    MongoDBStore = require('../src/module.rdf.MongoDBStore.js'),
    { namedNode, quad, literal, Namespace } = require('rdflib'),
    { MongoClient } = require('mongodb'),
    TEST = Namespace('http://example.com/'),
    XSD = Namespace('http://www.w3.org/2001/XMLSchema#'),
    graph = namedNode('mongodb://localhost:27017/');

async function _createIndex(collection) {
    return collection.createIndexes([
        {
            key: {
                subject: 1,
                predicate: 1,
                object: 1
            },
            name: "tripel",
            unique: true
        },
        {
            key: {
                subject: 1
            },
            name: "subject"
        },
        {
            key: {
                predicate: 1
            },
            name: "predicate"
        },
        {
            key: {
                object: 1
            },
            name: "object"
        }
    ]);
}

(async (/* async-iife */) => {

    const
        // mongod --port 27017 --dbpath .\test\data\mongodb
        client = await MongoClient.connect(graph.value, { useUnifiedTopology: true }),
        db = client.db('MongoDBStore'),
        store = new MongoDBStore(graph, db);

    // await _createIndex(db.collection('tripel'));

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