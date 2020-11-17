# Module.RDF

<!-- TODO: write the second half of the Dataset specification -->
<!-- TODO: what about https://rdf.js.org/dataset-spec/#issue-container-generatedID-0 ? -->

```typescript
{ Dataset } = require('fua.module.rdf')
```

## [Dataset](https://rdf.js.org/dataset-spec/)

### Dataset#constructor

```typescript
dataset = new Dataset(quads?: Quad): Dataset
```

### Dataset#importTTL

```typescript
dataset.importTTL(stream: Readable<TTL>): Promise
```

Can be used to import a stream with ttl content.

### Dataset#importJSON

```typescript
dataset.importJSON(stream: Readable<JSONLD>): Promise
```

Can be used to import a stream with json-ld content.

### Dataset#loadTTL

```typescript
dataset.loadTTL(uri: URI): Promise
```

Can be used to load a ttl file from disc or from the web. 

```javascript
await Promise.all(
    dataset.loadTTL('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    dataset.loadTTL('file:///resource/ids-im/ontology.ttl')
)
```

### Dataset#loadJSON

```typescript
dataset.loadJSON(uri: URI): Promise
```

Can be used to load a json-ld file from disc or from the web. 

```javascript
await dataset.loadJSON('http://xmlns.com/foaf/0.1')
```

### Dataset#generateGraph

```typescript
dataset.generateGraph(context?: Object, optns?: {compact?: Boolean, meshed?: Boolean, blanks?: Boolean}): Map<URI, Object>
```

Can be used to generate a map with fully meshed nodes.

__Options__ (_defaults_)

- __compact:__ (_true_) Converts all URIs to their compact form, if an appropriate context is given.
- __meshed:__ (_true_) Enables object traversal. Not suited for serialization.
- __blanks:__ (_false_) Generates IDs for blank nodes and adds them to the result graph.

```javascript
context = {
    dct:    'http://purl.org/dc/terms/',
    fno:    'https://w3id.org/function/ontology#',
    foaf:   'http://xmlns.com/foaf/0.1/',
    ids:    'https://w3id.org/idsa/core/',
    idsa:   'https://www.internationaldataspaces.org',
    idsm:   'https://w3id.org/idsa/metamodel/',
    org:    'http://www.w3.org/ns/org#',
    owl:    'http://www.w3.org/2002/07/owl#',
    rdf:    'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:   'http://www.w3.org/2000/01/rdf-schema#',
    time:   'http://www.w3.org/2006/time#',
    vann:   'http://purl.org/vocab/vann/',
    voaf:   'http://purl.org/vocommons/voaf#',
    xsd:    'http://www.w3.org/2001/XMLSchema#'
}
graph = dataset.generateGraph(context)
console.log(graph.get('ids:Connector'))
```

```javascript
str = JSON.stringify({
    '@context': context,
    '@graph': [...dataset
        .generateGraph(context, { meshed: false, blanks: true })
        .values()
    ]
})
```

### Dataset#shaclValidate

```typescript
dataset.shaclValidate(shapeset: Dataset): ValidationReport
```

Can be used to validate this dataset, if the given dataset contains shacl shapes.

```javascript
shapeset = new Dataset()
shapeset.loadTTL('file:///resource/ids-im/validation/shapes.ttl')
report = dataset.shaclValidate(shapeset)
console.log(report.conforms, report.results)
```

### [DatasetCoreInterface](https://rdf.js.org/dataset-spec/#dfn-datasetcore)

#### [Dataset#size](https://rdf.js.org/dataset-spec/#dfn-size)

```typescript
dataset.size: Number
```

#### [Dataset#add](https://rdf.js.org/dataset-spec/#dfn-add)

```typescript
dataset.add(quad: Quad): Dataset
```

Adds the specified [quad](https://rdf.js.org/data-model-spec/#quad-interface) to the dataset.

This method returns the dataset instance it was called on.

Existing quads, as defined in [Quad.equals](https://rdf.js.org/data-model-spec/#dfn-equals), will be ignored.

#### [Dataset#delete](https://rdf.js.org/dataset-spec/#dfn-delete)

```typescript
dataset.delete(quad: Quad): Dataset
```

Removes the specified [quad](https://rdf.js.org/data-model-spec/#quad-interface) from the dataset.

This method returns the dataset instance it was called on.

#### [Dataset#has](https://rdf.js.org/dataset-spec/#dfn-has)

```typescript
dataset.has(quad: Quad): boolean
```

Determines whether a dataset includes a certain quad, returning true or false as appropriate.

#### [Dataset#match](https://rdf.js.org/dataset-spec/#dfn-match)

```typescript
dataset.match(subject? Term, predicate? Term, object? Term, graph? Term): Dataset
```

This method returns a new dataset that is comprised of all quads in the current instance matching the given arguments. The logic described in [Quad Matching](https://rdf.js.org/dataset-spec/#quad-matching) is applied for each quad in this dataset to check if it should be included in the output dataset.

Note: This method always returns a new [DatasetCore](https://rdf.js.org/dataset-spec/#dfn-datasetcore), even if that dataset contains no quads.

Note: Since a [DatasetCore](https://rdf.js.org/dataset-spec/#dfn-datasetcore) is an unordered set, the order of the quads within the returned sequence is arbitrary.

#### Dataset#[Symbol.iterator]

```typescript
dataset[Symbol.iterator](): Iterable<Quad>
```

```javascript
for(let quad of dataset) {
    console.log(quad)
}
```

### [DatasetInterface](https://rdf.js.org/dataset-spec/#dfn-dataset)

#### [Dataset#addAll](https://rdf.js.org/dataset-spec/#dfn-addall)

```typescript
dataset.addAll(quads: Quad[]): Dataset
```

#### [Dataset#contains](https://rdf.js.org/dataset-spec/#dfn-contains)

```typescript
dataset.contains(dataset: Dataset): Boolean
```

#### [Dataset#deleteMatches](https://rdf.js.org/dataset-spec/#dfn-deletematches)

```typescript
dataset.deleteMatches(subject?: Term, predicate?: Term, object?: Term, graph?: Term): Dataset
```

#### [Dataset#difference](https://rdf.js.org/dataset-spec/#dfn-difference)

```typescript
dataset.difference(dataset: Dataset): Dataset
```

#### [Dataset#equals](https://rdf.js.org/dataset-spec/#dfn-equals)

```typescript
dataset.equals(dataset: Dataset): Boolean
```

#### [Dataset#every](https://rdf.js.org/dataset-spec/#dfn-every)

```typescript
dataset.equals(iteratee: (quad: Quad, dataset: Dataset) => Boolean): Boolean
```

#### [Dataset#filter](https://rdf.js.org/dataset-spec/#dfn-filter)

```typescript
dataset.filter(iteratee: (quad: Quad, dataset: Dataset) => Boolean): Dataset
```

#### [Dataset#forEach](https://rdf.js.org/dataset-spec/#dfn-foreach)

```typescript
dataset.forEach(iteratee: (quad: Quad, dataset: Dataset) => *): Dataset
```

#### [Dataset#import](https://rdf.js.org/dataset-spec/#dfn-import)

```typescript
dataset.import(stream: Readable<Quad>): Promise
```

#### [Dataset#map](https://rdf.js.org/dataset-spec/#dfn-map)

```typescript
dataset.map(iteratee: (quad: Quad, dataset: Dataset) => Quad): Dataset
```

#### [Dataset#reduce](https://rdf.js.org/dataset-spec/#dfn-reduce)

```typescript
dataset.reduce(iteratee: (acc: *, quad: Quad, dataset: Dataset) => *, initialValue?: *): *
```

#### [Dataset#some](https://rdf.js.org/dataset-spec/#dfn-some)

```typescript
dataset.some(iteratee: (quad: Quad, dataset: Dataset) => Boolean): Boolean
```

#### [Dataset#toArray](https://rdf.js.org/dataset-spec/#dfn-toarray)

```typescript
dataset.toArray(): Quad[]
```

#### [Dataset#toCanonical](https://rdf.js.org/dataset-spec/#dfn-tocanonical)

```typescript
// curently not implemented
```

#### [Dataset#toStream](https://rdf.js.org/dataset-spec/#dfn-tostream)

```typescript
dataset.toStream(): Readable<Quad>
```

#### [Dataset#toString](https://rdf.js.org/dataset-spec/#dfn-tostring)

```typescript
dataset.toString(): String
```

#### [Dataset#union](https://rdf.js.org/dataset-spec/#dfn-union)

```typescript
dataset.union(dataset: Dataset): Dataset
```

### [DatasetFactoryInterface](https://rdf.js.org/dataset-spec/#dom-datasetfactory)

#### [Dataset.dataset](https://rdf.js.org/dataset-spec/#dom-datasetfactory-dataset)

```typescript
Dataset.dataset(quads: Dataset | Quad[] | Iterable<Quad>): Dataset
```

### [DataFactoryInterface](https://rdf.js.org/data-model-spec/#dfn-datafactory)

#### [Dataset.namedNode](https://rdf.js.org/data-model-spec/#dfn-namednode)

```typescript
Dataset.namedNode(iri: URI): NamedNode
```

#### [Dataset.blankNode](https://rdf.js.org/data-model-spec/#dfn-blanknode)

```typescript
Dataset.blankNode(id?: String): BlankNode
```

#### [Dataset.literal](https://rdf.js.org/data-model-spec/#dfn-literal)

```typescript
Dataset.literal(value: String, langOrDatatype?: String | NamedNode): Literal
```

#### [Dataset.variable](https://rdf.js.org/data-model-spec/#dfn-variable)

```typescript
Dataset.variable(name?: String): Variable
```

#### [Dataset.defaultGraph](https://rdf.js.org/data-model-spec/#dfn-defaultgraph)

```typescript
Dataset.defaultGraph(): DefaultGraph
```

#### [Dataset.quad](https://rdf.js.org/data-model-spec/#dfn-quad-0)

```typescript
Dataset.quad(subject: Term, predicate: Term, object: Term, graph?: Term): Quad
```

#### [Dataset.fromTerm](https://rdf.js.org/data-model-spec/#dfn-fromterm)

```typescript
Dataset.fromTerm(original: Term): Term
```

#### [Dataset.fromQuad](https://rdf.js.org/data-model-spec/#dfn-fromquad)

```typescript
Dataset.fromQuad(original: Quad): Quad
```
