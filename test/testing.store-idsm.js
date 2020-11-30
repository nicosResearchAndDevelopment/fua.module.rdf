const
    { join: joinPath } = require('path'),
    Neo4jStore = require('../src/module.rdf.Neo4jStore.js'),
    Dataset = require('../src/module.rdf.Dataset.js'),
    graph = Dataset.namedNode('bolt://localhost:7687/'),
    neo4j = require('neo4j-driver'),
    driver = neo4j.driver(graph.value, neo4j.auth.basic('neo4j', 'idsa')),
    store = new Neo4jStore(graph, driver),
    imPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
    filePath = joinPath(imPath, 'docs/serializations/ontology.ttl'),
    dataset = new Dataset(),
    in_parallel = false;

(async (/* async-iife */) => {

    await dataset.loadTTL(`file://${filePath}`);
    console.log('dataset-size:', dataset.size);

    store.on('created', quad => console.log('created: ' + quad.toString()));
    store.on('deleted', quad => console.log('deleted: ' + quad.toString()));

    if(in_parallel) {
        console.time('store in parallel');
        await Promise.all(
            Array.from(dataset).map(quad => store.add(quad))
        );
        console.timeEnd('store in parallel');
    } else {
        console.time('store in series');
        for(let quad of dataset) {
            await store.add(quad);
        }
        console.timeEnd('store in series');
    }

    console.log('store-size:', await store.size());
    debugger;

})(/* async-iife */).catch(console.error);