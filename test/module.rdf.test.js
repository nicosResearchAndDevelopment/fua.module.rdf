const
    {describe, test}       = require('mocha'),
    expect                 = require('expect'),
    {join: joinPath}       = require('path'),
    {createReadStream}     = require('fs'),
    resourcePath           = process.env.FUA_RESOURCES,
    {TermFactory, Dataset} = require('@nrd/fua.module.persistence'),
    context                = require('./context.json'),
    factory                = new TermFactory(context),
    rdf                    = require('../src/module.rdf.js'),
    loadScripts            = {
        'test.universe': joinPath(resourcePath, 'resource.universe/script/test.universe.next.js'),
        'test.jott':     joinPath(resourcePath, 'resource.universe/script/test.jott.next.js')
    };

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

    test('transformStream');

    for (let [scriptName, scriptPath] of Object.entries(loadScripts)) {
        test('loadDataFiles : ' + scriptName, async function () {
            const
                /** @type {Array<{}>} */
                results = await rdf.loadDataFiles({
                    'dct:identifier': scriptPath,
                    'dct:format':     'application/fua.load+js'
                }, factory);

            expect(Array.isArray(results)).toBeTruthy();
            expect(results.every(entry => entry && typeof entry === 'object')).toBeTruthy();

            for (let entry of results) {
                expect(typeof entry.identifier).toBe('string');
                expect(typeof entry.format).toBe('string');
                expect(typeof entry.title).toBe('string');
                expect(typeof entry.alternative).toBe('string');
                expect(Array.isArray(entry.requires)).toBeTruthy();
                expect(entry.requires.every(required => typeof required === 'string')).toBeTruthy();
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
    }

})
;