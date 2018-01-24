//fix for IE
if (!window.location.origin) {
  window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

if (typeof JSV === 'undefined') {
    /**
     * JSV namespace for JSON Schema Viewer.
     * @namespace
     */
    var JSV = {
        /**
         * The root schema to load.
         */
        schema: '',

        /**
         * If true, render diagram only on init, without the jQuery Mobile UI.
         * The legend and nav tools will be rendered with any event listeners.
         */
        plain: false,

        /**
         * The version of the schema.
         */
        version: '',

        /**
         * Currently focused node
         */
        focusNode: false,

        /**
         * Currently loaded example
         */
        example: false,

        /**
         * @property {object} treeData The diagram nodes
         */
        treeData: null,

        /**
         * The initialization status of the viewer page
         */
        viewerInit: false,

        /**
         * The current viewer height
         */
        viewerHeight: 0,

        /**
         * The current viewer width
         */
        viewerWidth: 0,

        /**
         * The default duration of the node transitions
         */
        duration: 750,

        /**
         * Counter for generating unique ids
         */
        counter: 0,

        maxLabelLength: 0,

        /**
         * Default maximum depth for recursive schemas
         */
        maxDepth: 20,

        /**
         * @property {object} labels Nodes to render as non-clickable in the tree. They will auto-expand if child nodes are present.
         */
        labels: {
            allOf: true,
            anyOf: true,
            oneOf: true,
            'object{ }': true
        },

        /**
         * @property {array} baseSvg The base SVG element for the d3 diagram
         */
        baseSvg: null,

        /**
         * @property {array} svgGroup SVG group which holds all nodes and which the zoom Listener can act upon.
         */
        svgGroup: null,

        /**
         * Initializes the viewer.
         *
         * @param {object} config The configuration.
         * @param {function} callback Function to run after schemas are loaded and
         * diagram is created.
         */

        init: function(config, callback) {
            var i;
            //apply config
            for (i in config) {
                if (JSV.hasOwnProperty(i)) {
                    JSV[i] = config[i];
                }
            }

            if(JSV.plain) {
              JSV.createDiagram(callback);
                          //setup controls
                        d3.selectAll('#zoom-controls>a').on('click', JSV.zoomClick);
                        d3.select('#tree-controls>a#reset-tree').on('click', JSV.resetViewer);
              JSV.viewerInit = true;
              return;
            }

            JSV.contentHeight();
            JSV.resizeViewer();

            $(document).on('pagecontainertransition', this.contentHeight);
            $(window).on('throttledresize orientationchange', this.contentHeight);
            $(window).on('resize', this.contentHeight);

            JSV.resizeBtn();
            $(document).on('pagecontainershow', JSV.resizeBtn);
            $(window).on('throttledresize', JSV.resizeBtn);

            var cb = function() {
                callback();

                //setup search
                var items = [];

                JSV.visit(JSV.treeData, function(me) {
                    if (me.isReal) {
                        items.push(me.plainName + '|' + JSV.getNodePath(me).join('-'));
                    }
                }, function(me) {
                    return me.children || me._children;
                });

                items.sort();
                JSV.buildSearchList(items, true);

                $('#loading').fadeOut('slow');
            };
            JSV.createDiagram(cb);

            JSV.initValidator();

            //initialize error popup
            $( '#popup-error' ).enhanceWithin().popup();

            ///highlight plugin
            $.fn.highlight = function (str, className, quote) {
                var string = quote ? '\\"\\b'+str+'\\b\\"' : '\\b'+str+'\\b',
                    regex = new RegExp(string, 'g');

                return this.each(function () {
                    this.innerHTML = this.innerHTML.replace(regex, function(matched) {return '<span class="' + className + '">' + matched + '</span>';});
                });
            };

            //restore info-panel state
            $('body').on('pagecontainershow', function(event, ui) {
                var page = ui.toPage;

                if(page.attr('id') === 'viewer-page' && JSV.viewerInit) {
                    if(page.jqmData('infoOpen')) {
                        $('#info-panel'). panel('open');
                    }
                    //TODO: add this to 'pagecontainercreate' handler on refactor???
                    JSV.contentHeight();
                    if($('svg#jsv-tree').height() === 0) {
                        $('svg#jsv-tree').attr('width', $('#main-body').width())
                                         .attr('height', $('#main-body').height());
                        JSV.resizeViewer();
                        JSV.resetViewer();

                    }

                }
            });

            //store info-panel state
            $('body').on('pagecontainerbeforehide', function(event, ui) {
                var page = ui.prevPage;
                if(page.attr('id') === 'viewer-page') {
                    page.jqmData('infoOpen', !!page.find('#info-panel.ui-panel-open').length);
                }
            });

            //resize viewer on panel open/close
            $('#info-panel').on('panelopen', function() {
                var focus = JSV.focusNode;

                JSV.resizeViewer();
                if(focus) {
                    d3.select('#n-' + focus.id).classed('focus',true);
                    JSV.setPermalink(focus);
                }
            });

            $('#info-panel').on('panelclose', function() {
                var focus = JSV.focusNode;

                JSV.resizeViewer();
                if (focus) {
                    d3.select('#n-' + focus.id).classed('focus', false);
                    $('#permalink').html('Select a Node...');
                    $('#sharelink').val('');
                }
            });

            //scroll example/schema when tab is activated
            $('#info-panel').on( 'tabsactivate', function( event, ui ) {
                var id = ui.newPanel.attr('id');

                if(id === 'info-tab-example' || id === 'info-tab-schema') {
                    var pre = ui.newPanel.find('pre'),
                        highEl = pre.find('span.highlight')[0];

                    if(highEl) {
                        pre.scrollTo(highEl, 900);
                    }
                }
            });

            //setup example links
            $('.load-example').each(function(idx, link) {
                var ljq = $(link);
                ljq.on('click', function(evt) {
                    evt.preventDefault();
                    JSV.loadInputExample(link.href, ljq.data('target'));
                });
            });

            //setup controls
            d3.selectAll('#zoom-controls>a').on('click', JSV.zoomClick);
            d3.select('#tree-controls>a#reset-tree').on('click', JSV.resetViewer);

            $('#sharelink').on('click', function () {
               $(this).select();
            });

            JSV.viewerInit = true;

        },

        /**
         * (Re)set the viewer page height, set the diagram dimensions.
         */
        contentHeight: function() {
            var screen = $.mobile.getScreenHeight(),
                header = $('.ui-header').hasClass('ui-header-fixed') ? $('.ui-header').outerHeight() - 1 : $('.ui-header').outerHeight(),
                footer = $('.ui-footer').hasClass('ui-footer-fixed') ? $('.ui-footer').outerHeight() - 1 : $('.ui-footer').outerHeight(),
                contentCurrent = $('#main-body.ui-content').outerHeight() - $('#main-body.ui-content').height(),
                content = screen - header - footer - contentCurrent;

            $('#main-body.ui-content').css('min-height', content + 'px');
        },

        /**
         * Hides navbar button text on smaller window sizes.
         *
         * @param {number} minSize The navbar width breakpoint.
         */
        resizeBtn: function(minSize) {
            var bp = typeof minSize  === 'number' ? minSize : 800;
            var activePage = $.mobile.pageContainer.pagecontainer('getActivePage');
            if ($('.md-navbar', activePage).width() <= bp) {
                $('.md-navbar .md-flex-btn.ui-btn-icon-left').toggleClass('ui-btn-icon-notext ui-btn-icon-left');
            } else {
                $('.md-navbar .md-flex-btn.ui-btn-icon-notext').toggleClass('ui-btn-icon-left ui-btn-icon-notext');
            }
        },

        /**
         * Set version of the schema and the content
         * of any elemant with the class *schema-version*.
         *
         * @param {string} version
         */
        setVersion: function(version) {
            JSV.version = version;

            $('.schema-version').text(version);
        },

        /**
         * Display an error message.
         *
         * @param {string} msg The message to display.
         */
        showError: function(msg) {
            $('#popup-error .error-message').html(msg);
            $('#popup-error').popup('open');
        },

        initValidator: function() {
            var opts = {
                readAsDefault: 'Text',
                on: {
                    load: function(e, file) {
                        var data = e.currentTarget.result;

                        try {
                            $.parseJSON(data);
                            //console.info(data);
                            $('#textarea-json').val(data);
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


            $('#file-upload, #textarea-json').fileReaderJS(opts);
            $('body').fileClipboard(opts);


            $('#button-validate').click(function() {
                var result = JSV.validate();

                if (result) {
                    JSV.showValResult(result);
                }
                //console.info(result);
            });
        },

        /**
         * Validate using tv4 and currently loaded schema(s).
         */
        validate: function() {
            var data;

            try {
                 data = $.parseJSON($('#textarea-json').val());
            } catch(e) {
                JSV.showError('Unable to parse JSON: <br/>' + e);
            }

            if (data) {
                var stop = $('#checkbox-stop').is(':checked'),
                    strict = $('#checkbox-strict').is(':checked'),
                    schema = tv4.getSchemaMap()[JSV.schema],
                    result;

                if (stop) {
                    var r = tv4.validate(data, schema, false, strict);
                    result = {
                        valid: r,
                        errors: !r ? [tv4.error] : []
                    };
                } else {
                    result = tv4.validateMultiple(data, schema, false, strict);
                }

                return result;
            }

        },

        /**
         * Display the validation result
         *
         * @param {object} result A result object, ouput from [validate]{@link JSV.validate}
         */
        showValResult: function(result) {
            var cont = $('#validation-results'), ui;

            if(cont.children().length) {
                cont.css('opacity', 0);
            }

            if(result.valid) {
                cont.html('<p class=ui-content>JSON is valid!</p>');
            } else {
                ui = cont.html('<div class=ui-content>JSON is <b>NOT</b> valid!</div>');
                $.each(result.errors, function(i, err){
                    var me = JSV.buildValError(err, 'Error ' + (i+1) + ': ');

                    if(err.subErrors) {
                        $.each(err.subErrors, function(i, sub){
                            me.append(JSV.buildValError(sub, 'SubError ' + (i+1) + ': '));
                        });
                    }

                    ui.children('.ui-content').first().append(me).enhanceWithin();
                });
            }

            cont.toggleClass('error', !result.valid);
            $('#validator-page').animate({
                scrollTop: $('#validation-results').offset().top + 20
            }, 1000);

            cont.fadeTo(350, 1);
        },

        /**
         * Build a collapsible validation block.
         *
         * @param {object} err The error object
         * @param {string} title The title for the error block
         */
        buildValError: function(err, title) {
            var main = '<div data-role="collapsible" data-collapsed="true" data-mini="true">' +
                            '<h4>' + (title || 'Error: ') + err.message + '</h4>' +
                            '<ul><li>Message: '+ err.message + '</li>' +
                            '<li>Data Path: '+ err.dataPath + '</li>' +
                            '<li>Schema Path: '+ err.schemaPath + '</li></ul></div>';

           return $(main);
        },

        /**
         * Set the content for the info panel.
         *
         * @param {object} node The d3 tree node.
         */
        setInfo: function(node) {
            var schema = $('#info-tab-schema');
            var def = $('#info-tab-def');
            var ex = $('#info-tab-example');

            var height = ($('#info-panel').innerHeight() - $('#info-panel .ui-panel-inner').outerHeight() + $('#info-panel #info-tabs').height()) -
                $('#info-panel #info-tabs-navbar').height() - (schema.outerHeight(true) - schema.height());

            $.each([schema, def, ex], function(i, e){
                e.height(height);
            });

            $('#info-definition').html(node.description || 'No definition provided.');
            $('#info-type').html(node.displayType.toString());

            if(node.translation) {
                var trans = $('<ul></ul>');

                $.each(node.translation, function(p, v) {
                    var li = $('<li>' + p + '</li>');
                    var ul = $('<ul></ul>');

                    $.each(v, function(i, e) {
                       ul.append('<li>' + e + '</li>');
                    });

                    trans.append(li.append(ul));
                });

                $('#info-translation').html(trans);
            } else {
                $('#info-translation').html('No translations available.');
            }


            JSV.createPre(schema, tv4.getSchema(node.schema), false, node.plainName);

            var example = (!node.example && node.parent && node.parent.example && node.parent.type === 'object' ? node.parent.example : node.example);

            if(example) {
                if(example !== JSV.example) {
                    $.getJSON(node.schema.match( /^(.*?)(?=[^\/]*\.json)/g ) + example, function(data) {
                        var pointer = example.split('#')[1];

                        if(pointer) {
                            data = jsonpointer.get(data, pointer);
                        }

                        JSV.createPre(ex, data, false, node.plainName);
                        JSV.example = example;
                    }).fail(function() {
                        ex.html('<h3>No example found.</h3>');
                        JSV.example = false;
                    });
                } else {
                    var pre = ex.find('pre'),
                        highEl;

                    pre.find('span.highlight').removeClass('highlight');

                    if(node.plainName) {
                        pre.highlight(node.plainName, 'highlight', true);
                    }
                    //scroll to highlighted property
                    highEl = pre.find('span.highlight')[0];

                    if (highEl) {
                        pre.scrollTo(highEl, 900);
                    }
                }
            } else {
                ex.html('<h3>No example available.</h3>');
                JSV.example = false;
            }
        },

        /**
         * Create a *pre* block and append it to the passed element.
         *
         * @param {object} el jQuery element
         * @param {object} obj The obj to stringify and display
         * @param {string} title The title for the new window
         * @param {string} exp The string to highlight
         */
        createPre: function(el, obj, title, exp) {
            var pre = $('<pre><code class="language-json">' + JSON.stringify(obj, null, '  ') + '</code></pre>');
            var btn = $('<a href="#" class="ui-btn ui-mini ui-icon-action ui-btn-icon-right">Open in new window</a>').click(function() {
                var w = window.open('', 'pre', null, true);

                $(w.document.body).html($('<div>').append(pre.clone().height('95%')).html());
                hljs.highlightBlock($(w.document.body).children('pre')[0]);
                $(w.document.body).append('<link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.1/styles/default.min.css">');
                w.document.title = title || 'JSON Schema Viewer';
                w.document.close();
            });

            el.html(btn);

            if(exp) {
                pre.highlight(exp, 'highlight', true);
            }
            el.append(pre);
            pre.height(el.height() - btn.outerHeight(true) - (pre.outerHeight(true) - pre.height()));

            //scroll to highlighted property
            var highEl = pre.find('span.highlight')[0];

            if(highEl) {
                pre.scrollTo(highEl, 900);
            }
        },

        /**
         * Create a "breadcrumb" for the node.
         */
        compilePath: function(node, path) {
            var p;

            if(node.parent) {
                p = path ? node.name + ' > ' + path : node.name;
                return JSV.compilePath(node.parent, p);
            } else {
                p = path ? node.name + ' > ' + path : node.name;
            }

            return p;
        },

        /**
         * Load an example in the specified input field.
         */
        loadInputExample: function(uri, target) {
            $.getJSON(uri).done(function(fetched) {
                $('#' + target).val(JSON.stringify(fetched, null, '  '));
            }).fail(function(jqXHR, textStatus, errorThrown) {
                JSV.showError('Failed to load example: ' + errorThrown);
            });
        },

        /**
         * Create a "permalink" for the node.
         */
        setPermalink: function(node) {
            var uri = new URI(),
                path = JSV.getNodePath(node).join('-');

            //uri.search({ v: path});
            uri.hash($.mobile.activePage.attr('id') + '?v=' + path);
            $('#permalink').html(JSV.compilePath(node));
            $('#sharelink').val(uri.toString());
        },

        /**
         * Create an index-based path for the node from the root.
         */
        getNodePath: function(node, path) {
            var p = path || [],
                parent = node.parent;

            if(parent) {
                var children = parent.children || parent._children;

                p.unshift(children.indexOf(node));
                return JSV.getNodePath(parent, p);
            } else {
                return p;
            }
        },

        /**
         * Expand an index-based path for the node from the root.
         */
        expandNodePath: function(path) {
            var i,
                node = JSV.treeData; //start with root

            for (i = 0; i < path.length; i++) {
                if(node._children) {
                    JSV.expand(node);
                }
                node = node.children[path[i]];
            }

            JSV.update(JSV.treeData);
            JSV.centerNode(node);

            return node;
        },

        /**
         * Build Search.
         */
        buildSearchList: function(items, init) {
            var ul = $('ul#search-result');

            $.each(items, function(i,v) {
                var data = v.split('|');
                var li = $('<li/>').attr('data-icon', 'false').appendTo(ul);

                $('<a/>').attr('data-path', data[1]).text(data[0]).appendTo(li);
            });

            if(init) {
              ul.filterable();
            }
            ul.filterable('refresh');

            ul.on('click', function(e) {
                var path = $(e.target).attr('data-path');
                var node = JSV.expandNodePath(path.split('-'));

                JSV.flashNode(node);
            });

        },

        /**
         * Flash node text
         */
        flashNode: function(node, times) {
            var t = times || 4,
            text = $('#n-' + node.id + ' text');
            //flash node text
            while (t--) {
                text.fadeTo(350, 0).fadeTo(350, 1);
            }
        },

        /**
         * A recursive helper function for performing some setup by walking
         * through all nodes
         */
        visit: function (parent, visitFn, childrenFn) {
            if (!parent) {
                return;
            }
            visitFn(parent);

            var children = childrenFn(parent);

            if (children) {
                var count = children.length, i;
                for ( i = 0; i < count; i++) {
                    JSV.visit(children[i], visitFn, childrenFn);
                }
            }
        },

        /**
         * Create the tree data object from the schema(s)
         */
        compileData: function (schema, parent, name, real, depth) {
            // Ensure healthy amount of recursion
            depth = depth || 0;
            if (depth > this.maxDepth) {
                return;
            }
            var key, node,
                s = schema.$ref ? tv4.getSchema(schema.$ref) : schema,
                props = s.properties,
                additionalProps = s.additionalProperties,
                items = s.items,
                owns = Object.prototype.hasOwnProperty,
                all = {},
                parentSchema = function(node) {
                    var schema = node.id || node.$ref || node.schema;

                    if (schema) {
                        return schema;
                    } else if (node.parentSchema) {
                        return parentSchema(node.parentSchema);
                    } else {
                        return null;
                    }
                };

            if (s.allOf) {
                all.allOf = s.allOf;
            }

            if (s.oneOf) {
                all.oneOf = s.oneOf;
            }

            if (s.anyOf) {
                all.anyOf = s.anyOf;
            }

            node = {
                description: schema.description || s.description,
                name: (schema.$ref && real ? name : false) || s.title || name || 'schema',
                isReal: real,
                plainName: name,
                type: s.type,
                displayType: s.type || (s['enum'] ? 'enum: ' + s['enum'].join(', ') : s.items ? 'array' : s.properties ? 'object' : 'ambiguous'),
                translation: schema.translation || s.translation,
                example: schema.example || s.example,
                opacity: real ? 1 : 0.5,
                required: s.required,
                schema: s.id || schema.$ref || parentSchema(parent),
                parentSchema: parent,
                deprecated: schema.deprecated || s.deprecated
            };

            node.require = parent && parent.required ? parent.required.indexOf(node.name) > -1 : false;

            if (parent) {
                if (node.name === 'item') {
                    node.parent = parent;
                    if(node.type) {
                        node.name = node.type;
                        parent.children.push(node);
                    }
                } else if (parent.name === 'item') {
                    parent.parent.children.push(node);
                } else {
                    parent.children.push(node);
                }
            } else {
                JSV.treeData = node;
            }

            if(node.type === 'array') {
                node.name += '[' + (s.minItems || ' ') + ']';
                node.minItems = s.minItems;
            }

            if(node.type === 'object' && node.name !== 'item') {
                node.name += '{ }';
            }

            if(additionalProps || props || items || all) {
                node.children = [];
            }

            if (typeof(props) === 'undefined' && additionalProps) {
                JSV.compileData(additionalProps, node, 'item', false, depth + 1);
            }

            for (key in props) {
                if (!owns.call(props, key)) {
                    continue;
                }
                JSV.compileData(props[key],  node, key, true, depth + 1);
            }

            for (key in all) {
                if (!owns.call(all, key)) {
                    continue;
                }
                if (!all[key]) {
                    continue;
                }
                var allNode = {
                    name: key,
                    children: [],
                    opacity: 0.5,
                    parentSchema: parent,
                    schema: schema.$ref || parentSchema(parent)
                };

                if (node.name === 'item') {
                    node.parent.children.push(allNode);
                } else {
                    node.children.push(allNode);
                }

                for (var i = 0; i < all[key].length; i++) {
                    JSV.compileData(all[key][i], allNode, s.title || all[key][i].type, false, depth + 1);
                }
            }

            if (Object.prototype.toString.call(items) === '[object Object]') {
                JSV.compileData(items, node, 'item', false, depth + 1);
            } else if (Object.prototype.toString.call(items) === '[object Array]') {

                items.forEach(function(itm, idx, arr) {
                    JSV.compileData(itm, node, idx.toString(), false, depth + 1);
                });
            }

        },

        /**
         * Resize the diagram
         */
        resizeViewer: function() {
            JSV.viewerWidth = $('#main-body').width();
            JSV.viewerHeight = $('#main-body').height();
            if(JSV.focusNode) {
                JSV.centerNode(JSV.focusNode);
            }
        },

        /**
         * Reset the tree starting from the passed source.
         */
        resetTree: function (source, level) {
            JSV.visit(source, function(d) {
                if (d.children && d.children.length > 0 && d.depth > level && !JSV.labels[d.name]) {
                    JSV.collapse(d);
                    //d._children = d.children;
                    //d.children = null;
                }else if(JSV.labels[d.name]){
                    JSV.expand(d);
                }
            }, function(d) {
                if (d.children && d.children.length > 0) {
                    return d.children;
                } else if (d._children && d._children.length > 0) {
                    return d._children;
                } else {
                    return null;
                }
            });
        },

        /**
         * Reset and center the tree.
         */
        resetViewer: function () {
            //Firefox will choke if the viewer-page is not visible
            //TODO: fix on refactor to use pagecontainer event
            var page = $('#viewer-page');

            page.css('display','block');

            // Define the root
            var root = JSV.treeData;
            root.x0 = JSV.viewerHeight / 2;
            root.y0 = 0;

            // Layout the tree initially and center on the root node.
            // Call visit function to set initial depth
            JSV.tree.nodes(root);
            JSV.resetTree(root, 1);
            JSV.update(root);

            //reset the style for viewer-page
            page.css('display', '');

            JSV.centerNode(root, 4);
        },

        /**
         * Function to center node when clicked so node doesn't get lost when collapsing with large amount of children.
         */
        centerNode: function (source, ratioX) {
            var rX = ratioX ? ratioX : 2,
                zl = JSV.zoomListener,
                scale = zl.scale(),
                x = -source.y0 * scale + JSV.viewerWidth / rX,
                y = -source.x0 * scale + JSV.viewerHeight / 2;

            d3.select('g#node-group').transition()
                .duration(JSV.duration)
                .attr('transform', 'translate(' + x + ',' + y + ')scale(' + scale + ')');
            zl.scale(scale);
            zl.translate([x, y]);
        },

        /**
         * Helper functions for collapsing nodes.
         */
        collapse: function (d) {
            if (d.children) {
                d._children = d.children;
                //d._children.forEach(collapse);
                d.children = null;
            }
        },

        /**
         * Helper functions for expanding nodes.
         */
        expand: function (d) {
            if (d._children) {
                d.children = d._children;
                //d.children.forEach(expand);
                d._children = null;
            }

            if (d.children) {
                var count = d.children.length, i;
                for (i = 0; i < count; i++) {
                    if(JSV.labels[d.children[i].name]) {
                        JSV.expand(d.children[i]);
                    }
                }
            }
        },

        /**
         * Toggle children function
         */
        toggleChildren: function (d) {
            if (d.children) {
                JSV.collapse(d);
            } else if (d._children) {
                JSV.expand(d);
            }
            return d;
        },

        /**
         * Toggle children on node click.
         */
        click: function (d) {
            if(!JSV.labels[d.name]) {
                if (d3.event && d3.event.defaultPrevented) {return;} // click suppressed
                d = JSV.toggleChildren(d);
                JSV.update(d);
                JSV.centerNode(d);
            }
        },

        /**
         * Show info on node title click.
         */
       clickTitle: function (d) {
            if(!JSV.labels[d.name]) {
                if (d3.event && d3.event.defaultPrevented) {return;} // click suppressed
                var panel = $( '#info-panel' );

                if(JSV.focusNode) {
                    d3.select('#n-' + JSV.focusNode.id).classed('focus',false);
                }
                JSV.focusNode = d;
                JSV.centerNode(d);
                d3.select('#n-' + d.id).classed('focus',true);

                if(!JSV.plain) {
                  JSV.setPermalink(d);

                  $('#info-title')
                    .text('Info: ' + d.name)
                    .toggleClass('deprecated', !!d.deprecated);
                  JSV.setInfo(d);
                  panel.panel( 'open' );
                }
            }
        },

        /**
         * Zoom the tree
         */
        zoom: function () {
            JSV.svgGroup.attr('transform', 'translate(' + JSV.zoomListener.translate() + ')' + 'scale(' + JSV.zoomListener.scale() + ')');
        },

        /**
         * Perform the d3 zoom based on position and scale
         */
        interpolateZoom: function  (translate, scale) {
            return d3.transition().duration(350).tween('zoom', function () {
                var iTranslate = d3.interpolate(JSV.zoomListener.translate(), translate),
                    iScale = d3.interpolate(JSV.zoomListener.scale(), scale);
                return function (t) {
                    JSV.zoomListener
                        .scale(iScale(t))
                        .translate(iTranslate(t));
                    JSV.zoom();
                };
            });
        },

        /**
         * Click handler for the zoom control
         */
        zoomClick: function () {
            var clicked = d3.event.target,
                direction = 1,
                factor = 0.2,
                target_zoom = 1,
                center = [JSV.viewerWidth / 2, JSV.viewerHeight / 2],
                zl = JSV.zoomListener,
                extent = zl.scaleExtent(),
                translate = zl.translate(),
                translate0 = [],
                l = [],
                view = {x: translate[0], y: translate[1], k: zl.scale()};

            d3.event.preventDefault();
            direction = (this.id === 'zoom_in') ? 1 : -1;
            target_zoom = zl.scale() * (1 + factor * direction);

            if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

            translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
            view.k = target_zoom;
            l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

            view.x += center[0] - l[0];
            view.y += center[1] - l[1];

            JSV.interpolateZoom([view.x, view.y], view.k);
        },

        /**
         * The zoomListener which calls the zoom function on the 'zoom' event constrained within the scaleExtents
         */
        zoomListener: null,

        /**
         * Sort the tree according to the node names
         */
        sortTree: function (tree) {
            tree.sort(function(a, b) {
                return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
            });
        },

        /**
         * The d3 diagonal projection for use by the node paths.
         */
        diagonal1: function(d) {
            var src = d.source,
                node = d3.select('#n-' + (src.id))[0][0],
                dia,
                width = 0 ;

            if(node) {
                width = node.getBBox().width;
            }

            dia = 'M' + (src.y + width) + ',' + src.x +
                'H' + (d.target.y - 30) + 'V' + d.target.x +
                //+ (d.target.children ? '' : 'h' + 30);
                ('h' + 30);

           return dia;
        },

        /**
         * Update the tree, removing or adding nodes from/to the passed source node
         */
        update: function (source) {
            var duration = JSV.duration;
            var root = JSV.treeData;
            // Compute the new height, function counts total children of root node and sets tree height accordingly.
            // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
            // This makes the layout more consistent.
            var levelWidth = [1];
            var childCount = function(level, n) {

                if (n.children && n.children.length > 0) {
                    if (levelWidth.length <= level + 1) {levelWidth.push(0);}

                    levelWidth[level + 1] += n.children.length;
                    n.children.forEach(function(d) {
                        childCount(level + 1, d);
                    });
                }
            };
            childCount(0, root);
            var newHeight = d3.max(levelWidth) * 45; // 25 pixels per line
            JSV.tree.size([newHeight, JSV.viewerWidth]);

            // Compute the new tree layout.
            var nodes = JSV.tree.nodes(root).reverse(),
                links = JSV.tree.links(nodes);

            // Set widths between levels based on maxLabelLength.
            nodes.forEach(function(d) {
                d.y = (d.depth * (JSV.maxLabelLength * 8)); //maxLabelLength * 8px
                // alternatively to keep a fixed scale one can set a fixed depth per level
                // Normalize for fixed-depth by commenting out below line
                // d.y = (d.depth * 500); //500px per level.
            });
            // Update the nodes…
            var node = JSV.svgGroup.selectAll('g.node')
                .data(nodes, function(d) {
                    return d.id || (d.id = ++JSV.counter);
                });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append('g')
                .attr('class', function(d) {
                    return JSV.labels[d.name] ? 'node label' : 'node';
                })
                .classed('deprecated', function(d) {
                    return d.deprecated;
                })
                .attr('id', function(d, i) {
                    return 'n-' + d.id;
                })
                .attr('transform', function(d) {
                    return 'translate(' + source.y0 + ',' + source.x0 + ')';
                });

            nodeEnter.append('circle')
                //.attr('class', 'nodeCircle')
                .attr('r', 0)
                .classed('collapsed', function(d) {
                    return d._children ? true : false;
                })
                .on('click', JSV.click);

            nodeEnter.append('text')
                .attr('x', function(d) {
                    return 10;
    //                return d.children || d._children ? -10 : 10;
                })
                .attr('dy', '.35em')
                .attr('class', function(d) {
                    return (d.children || d._children) ? 'node-text node-branch' : 'node-text';
                })
                .classed('abstract', function(d) {
                    return d.opacity < 1;
                })
                .attr('text-anchor', function(d) {
                    //return d.children || d._children ? 'end' : 'start';
                    return 'start';
                })
                .text(function(d) {
                    return d.name + (d.require ? '*' : '');
                })
                .style('fill-opacity', 0)
                .on('click', JSV.clickTitle)
                .on('dblclick', function(d) {
                    JSV.click(d);
                    JSV.clickTitle(d);
                    d3.event.stopPropagation();
                });


            // Change the circle fill depending on whether it has children and is collapsed
            node.select('.node circle')
                .attr('r', 6.5)
                .classed('collapsed', function(d) {
                    return (d._children ? true : false);
                });

            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr('transform', function(d) {
                    return 'translate(' + d.y + ',' + d.x + ')';
                });

            // Fade the text in
            nodeUpdate.select('text')
                .style('fill-opacity', function(d) {
                    return d.opacity || 1;
                });

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr('transform', function(d) {
                    return 'translate(' + source.y + ',' + source.x + ')';
                })
                .remove();

            nodeExit.select('circle')
                .attr('r', 0);

            nodeExit.select('text')
                .style('fill-opacity', 0);

            // Update the links…
            var link = JSV.svgGroup.selectAll('path.link')
                .data(links, function(d) {
                    return d.target.id;
                });

            // Enter any new links at the parent's previous position.
            link.enter().insert('path', 'g')
                .attr('class', 'link')
                .attr('d', function(d) {
                    var o = {
                        x: source.x0,
                        y: source.y0
                    };

                    //console.info(d3.select('#n-'+d.source.id)[0][0].getBBox());

                    return JSV.diagonal1({
                        source: o,
                        target: o
                    });
                });

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr('d', JSV.diagonal1);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr('d', function(d) {
                    var o = {
                        x: source.x,
                        y: source.y
                    };
                    return JSV.diagonal1({
                        source: o,
                        target: o
                    });
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        },

        /**
         * Create the d3 diagram.
         *
         * @param {function} callback Function to run after the diagram is created
         */
        createDiagram: function(callback) {
            tv4.asyncLoad([JSV.schema], function() {

                JSV.compileData(tv4.getSchema(JSV.schema),false,'schema');

                // Calculate total nodes, max label length
                var totalNodes = 0;
                // panning variables
                //var panSpeed = 200;
                //var panBoundary = 20; // Within 20px from edges will pan when dragging.

                // size of the diagram
                var viewerWidth = JSV.viewerWidth;
                var viewerHeight = JSV.viewerHeight;

                JSV.zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on('zoom', JSV.zoom);

                JSV.baseSvg = d3.select('#main-body').append('svg')
                    .attr('id', 'jsv-tree')
                    .attr('class', 'overlay')
                    .attr('width', viewerWidth)
                    .attr('height', viewerHeight)
                    .call(JSV.zoomListener);

                JSV.tree = d3.layout.tree()
                    .size([viewerHeight, viewerWidth]);

                // Call JSV.visit function to establish maxLabelLength
                JSV.visit(JSV.treeData, function(d) {
                    totalNodes++;
                    JSV.maxLabelLength = Math.max(d.name.length, JSV.maxLabelLength);

                }, function(d) {
                    return d.children && d.children.length > 0 ? d.children : null;
                });

                // Sort the tree initially in case the JSON isn't in a sorted order.
                //JSV.sortTree();

                JSV.svgGroup = JSV.baseSvg.append('g')
                    .attr('id', 'node-group');

                // Layout the tree initially and center on the root node.
                JSV.resetViewer();

                JSV.centerNode(JSV.treeData, 4);

                // define the legend svg, attaching a class for styling
                var legendData = [{
                    text: 'Expanded',
                    y: 20
                }, {
                    text: 'Collapsed',
                    iconCls: 'collapsed',
                    y: 40
                }, {
                    text: 'Selected',
                    itemCls: 'focus',
                    y: 60
                },{
                    text: 'Required*',
                    y: 80
                },{
                    text: 'Object{ }',
                    iconCls: 'collapsed',
                    y: 100
                },{
                    text: 'Array[minimum #]',
                    iconCls: 'collapsed',
                    y: 120
                },{
                    text: 'Abstract Property',
                    itemCls: 'abstract',
                    y: 140,
                    opacity: 0.5
                },{
                    text: 'Deprecated',
                    itemCls: 'deprecated',
                    y: 160
                }];


                var legendSvg = d3.select('#legend-items').append('svg')
                    .attr('width', 170)
                    .attr('height', 180);

                // Update the nodes…
                var legendItem = legendSvg.selectAll('g.item-group')
                    .data(legendData)
                    .enter()
                    .append('g')
                    .attr('class', function(d) {
                        var cls = 'item-group ';

                        cls += d.itemCls || '';
                        return cls;
                    })
                    .attr('transform', function(d) {
                        return 'translate(10, ' + d.y + ')';
                    });

                legendItem.append('circle')
                    .attr('r', 6.5)
                    .attr('class', function(d) {
                        return d.iconCls;
                    });

                legendItem.append('text')
                    .attr('x', 15)
                    .attr('dy', '.35em')
                    .attr('class', 'item-text')
                    .attr('text-anchor', 'start')
                    .style('fill-opacity', function(d) {
                        return d.opacity || 1;
                    })
                    .text(function(d) {
                        return d.text;
                    });

                if(typeof callback === 'function') {callback();}
            });
        }
    };
}
