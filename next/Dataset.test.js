const
    {describe, test} = require('mocha'),
    expect           = require('expect'),
    {join: joinPath} = require('path'),
    Dataset          = require('./module.rdf.Dataset.js'),
    __data           = joinPath(__dirname, '../lab/data');

describe.only('module.rdf.Dataset', function () {

    test('loadTTL from local file', async function () {
        const data = new Dataset();
        await data.loadTTL('file://' + joinPath(__data, 'my-data.ttl'));
        expect(data.has(
            data.factory.namedNode('http://example.org/stuff/1.0/Hello'),
            data.factory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            data.factory.namedNode('http://example.org/stuff/1.0/HelloWorld')
        )).toBeTruthy();
    }); // test

    test('generate a graph from ttl data', async function () {
        const data = new Dataset();
        await data.loadTTL('file://' + joinPath(__data, 'my-data.ttl'));
        const graph = data.generateGraph();
        expect(graph).toBeInstanceOf(Map);
        expect(graph.has('http://example.org/stuff/1.0/Hello')).toBeTruthy();
        expect(graph.get('http://example.org/stuff/1.0/Hello')).toMatchObject({
            "@id":   "http://example.org/stuff/1.0/Hello",
            "@type": {"@id": "http://example.org/stuff/1.0/HelloWorld"}
        });
    }); // test

    test('validate against shacl shapes', async function () {
        const data   = new Dataset();
        const shapes = new Dataset();
        await Promise.all([
            data.loadTTL('file://' + joinPath(__data, 'my-data.ttl')),
            shapes.loadTTL('file://' + joinPath(__data, 'my-shapes.ttl'))
        ]);
        const report = await data.shaclValidate(shapes);
        expect(report.conforms).toBeFalsy();
        expect(report.results).toHaveLength(1);
        expect(report.dataset).toBeInstanceOf(Dataset);
    }); // test

}); // describe