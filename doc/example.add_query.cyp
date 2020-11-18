// NS = rdfs:
//MERGE (_context:Context {})
//  ON CREATE SET
//  _context.rdfs = "http://www.w3.org/2000/01/rdf-schema#"
//WITH _subject

MERGE (_subject:IRI {uri: 'https://wall-e.nicos-rd.com/'})
  ON CREATE SET
  _subject.uri = 'https://wall-e.nicos-rd.com/',
  `$ts` = 321412341234123.6444,
  `$prov:primarySource` = 'ich'
//ON MATCH SET
WITH _subject
MERGE (_object:Literal {
  datatype:              'xsd:string',
  language:              'de',
  lex:                   'Mahlzeit',
  `$ts`:                 321412341234123.6444,
  `$prov:primarySource`: 'ich',
//
  `_datatype`:           'xsd:decimal',
  `_lex`:                '0.42',
  `$nat`:                0.42,
//
  `_datatype`:           'xsd:dateTimeStamp',
  `_lex`:                '2008-12-31T12:00:00+02:00',
  `$nat`:                312532543425.2345
})

WITH _subject, _object
MERGE (_subject)-[r:`http://www.w3.org/2000/01/rdf-schema#label` {`$prov:generatedAtTime`: 123412431234.555}]->(_object)
