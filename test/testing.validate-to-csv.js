const
    { join: joinPath } = require('path'),
    { pathToFileURL } = require('url'),
    { Namespace } = require('rdflib'),
    context = require('./data/context.json'),
    SH = Namespace(context.sh),
    RDF = Namespace(context.rdf),
    Dataset = require('../src/module.rdf.Dataset.js');

(async (/* async-iife */) => {

    const
        shapesURI = pathToFileURL(joinPath(__dirname, 'data/my-shapes.ttl')).toString(),
        dataURI = pathToFileURL(joinPath(__dirname, 'data/my-data.ttl')).toString(),
        shapesSet = new Dataset(),
        dataSet = new Dataset();

    await Promise.all([
        shapesSet.loadTTL(shapesURI),
        dataSet.loadTTL(dataURI)
    ]);

    const
        report = dataSet.shaclValidate(shapesSet),
        results = report.dataset.getSubjects(RDF('type'), SH('ValidationResult')),
        header = [
            'resultSeverity',
            'focusNode',
            'resultMessage',
            'resultPath',
            'value',
            'sourceConstraint',
            'sourceConstraintComponent',
            'sourceShape'
        ],
        rows = results.map((validationResult) => {
            const entries = [];
            for(let field of header) {
                const values = report.dataset.getObjects(
                    validationResult,
                    SH(field)
                );
                entries.push(values.map(value => value.id || value.toString()).join(','));
            }
            return entries.join(';');
        }),
        csv_ld = {
            '@context': {
                '@extension': 'http://www.w3.org/ns/csv-ld',
                'sh': context.sh
            },
            ...Object.fromEntries(header.map(field => [`sh:${field}`, `{${field}}`]))
        },
        csv = header.join(';') + '\n' + rows.join('\n');

    // https://www.w3.org/2013/csvw/wiki/CSV-LD
    console.log('CSV-LD:', csv_ld);
    console.log(csv);
    debugger;

})(/* async-iife */).catch(console.error);