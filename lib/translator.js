(function($) {

    var initTranslator = function() {
        var opts = {
            readAsDefault: 'Text',
            on: {
                load: function(e, file) {
                    var data = e.currentTarget.result;

                    try {
                        $.parseJSON(data);
                        //console.info(data);
                        $('#textarea-translator').val(data);
                    } catch(err) {
                        //JSV.showError('Unable to parse JSON: <br/>' + e);
                        JSV.showError('Failed to load ' + file.name + '. The file is not valid JSON. <br/>The error: <i>' + err + '</i>');
                    }

                },
                error: function(e, file) {
                    var msg = 'Failed to load ' + file.name + '. ' + e.currentTarget.error.message;

                    JSV.showError(msg);
                }
            }
        };

        $('#file-upload-translator, #textarea-translator').fileReaderJS(opts);

        $('#button-translate').click(function() {
            var formData = $('#translation-form').serializeArray();
            formData.push({
                name: 'format',
                'value': 'json'
            });
            var URL = $('#translation-form').attr('action');
            $.post(URL, formData, function(data, textStatus, jqXHR) {
                //data: Data from server.
                console.info(arguments);
                JSV.createPre($('#translation-results'), data);
            }, 'json');
        });
    };

    JSV.init({
        schema: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'schemas/schema/schema.json'
    }, function() {
        JSV.setVersion(tv4.getSchema(JSV.treeData.schema).version);
        initTranslator();
    });

})(jQuery);
