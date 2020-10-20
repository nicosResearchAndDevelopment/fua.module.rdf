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

### Dataset#loadTTL

```typescript
dataset.loadTTL(uri: URI): Promise
```

### Dataset#generateGraph

```typescript
dataset.generateGraph(context?: Object): Map<URI, Object>
```

### Dataset#shaclValidate

```typescript
dataset.shaclValidate(shapeset: Dataset): ValidationReport
```

### [DatasetCoreInterface](https://rdf.js.org/dataset-spec/#dfn-datasetcore)

#### [Dataset#size](https://rdf.js.org/dataset-spec/#dfn-size)

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

### [DatasetInterface](https://rdf.js.org/dataset-spec/#dfn-dataset)

#### [Dataset#addAll](https://rdf.js.org/dataset-spec/#dfn-addall)

#### [Dataset#contains](https://rdf.js.org/dataset-spec/#dfn-contains)

#### [Dataset#deleteMatches](https://rdf.js.org/dataset-spec/#dfn-deletematches)

#### [Dataset#difference](https://rdf.js.org/dataset-spec/#dfn-difference)

#### [Dataset#equals](https://rdf.js.org/dataset-spec/#dfn-equals)

#### [Dataset#every](https://rdf.js.org/dataset-spec/#dfn-every)

#### [Dataset#filter](https://rdf.js.org/dataset-spec/#dfn-filter)

#### [Dataset#forEach](https://rdf.js.org/dataset-spec/#dfn-foreach)

#### [Dataset#import](https://rdf.js.org/dataset-spec/#dfn-import)

#### [Dataset#map](https://rdf.js.org/dataset-spec/#dfn-map)

#### [Dataset#reduce](https://rdf.js.org/dataset-spec/#dfn-reduce)

#### [Dataset#some](https://rdf.js.org/dataset-spec/#dfn-some)

#### [Dataset#toArray](https://rdf.js.org/dataset-spec/#dfn-toarray)

#### [Dataset#toCanonical](https://rdf.js.org/dataset-spec/#dfn-tocanonical)

#### [Dataset#toStream](https://rdf.js.org/dataset-spec/#dfn-tostream)

#### [Dataset#toString](https://rdf.js.org/dataset-spec/#dfn-tostring)

#### [Dataset#union](https://rdf.js.org/dataset-spec/#dfn-union)

### [DatasetFactoryInterface](https://rdf.js.org/dataset-spec/#dom-datasetfactory)

#### [Dataset.dataset](https://rdf.js.org/dataset-spec/#dom-datasetfactory-dataset)

### [DataFactoryInterface](https://rdf.js.org/data-model-spec/#dfn-datafactory)

#### [Dataset.namedNode](https://rdf.js.org/data-model-spec/#dfn-namednode)

#### [Dataset.blankNode](https://rdf.js.org/data-model-spec/#dfn-blanknode)

#### [Dataset.literal](https://rdf.js.org/data-model-spec/#dfn-literal)

#### [Dataset.variable](https://rdf.js.org/data-model-spec/#dfn-variable)

#### [Dataset.defaultGraph](https://rdf.js.org/data-model-spec/#dfn-defaultgraph)

#### [Dataset.quad](https://rdf.js.org/data-model-spec/#dfn-quad-0)

#### [Dataset.fromTerm](https://rdf.js.org/data-model-spec/#dfn-fromterm)

#### [Dataset.fromQuad](https://rdf.js.org/data-model-spec/#dfn-fromquad)
