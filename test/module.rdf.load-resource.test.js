const
  { describe, test } = require('mocha'),
  expect = require('expect'),
  { join: joinPath } = require('path'),
  { DataFactory } = require('@fua/module.persistence'),
  context = require('./data/context.json'),
  factory = new DataFactory(context),
  { loadDataFiles } = require('../src/rdf.js');

describe('module.rdf : loadDataFiles', function () {

  // test('@fua/resource.ontology.core', async function () {
  //   const dataFiles = await loadDataFiles(require('@fua/resource.ontology.core'), factory);
  //   expect(dataFiles.length).toBeGreaterThan(0);
  //   const datasets = dataFiles.map(file => file.dataset).filter(val => val);
  //   expect(datasets.length).toBeGreaterThan(0);
  // });

  // test('@fua/resource.ontology/ldp', async function () {
  //     const dataFiles = await loadDataFiles(require('@fua/resource.ontology.data/ldp'), factory);
  //     expect(dataFiles.length).toBeGreaterThan(0);
  //     const datasets = dataFiles.map(file => file.dataset).filter(val => val);
  //     expect(datasets.length).toBeGreaterThan(0);
  // });
  //
  // test('@fua/resource.ontology/odrl', async function () {
  //     const dataFiles = await loadDataFiles(require('@fua/resource.ontology.secure/odrl'), factory);
  //     expect(dataFiles.length).toBeGreaterThan(0);
  //     const datasets = dataFiles.map(file => file.dataset).filter(val => val);
  //     expect(datasets.length).toBeGreaterThan(0);
  // });

});
