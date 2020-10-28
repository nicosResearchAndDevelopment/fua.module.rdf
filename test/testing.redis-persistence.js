const
    redis = require('redis'),
    { Namespace } = require('rdflib'),
    Dataset = require('../src/module.rdf.Dataset.js'),
    RedisStore = require('../src/module.rdf.RedisStore.js');

(async () => {

    const
        client = redis.createClient(),
        store = new RedisStore(client),
        dataset = new Dataset();

    // await new Promise((resolve, reject) => client.FLUSHALL((err, result) => err ? reject(err) : resolve(result)));

    client.on('error', console.error);
    await dataset.loadTTL("https://www.w3.org/1999/02/22-rdf-syntax-ns");
    await store.import(dataset);
    const type = Dataset.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    console.log(await store.export(type));

    debugger;

})().catch(console.error);