const
    redis = require('redis'),
    { Namespace } = require('rdflib'),
    Dataset = require('../src/module.rdf.Dataset.js'),
    RedisStore = require('../src/module.rdf.RedisStore.js');

(async () => {

    const
        client = redis.createClient(),
        store = new RedisStore(client),
        dataset = new Dataset(),
        context = {
            rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
            owl: 'http://www.w3.org/2002/07/owl#',
            dc: 'http://purl.org/dc/elements/1.1/'
        },
        RDF = Namespace(context.rdf);

    // await new Promise((resolve, reject) => client.FLUSHALL((err, result) => err ? reject(err) : resolve(result)));

    client.on('error', console.error);
    await dataset.loadTTL("https://www.w3.org/1999/02/22-rdf-syntax-ns");
    await store.import(dataset);
    const resultSet = await store.export([
        RDF('type'), RDF('JSON')
    ]);

    console.log(resultSet.generateGraph(context));
    debugger;

})().catch(console.error);