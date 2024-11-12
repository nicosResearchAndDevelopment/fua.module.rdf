const
    {inspect}              = require('util'),
    logDeep                = (obj) => console.log(inspect(obj, {depth: Infinity})),
    {describe, test}       = require('mocha'),
    expect                 = require('expect'),
    {join: joinPath}       = require('path'),
    {createReadStream}     = require('fs'),
    {TermFactory, Dataset} = require('@nrd/fua.module.persistence'),
    context                = require('./data/context.json'),
    factory                = new TermFactory(context),
    rdf                    = require('../src/rdf.js');

expect.extend({
    async toBeQuadStream(received, minQuads = 1, maxQuads = Infinity) {
        if (!received || !received.on)
            return {
                pass:    false,
                message: () => `expected a stream`
            };
        if (!received.readableObjectMode)
            return {
                pass:    false,
                message: () => `expected stream in object mode`
            };

        const quads = [];
        await new Promise((resolve, reject) => {
            received
                .on('data', quad => quads.push(quad))
                .on('error', reject)
                .on('end', resolve);
        });

        if (!quads.every(factory.isQuad))
            return {
                pass:    false,
                message: () => `expected stream to only contain quads`
            };
        if (quads.length < minQuads)
            return {
                pass:    false,
                message: () => `expected at least ${minQuads} quad${minQuads > 1 ? 's' : ''}`
            };
        if (quads.length > maxQuads)
            return {
                pass:    false,
                message: () => `expected at maximum ${maxQuads} quad${maxQuads > 1 ? 's' : ''}`
            };
        else
            return {
                pass:    true,
                message: () => `expected stream to not only contain quads`
            };
    }
});

describe('module.rdf', function () {

    test('contentTypes', function () {
        expect(Array.isArray(rdf.contentTypes)).toBeTruthy();
        expect(rdf.contentTypes.every(contentType => typeof contentType === 'string')).toBeTruthy();
        expect(rdf.contentTypes.includes('text/turtle')).toBeTruthy();
    });

    test('wrapFactory');

    test('parseStream', async function () {
        const
            textStream = createReadStream(joinPath(__dirname, '../lab/data/my-data.ttl')),
            quadStream = rdf.parseStream(textStream, 'text/turtle', factory);
        await expect(quadStream).toBeQuadStream();
    });

    test('serializeStream');

    test('serializeDataset to text/turtle', async function () {
        const
            /** @type {Array<{}>} */
            dataFiles  = await rdf.loadDataFiles([{
                'dct:identifier': joinPath(__dirname, 'data/my-data.ttl'),
                'dct:format':     'text/turtle',
                'dct:title':      'my-data'
            }], factory),
            datasets   = Object.fromEntries(dataFiles.map(entry => [entry.title, entry.dataset])),
            textTurtle = await rdf.serializeDataset(datasets['my-data'], 'text/turtle');

        expect(typeof textTurtle).toBe('string');
        expect(textTurtle).toMatch('@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>');
    });

    test('serializeDataset to application/ld+json', async function () {
        const
            /** @type {Array<{}>} */
            dataFiles = await rdf.loadDataFiles([{
                'dct:identifier': joinPath(__dirname, 'data/my-data.ttl'),
                'dct:format':     'text/turtle',
                'dct:title':      'my-data'
            }], factory),
            datasets  = Object.fromEntries(dataFiles.map(entry => [entry.title, entry.dataset])),
            textJSON  = await rdf.serializeDataset(datasets['my-data'], 'application/ld+json');

        expect(typeof textJSON).toBe('string');
        let json;
        expect(() => (json = JSON.parse(textJSON))).not.toThrow();
        expect(json['@context']).toMatchObject({
            rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
            owl:  'http://www.w3.org/2002/07/owl#'
        });
        expect(Array.isArray(json['@graph'])).toBeTruthy();
    });

    test('transformStream');

    test('generateGraph', async function () {
        const
            /** @type {Array<{}>} */
            dataFiles = await rdf.loadDataFiles([{
                'dct:identifier': joinPath(__dirname, 'data/my-data.ttl'),
                'dct:format':     'text/turtle',
                'dct:title':      'my-data'
            }], factory),
            datasets  = Object.fromEntries(dataFiles.map(entry => [entry.title, entry.dataset])),
            graph     = rdf.generateGraph(datasets['my-data'], 'default');

        expect(graph).toBeInstanceOf(Map);
        expect(graph.size).toBeGreaterThan(0);

        //logDeep(graph.toArray());
    });

    test('loadDataFiles', async function () {
        const
            /** @type {Array<{}>} */
            results = await rdf.loadDataFiles({
                'dct:identifier': joinPath(__dirname, 'data/load.json'),
                'dct:format':     'application/fua.load+json'
            }, factory);

        expect(Array.isArray(results)).toBeTruthy();
        expect(results.every(entry => entry && typeof entry === 'object')).toBeTruthy();
        console.log(results);

        for (let entry of results) {
            expect(typeof entry.identifier).toBe('string');
            expect(typeof entry.format).toBe('string');
            expect(typeof entry.title).toBe('string');
            expect(typeof entry.alternative).toBe('string');
            expect(Array.isArray(entry.requires)).toBeTruthy();
            for (let required of entry.requires) {
                expect(typeof required).toBe('string');
            }
            if (rdf.contentTypes.includes(entry.format)) {
                expect(entry.dataset).toBeInstanceOf(Dataset);
            }
        }

        let
            combined     = new Dataset(null, factory),
            summedUpSize = 0;

        for (let entry of results) {
            if (entry.dataset) {
                combined.add(entry.dataset);
                summedUpSize += entry.dataset.size;
            }
        }

        expect(combined).toBeInstanceOf(Dataset);
        expect(combined.size).toBeGreaterThan(0);
        expect(combined.size).toBeLessThanOrEqual(summedUpSize);
    });

    test('shaclValidate', async function () {
        const
            /** @type {Array<{}>} */
            dataFiles   = await rdf.loadDataFiles([
                {
                    'dct:identifier': joinPath(__dirname, 'data/my-data.ttl'),
                    'dct:format':     'text/turtle',
                    'dct:title':      'my-data'
                },
                {
                    'dct:identifier': joinPath(__dirname, 'data/my-shapes.ttl'),
                    'dct:format':     'text/turtle',
                    'dct:title':      'my-shapes'
                }
            ], factory),
            datasets    = Object.fromEntries(dataFiles.map(entry => [entry.title, entry.dataset])),
            shaclReport = await rdf.shaclValidate(datasets['my-data'], datasets['my-shapes']);

        expect(typeof shaclReport.conforms).toBe('boolean');
        expect(shaclReport.dataset).toBeInstanceOf(Dataset);
        expect(shaclReport.dataset.factory).toBe(datasets['my-data'].factory);
        //console.log(await rdf.serializeDataset(shaclReport, 'text/turtle'));
        //debugger;
    });
});
