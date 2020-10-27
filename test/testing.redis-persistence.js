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

    client.on('error', console.error);
    await dataset.loadTTL("https://www.w3.org/1999/02/22-rdf-syntax-ns");
    // await store.import(dataset);

    const type = Dataset.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

    // console.log(dataset.toString());
    console.log(dataset.match(type, type).toString());
    client.hget(type.toString(), type.toString(), (err, result) => console.log(result));

    debugger;

})().catch(console.error);