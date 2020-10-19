// const
//     { promisify } = require('util'),
//     stream = require('stream'),
//     { Readable, Writable } = stream,
//     pipeline = promisify(stream.pipeline),
//     { fileURLToPath, pathToFileURL } = require('url'),
//     { join: joinPath } = require('path'),
//     { createReadStream } = fs = require('fs'),
//     readFile = promisify(fs.readFile),
//     rdfExt = require('rdf-ext'),
//     ParserN3 = require('@rdfjs/parser-n3'),
//     SHACLValidator = require('rdf-validate-shacl'),
//     rdfLib = require('rdflib'),
//     jsonld = require('jsonld'),
//     N3 = require('n3'),
//     fetch = require('node-fetch');

exports.Dataset = require('./module.rdf.Dataset.js');
Object.freeze(exports);