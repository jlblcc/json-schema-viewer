/*
 * Provides support for asynchronous fetching of schemas using jQuery.
 *
 * @callback requestCallback
 * @param {string[]} schemas Output from tv4.getSchemaMap()
 *
 * @param {string[]} [uri=tv4.getMissingUris()] - An array of schema uris. If not
 * an array, then load any missing URIs.
 * @param {requestCallback} callback - The output of tv4.getSchemaMap() is
 * passed to the callback when all requests are completed. XHR failure will
 * result in an empty schema.
 * @param {string} uriPrefix A string to prepend to the schema URIs
 */
if ( typeof (tv4.asyncLoad) === 'undefined') {
    tv4.asyncLoad = function(uri, callback, uriPrefix) {
        var missing = (uri instanceof Array) ? uri : tv4.getMissingUris(),
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
                var result = tv4.asyncLoad(false, callback, uriPrefix);
            });
        }
    };
}
