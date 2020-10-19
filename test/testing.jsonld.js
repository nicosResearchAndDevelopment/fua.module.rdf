const
    { join: joinPath } = require('path'),
    { Namespace } = require('rdflib'),
    jsonld = require('jsonld'),
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
        context = {
            'dct': "http://purl.org/dc/terms/",
            'fno': "https://w3id.org/function/ontology#",
            'foaf': "http://xmlns.com/foaf/0.1/",
            'ids': "https://w3id.org/idsa/core/",
            'idsa': "https://www.internationaldataspaces.org",
            'idsm': "https://w3id.org/idsa/metamodel/",
            'org': "http://www.w3.org/ns/org#",
            'owl': "http://www.w3.org/2002/07/owl#",
            'rdf': "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            'rdfs': "http://www.w3.org/2000/01/rdf-schema#",
            'time': "http://www.w3.org/2006/time#",
            'vann': "http://purl.org/vocab/vann/",
            'voaf': "http://purl.org/vocommons/voaf#",
            'xsd': "http://www.w3.org/2001/XMLSchema#"
        },
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