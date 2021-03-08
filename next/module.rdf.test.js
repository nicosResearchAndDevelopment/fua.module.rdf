const
    {describe, test}   = require('mocha'),
    expect             = require('expect'),
    {join: joinPath}   = require('path'),
    {createReadStream} = require('fs'),
    {TermFactory}      = require('@nrd/fua.module.persistence'),
    factory            = new TermFactory(),
    rdf                = require('../next/module.rdf.js');

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

describe.only('module.rdf', function () {

    test('wrapFactory');

    test('parseStream', async function () {
        const
            textStream = createReadStream(joinPath(__dirname, '../lab/data/my-data.ttl')),
            quadStream = rdf.parseStream(textStream, 'text/turtle', factory);
        await expect(quadStream).toBeQuadStream();
    });

    test('serializeStream');

    test('transformStream');

});