const
    {describe, test} = require('mocha'),
    expect           = require('expect'),
    {join: joinPath} = require('path'),
    {DataFactory}    = require('@nrd/fua.module.persistence'),
    context          = require('./data/context.json'),
    factory          = new DataFactory(context),
    {loadDataFiles}  = require('../src/module.rdf.js');

describe('module.rdf : loadDataFiles', function () {

    test('@nrd/fua.resource.ontology', async function () {
        const dataFiles = await loadDataFiles(require('@nrd/fua.resource.ontology'), factory);
        expect(dataFiles.length).toBeGreaterThan(0);
        const datasets = dataFiles.map(file => file.dataset).filter(val => val);
        expect(datasets.length).toBeGreaterThan(0);
    });

    test('@nrd/fua.resource.ontology/ldp', async function () {
        const dataFiles = await loadDataFiles(require('@nrd/fua.resource.ontology/ldp'), factory);
        expect(dataFiles.length).toBeGreaterThan(0);
        const datasets = dataFiles.map(file => file.dataset).filter(val => val);
        expect(datasets.length).toBeGreaterThan(0);
    });

    test('@nrd/fua.resource.ontology/odrl', async function () {
        const dataFiles = await loadDataFiles(require('@nrd/fua.resource.ontology/odrl'), factory);
        expect(dataFiles.length).toBeGreaterThan(0);
        const datasets = dataFiles.map(file => file.dataset).filter(val => val);
        expect(datasets.length).toBeGreaterThan(0);
    });

});
