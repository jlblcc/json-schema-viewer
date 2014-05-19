// Provides support for asynchronous validation (fetching schemas) using jQuery
// Callback is optional third argument to tv4.validate() - if not present,
// synchronous operation
//     callback(result, error);
if ( typeof (tv4.addAllAsync) === 'undefined') {
    tv4.addAllAsync = function(uri, callback, uriPrefix) {
        var missing = uri ? [uri] : tv4.getMissingUris(),
            pref = uriPrefix || '';

        if (!missing.length && !uri) {
            if(callback) {
                callback(tv4.getSchemaMap());
            } else {
                return true;
            }
        } else {
            // Make a request for each missing schema
            var missingSchemas = $.map(missing, function(schemaUri) {
                return $.getJSON(pref + schemaUri).done(function(fetchedSchema) {
                    tv4.addSchema(schemaUri, fetchedSchema);
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    // If there's an error, just use an empty schema
                    tv4.addSchema(schemaUri, {});
                });
            });
            // When all requests done, try again
            $.when.apply($, missingSchemas).done(function() {
                var result = tv4.addAllAsync(false, callback, uriPrefix);
            });
        }
    };
}
