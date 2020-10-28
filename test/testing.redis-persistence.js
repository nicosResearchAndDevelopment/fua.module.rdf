const
    redis = require('redis'),
    { join: joinPath } = require('path'),
    { pathToFileURL } = require('url'),
    { Namespace } = require('rdflib'),
    context = require('./data/context.json'),
    Dataset = require('../src/module.rdf.Dataset.js'),
    RedisStore = require('../src/module.rdf.RedisStore.js');

(async () => {

    const
        client = redis.createClient(),
        store = new RedisStore(client),
        dataset = new Dataset(),
        idsImPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
        RDFS = Namespace(context.rdfs),
        OWL = Namespace(context.owl),
        IDS = Namespace(context.ids);

    if(/* IMPORT*/ false) {
        await new Promise((resolve, reject) => client.FLUSHALL((err, result) => err ? reject(err) : resolve(result)));

        await Promise.all([
            dataset.loadTTL(context.rdf),
            dataset.loadTTL(context.rdfs),
            dataset.loadTTL(context.owl),
            // dataset.loadTTL(pathToFileURL(joinPath(idsImPath, 'model/infrastructure/Connector.ttl'))),
            dataset.loadTTL(pathToFileURL(joinPath(idsImPath, 'docs/serializations/ontology.ttl'))),
        ]);

        await store.import(dataset);
    }

    if(/* EXPORT */ true) {
        const resultSet = await store.export([
            RDFS('Resource'), RDFS('Class'),
            OWL('Class'), OWL('NamedIndividual'),
            IDS('Connector'),
        ])

        const resultGraph = resultSet.generateGraph(context)
        console.log(resultGraph.get('ids:Connector'))
    }

    debugger;

})().catch(console.error);