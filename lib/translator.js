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

		        /**
         * Create a *pre* block and append it to the passed element.
         *
         * @param {object} el jQuery element
         * @param {object} obj The obj to display
         * @param {string} title The title for the new window
         * @param {string} exp The string to highlight
         */
        JSV.createXMLPre = function(el, obj, title, exp) {
            var pre = $('<pre><code class="language-xml"></code></pre>');
            var btn = $('<a href="#" class="ui-btn ui-mini ui-icon-action ui-btn-icon-right">Open in new window</a>').click(function() {
                var w = window.open('', 'pre', null, true);

                $(w.document.body).html($('<div>').append(pre.clone().height('95%')).html());
                hljs.highlightBlock($(w.document.body).children('pre')[0]);
                $(w.document.body).append('<link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.1/styles/default.min.css">');
                w.document.title = title || 'mdTranslator';
            });

            pre.children('code').text(obj.data);
            el.html(btn);

            if(exp) {
                pre.highlight(exp, 'highlight');
            }
            el.append(pre);
            pre.height(el.height() - btn.outerHeight(true) - (pre.outerHeight(true) - pre.height()));
        };

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
                JSV.createXMLPre($('#translation-results'), data);
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
