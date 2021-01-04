const
    RedisStore = require('../src/module.rdf.RedisStore.js'),
    { namedNode, quad, literal, Namespace } = require('rdflib'),
    redis = require('redis'),
    TEST = Namespace('http://example.com/'),
    XSD = Namespace('http://www.w3.org/2001/XMLSchema#'),
    graph = namedNode('redis://localhost:6379/'),
    { promisify } = require('util');

(async (/* async-iife */) => {

    const
        client = await redis.createClient(),
        store = new RedisStore(graph, client),
        FLUSHALL = promisify(client.FLUSHALL).bind(client);

    await FLUSHALL();

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