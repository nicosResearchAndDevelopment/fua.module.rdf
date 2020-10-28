const
    { join: joinPath } = require('path'),
    { Namespace } = require('rdflib'),
    jsonld = require('jsonld'),
    context = require('./data/context.json'),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    // 1. load the ontology as dataset

    const
        imPath = `C:\\Users\\spetrac\\Projects\\IDSA.InformationModel`,
        // filePath = joinPath(imPath, 'model/infrastructure/Connector.ttl'),
        filePath = joinPath(imPath, 'docs/serializations/ontology.ttl'),
        // filePath = joinPath(imPath, 'docs/serializations/ontology-nobr.ttl'),
        dataset = new Dataset(),
        IDS = Namespace('https://w3id.org/idsa/core/');

    await dataset.loadTTL(filePath);
    console.log(dataset.match(IDS('Connector')));
    debugger;

    // 2. load the dataset into a jsonld graph

    const
        rdfDoc = dataset.toString(),
        ldArr = await jsonld.fromRDF(rdfDoc, { 'format': 'application/nquads' }),
        compactArr = await Promise.all(ldArr.map(obj => jsonld.compact(obj, context)));

    console.log(compactArr);
    debugger;

    // 3. mesh all objects in the jsonld graph 

    const
        compactMap = new Map(compactArr.map(obj => [obj['@id'], obj])),
        getValue = (obj) => obj && typeof obj === 'object' && compactMap.has(obj['@id'])
            ? compactMap.get(obj['@id']) : obj,
        result = {
            '@context': context,
            '@graph': compactArr.map((obj) => {
                delete obj['@context'];
                for (let [key, value] of Object.entries(obj)) {
                    obj[key] = Array.isArray(value)
                        ? value.map(getValue)
                        : getValue(value);
                }
                return obj;
            })
        };

    console.log(result);
    debugger;

})(/* async-iife */).catch(console.error);