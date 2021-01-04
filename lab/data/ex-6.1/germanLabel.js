function validateGermanLabel($this) {
    var results = [];
    var p = TermFactory.namedNode("http://example.org/ns#germanLabel");
    var s = $data.find($this, p, null);
    for(var t = s.next(); t; t = s.next()) {
        var object = t.object;
        if(!object.isLiteral() || !object.language.startsWith("de")) {
            results.push({
                value : object
            });
        }
    }
    return results;
}

exports.validateGermanLabel = validateGermanLabel;