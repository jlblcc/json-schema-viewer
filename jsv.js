//fix for IE
if (!window.location.origin) {
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

/**
 * JSV namespace.
 */
if (typeof JSV === "undefined") {
    var JSV = {
        /**
         * The root schema to load.
         */
        schema: '',

        /**
         * The title to use in the viewer.
         */
        title: 'Viewer',

        /**
         * Currently focused node
         */
        focusNode: false,

        /**
         * The diagram nodes
         */
        treeData: null,

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
        duration: 0,

        maxLabelLength: 0,

        /**
         * Nodes to render as non-clickable in the tree. They will auto-expand if child nodes are present.
         */
        labels: {
            allOf: true,
            anyOf: true,
            oneOf: true,
            "object{ }": true
        },

        /*
         * The baseSvg, attaching a class for styling and the zoomListener
         */
        baseSvg: null,

        /*
         * Group which holds all nodes and which the zoom Listener can act upon.
         */
        svgGroup: null,

        /**
         * Initializes this object.
         */
        init: function(config) {
            var i;
            //apply config
            for (i in config) {
                JSV[i] = config[i];
            }

            $(document).on("pagecontainertransition", this.contentHeight);
            $(window).on("throttledresize orientationchange", this.contentHeight);
            $(window).on("resize", this.contentHeight); //TODO: currently not picked up by the static d3 variables
            //alias for Prism
            //Prism.languages.json = Prism.languages.javascript;
            this.createDiagram();
            this.initValidator();

            //initialize error popup
            $( "#popup-error" ).enhanceWithin().popup();

            ///highlight plugin
            $.fn.highlight = function (str, className) {
                var regex = new RegExp("\\b"+str+"\\b", "g");

                return this.each(function () {
                    this.innerHTML = this.innerHTML.replace(regex, function(matched) {return "<span class=\"" + className + "\">" + matched + "</span>";});
                });
            };

            //restore info-panel state
            $("body").on("pagecontainershow", function(event, ui) {
                var page = ui.toPage;

                if(page.attr('id') === 'viewer-page') {
                    if(page.jqmData('infoOpen')) {
                        $('#info-panel'). panel("open");
                    }
                    //TODO: add this to "pagecontainercreate" handler on refactor
                    if($("svg#jsv-tree").height() === 0) {
                        $("svg#jsv-tree").attr("width", $("#main-body").width())
                                         .attr("height", $("#main-body").height());
                        this.resizeViewer();
                        JSV.resetViewer();

                    }

                }
            });

            //store info-panel state
            $("body").on("pagecontainerbeforehide", function(event, ui) {
                var page = ui.prevPage;
                if(page.attr('id') === 'viewer-page') {
                    page.jqmData('infoOpen', !!page.find("#info-panel.ui-panel-open").length);
                }
            });

            //resize viewer on panel open/close
            $("#info-panel").on("panelopen", function() {
                JSV.resizeViewer();
                if(focusNode) {
                    d3.select('#n-' + focusNode.id).classed('focus',true);
                    $("#schema-path").html(JSV.compilePath(focusNode));
                }
            });
            $("#info-panel").on("panelclose", function() {
                JSV.resizeViewer();
                if (focusNode) {
                    d3.select('#n-' + focusNode.id).classed('focus', false);
                    $("#schema-path").html('Select a Node...');
                }
            });

            //setup controls
            d3.selectAll('#zoom-controls>a').on('click', this.zoomClick);
            d3.select('#tree-controls>a#reset-tree').on('click', this.resetViewer);
        },

        contentHeight: function() {
            var screen = $.mobile.getScreenHeight(),
                header = $(".ui-header").hasClass("ui-header-fixed") ? $(".ui-header").outerHeight() - 1 : $(".ui-header").outerHeight(),
                footer = $(".ui-footer").hasClass("ui-footer-fixed") ? $(".ui-footer").outerHeight() - 1 : $(".ui-footer").outerHeight(),
                contentCurrent = $("#main-body.ui-content").outerHeight() - $("#main-body.ui-content").height();
                content = screen - header - footer - contentCurrent;

            $("#main-body.ui-content").css("min-height", content + "px");

            JSV.resizeViewer();
        },

        showError: function(msg) {
            $("#popup-error .error-message").html(msg);
            $("#popup-error").popup("open");
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


            $("#file-upload, #textarea-json").fileReaderJS(opts);
            $("body").fileClipboard(opts);


            $("#button-validate").click(function() {
                var result = JSV.validate();

                if (result) {
                    JSV.showResult(result);
                }
                //console.info(result);
            });
        },

        validate: function() {
            var data;

            try {
                 data = $.parseJSON($('#textarea-json').val());
            } catch(e) {
                JSV.showError('Unable to parse JSON: <br/>' + e);
            }

            if (data) {
                var stop = $("#checkbox-stop").is(':checked'),
                    strict = $("#checkbox-strict").is(':checked'),
                    schema = tv4.getSchemaMap()[this.schema],
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

        showResult: function(result) {
            var cont = $("#validation-results"), ui;

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
        },

        buildValError: function(err, title) {
            var main = '<div data-role="collapsible" data-collapsed="true" data-mini="true">' +
                            '<h4>' + (title || 'Error: ') + err.message + '</h4>' +
                            '<ul><li>Message: '+ err.message + '</li>' +
                            '<li>Data Path: '+ err.dataPath + '</li>' +
                            '<li>Schema Path: '+ err.schemaPath + '</li></ul></div>';

           return $(main);
        },

        setInfo: function(node) {
            var schema = $('#info-tab-schema');
            //var pre = $('<pre><code class="language-json">' + JSON.stringify(tv4.getSchema(node.schema), null, '  ') + '</code></pre>');
            //var btn = $('<a href="#" class="ui-btn ui-mini ui-icon-action ui-btn-icon-right">Open in new window</a>').click(function() {
                //var w = window.open(null, "pre", null, true);

               // $(w.document.body).html(pre);
            //});
            var def = $('#info-tab-def');
            var ex = $('#info-tab-example');

            var height = ($('#info-panel').innerHeight() - $('#info-panel .ui-panel-inner').outerHeight() + $('#info-panel #info-tabs').height()) -
                $('#info-panel #info-tabs-navbar').height() - (schema.outerHeight(true) - schema.height());

            $.each([schema, def, ex], function(i, e){
                e.height(height);
            });

            $("#info-definition").html(node.description || 'No definition provided.');
            $("#info-type").html(node.displayType.toString());

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

                $("#info-translation").html(trans);
            } else {
                $("#info-translation").html('No translations available.');
            }


            this.createPre(schema, tv4.getSchema(node.schema), false, node.plainName);

            if(node.example) {
                $.getJSON(node.schema.match( /^(.*?)(?=[^\/]*\.json)/g ) + node.example, function(data) {
                    var pointer = node.example.split('#')[1];

                    if(pointer) {
                        data = jsonpointer.get(data, pointer);
                    }

                    JSV.createPre(ex, data);
                }).fail(function() {
                    ex.html('<h3>No example found.</h3>');
                });
            } else {
                ex.html('<h3>No example available.</h3>');
            }
        },

        createPre: function(el, obj, title, exp) {
            var pre = $('<pre><code class="language-json">' + JSON.stringify(obj, null, '  ') + '</code></pre>');
            var btn = $('<a href="#" class="ui-btn ui-mini ui-icon-action ui-btn-icon-right">Open in new window</a>').click(function() {
                var w = window.open("", "pre", null, true);

                $(w.document.body).html($('<div>').append(pre.clone().height('95%')).html());
                hljs.highlightBlock($(w.document.body).children('pre')[0]);
                $(w.document.body).append('<link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.1/styles/default.min.css">');
                w.document.title = title || 'JSON Schema Viewer';
            });

            el.html(btn);

            if(exp) {
                pre.highlight(exp, 'highlight');
            }
            el.append(pre);
            //setTimeout(function(){hljs.highlightBlock(pre[0]);},1000);
            //Prism.highlightElement(pre.children('code')[0]);
            pre.height(el.height() - btn.outerHeight(true) - (pre.outerHeight(true) - pre.height()));
        },

        compilePath: function(node, path) {
            var p;

            if(node.parent) {
                p = path ? node.name + ' > ' + path : node.name;
                return this.compilePath(node.parent, p);
            } else {
                p = path ? node.name + ' > ' + path : node.name;
            }

            return p;
        },

        /*
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
                    this.visit(children[i], visitFn, childrenFn);
                }
            }
        },

        /*
         * Create schema tree
         */
        compileData: function (schema, parent, name, real) {
            var key, node = {},
                s = schema.$ref ? tv4.getSchema(schema.$ref) : schema,
                props = s.properties,
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

            node.description = schema.description || s.description;
            node.name = (schema.$ref && real ? name : false) || s.title || name || 'schema';
            node.plainName = name;
            node.type = s.type;
            node.displayType = s.type || (s['enum'] ? 'enum: ' + s['enum'].join(', ') : s.items ? 'array' : s.properties ? 'object' : 'ambiguous');
            node.translation = schema.translation || s.translation;
            node.example = schema.example || s.example;
            node.opacity = real ? 1 : 0.5;
            node.required = s.required;
            node.schema = s.id || schema.$ref || parentSchema(parent);
            node.parentSchema = parent;
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
                this.treeData = node;
            }

            if(node.type === 'array') {
                node.name += '[' + (s.minItems || ' ') + ']';
                node.minItems = s.minItems;
            }

            if(node.type === 'object' && node.name !== 'item') {
                node.name += '{ }';
            }

            if(props || items || all) {
                node.children = [];
            }

            for (key in props) {
                if (owns.call(props, key)) {
                    //console.log(key, "=", props[key]);
                    this.compileData(props[key],  node, key, true);
                }
            }

            for (key in all) {
                if (owns.call(all, key)) {
                    //console.log(key, "=", all[key]);
                    if(all[key]) {
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

                        all[key].forEach(function(itm){
                            var s = itm.$ref ? tv4.getSchema(itm.$ref) : itm;

                            JSV.compileData(itm, allNode, s.title || key);
                        });

                    }
                }
            }

            if (Object.prototype.toString.call(items) === "[object Object]") {
                this.compileData(items, node, 'item');
            } else if (Object.prototype.toString.call(items) === "[object Array]") {

                items.forEach(function(itm, idx, arr) {
                    this.compileData(itm, node, idx.toString());
                });
            }

        },

        /*
         * Resize the diagram
         */
        resizeViewer: function() {
            this.viewerWidth = $("#main-body").width();
            this.viewerHeight = $("#main-body").height();
            if(this.focusNode) {
                this.centerNode(this.focusNode);
            }
        },

        /*
         * Reset the tree starting from the passed source.
         */
        resetTree: function (source, level) {
            this.visit(source, function(d) {
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

        /*
         * Reset and center the tree.
         */
        resetViewer: function () {
            //Firefox will choke if the viewer-page is not visible
            //TODO: fix on refactor to use pagecontainer event
            var page = $("#viewer-page");

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
            page.css('display', "");

            JSV.centerNode(root, 4);
        },

        /*
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
                .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            zl.scale(scale);
            zl.translate([x, y]);
        },

                // Helper functions for collapsing and expanding nodes.

                collapse: function (d) {
                    if (d.children) {
                        d._children = d.children;
                        //d._children.forEach(collapse);
                        d.children = null;
                    }
                },

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

                // Toggle children function

                toggleChildren: function (d) {
                    if (d.children) {
                        JSV.collapse(d);
                    } else if (d._children) {
                        JSV.expand(d);
                    }
                    return d;
                },

                // Toggle children on click.

                click: function (d) {
                    if(!JSV.labels[d.name]) {
                        if (d3.event.defaultPrevented) return; // click suppressed
                        d = JSV.toggleChildren(d);
                        JSV.update(d);
                        JSV.centerNode(d);
                    }
                },

                // Show info on click.

               clickTitle: function (d) {
                    if(!JSV.labels[d.name]) {
                        if (d3.event.defaultPrevented) return; // click suppressed
                        var panel = $( "#info-panel" );

                        if(JSV.focusNode) {
                            d3.select('#n-' + JSV.focusNode.id).classed('focus',false);
                        }
                        JSV.focusNode = d;
                        JSV.centerNode(d);
                        d3.select('#n-' + d.id).classed('focus',true);
                        $("#schema-path").html(JSV.compilePath(d));

                        $("#info-title").text("Info: " + d.name);
                        JSV.setInfo(d);
                        panel.panel( "open" );
                    }
                },


        /*
         * Zoom the tree
         */
        zoom: function () {
            this.svgGroup.attr("transform", "translate(" + this.zoomListener.translate() + ")" + "scale(" + this.zoomListener.scale() + ")");
        },

        /*
         * Perform the d3 zoom based on position and scale
         */
        interpolateZoom: function  (translate, scale) {
            return d3.transition().duration(350).tween("zoom", function () {
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

        /*
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
            direction = (JSV.id === 'zoom_in') ? 1 : -1;
            target_zoom = zl.scale() * (1 + factor * direction);

            if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

            translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
            view.k = target_zoom;
            l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

            view.x += center[0] - l[0];
            view.y += center[1] - l[1];

            JSV.interpolateZoom([view.x, view.y], view.k);
        },

        /*
         * The zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
         */
        zoomListener: null,

        /*
         * Sort the tree according to the node names
         */
        sortTree: function () {
            tree.sort(function(a, b) {
                return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
            });
        },

        /*
         * The d3 diagonal projection for use by the node paths.
         */
        diagonal1: function(d) {
            var src = d.source,
                node = d3.select("#n-" + (src.id))[0][0],
                dia,
                width = 0 ;

            if(node) {
                width = node.getBBox().width;
            }

            dia = "M" + (src.y + width) + "," + src.x +
                "H" + (d.target.y - 30) + "V" + d.target.x +
                //+ (d.target.children ? "" : "h" + 30);
                ("h" + 30);

           return dia;
        },

        update: function (source) {
            var i = 0;
            var duration = this.duration;
            var root = this.treeData;
            // Compute the new height, function counts total children of root node and sets tree height accordingly.
            // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
            // This makes the layout more consistent.
            var levelWidth = [1];
            var childCount = function(level, n) {

                if (n.children && n.children.length > 0) {
                    if (levelWidth.length <= level + 1) levelWidth.push(0);

                    levelWidth[level + 1] += n.children.length;
                    n.children.forEach(function(d) {
                        childCount(level + 1, d);
                    });
                }
            };
            childCount(0, root);
            var newHeight = d3.max(levelWidth) * 45; // 25 pixels per line
            this.tree = this.tree.size([newHeight, this.viewerWidth]);

            // Compute the new tree layout.
            var nodes = this.tree.nodes(root).reverse(),
                links = this.tree.links(nodes);

            // Set widths between levels based on maxLabelLength.
            nodes.forEach(function(d) {
                d.y = (d.depth * (JSV.maxLabelLength * 8)); //maxLabelLength * 8px
                // alternatively to keep a fixed scale one can set a fixed depth per level
                // Normalize for fixed-depth by commenting out below line
                // d.y = (d.depth * 500); //500px per level.
            });
            // Update the nodes…
            var node = this.svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id || (d.id = ++i);
                });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
                //.call(dragListener)
                .attr("class", function(d) {
                    return JSV.labels[d.name] ? "node label" : "node";
                })
                .attr("id", function(d, i) {
    //console.info(arguments);
                    return "n-" + d.id;
                })
                .attr("transform", function(d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                });

            nodeEnter.append("circle")
                //.attr('class', "nodeCircle")
                .attr("r", 0)
                .classed("collapsed", function(d) {
                    return d._children ? true : false;
                })
                .on('click', JSV.click);

            nodeEnter.append("text")
                .attr("x", function(d) {
                    return 10;
    //                return d.children || d._children ? -10 : 10;
                })
                .attr("dy", ".35em")
                .attr('class', function(d) {
                    return (d.children || d._children) ? 'node-text node-branch' : 'node-text';
                })
                .classed("abstract", function(d) {
                    return d.opacity < 1;
                })
                .attr("text-anchor", function(d) {
                    //return d.children || d._children ? "end" : "start";
                    return "start";
                })
                .text(function(d) {
                    return d.name + (d.require ? '*' : '');
                })
                .style("fill-opacity", 0)
                .on('click', JSV.clickTitle);


            // Change the circle fill depending on whether it has children and is collapsed
            node.select(".node circle")
                .attr("r", 6.5)
                .classed("collapsed", function(d) {
                    return (d._children ? true : false);
                });

            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });

            // Fade the text in
            nodeUpdate.select("text")
                .style("fill-opacity", function(d) {
                    return d.opacity || 1;
                });

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + source.y + "," + source.x + ")";
                })
                .remove();

            nodeExit.select("circle")
                .attr("r", 0);

            nodeExit.select("text")
                .style("fill-opacity", 0);

            // Update the links…
            var link = this.svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                });

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {
                        x: source.x0,
                        y: source.y0
                    };

                    //console.info(d3.select("#n-"+d.source.id)[0][0].getBBox());

                    return JSV.diagonal1({
                        source: o,
                        target: o
                    });
                });

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", JSV.diagonal1);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
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
         * TODO: Refactor this method to support refreshing diagram, window resize, etc.
         */
        createDiagram: function() {
            tv4.addAllAsync(this.schema, function() {

                JSV.compileData(tv4.getSchema(JSV.schema),false,'schema');

                // Calculate total nodes, max label length
                var totalNodes = 0;
                // panning variables
                //var panSpeed = 200;
                //var panBoundary = 20; // Within 20px from edges will pan when dragging.
                // Misc. variables
                var focusNode = JSV.focusNode; //the currently focused node

                // size of the diagram
                var viewerWidth = JSV.viewerWidth;
                var viewerHeight = JSV.viewerHeight;

                JSV.baseSvg = d3.select("#main-body").append("svg")
                    .attr("id", "jsv-tree")
                    .attr("class", "overlay")
                    .attr("width", viewerWidth)
                    .attr("height", viewerHeight);

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
                //sortTree();


                JSV.svgGroup = JSV.baseSvg.append("g")
                    .attr("id", "node-group");

                JSV.zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", JSV.zoom);

                //attach zoom listener
                JSV.baseSvg.call(JSV.zoomListener);

                // Layout the tree initially and center on the root node.
                JSV.resetViewer();

                JSV.centerNode(JSV.treeData, 4);

                // define the legend svg, attaching a class for styling
                var legendData = [{
                    text: "Expanded",
                    y: 20
                }, {
                    text: "Collapsed",
                    iconCls: "collapsed",
                    y: 40
                }, {
                    text: "Selected",
                    itemCls: "focus",
                    y: 60
                },{
                    text: "Required*",
                    y: 80
                },{
                    text: "Object{ }",
                    iconCls: "collapsed",
                    y: 100
                },{
                    text: "Array[minimum #]",
                    iconCls: "collapsed",
                    y: 120
                },{
                    text: "Abstract Property",
                    itemCls: "abstract",
                    y: 140,
                    opacity: 0.5
                }];


                var legendSvg = d3.select("#legend-items").append("svg")
                    //.attr("width", viewerWidth)
                    .attr("height", 160);

                // Update the nodes…
                var legendItem = legendSvg.selectAll("g.item-group")
                    .data(legendData)
                    .enter()
                    .append("g")
                    .attr("class", function(d) {
                        var cls = "item-group ";

                        cls += d.itemCls || '';
                        return cls;
                    })
                    .attr("transform", function(d) {
                        return "translate(10, " + d.y + ")";
                    });

                legendItem.append("circle")
                    .attr("r", 6.5)
                    .attr("class", function(d) {
                        return d.iconCls;
                    });

                legendItem.append("text")
                    .attr("x", 15)
                    .attr("dy", ".35em")
                    .attr("class", "item-text")
                    .attr("text-anchor", "start")
                    .style("fill-opacity", function(d) {
                        return d.opacity || 1;
                    })
                    .text(function(d) {
                        return d.text;
                    });

                $("#loading").fadeOut("slow");

            });
        }
    };
}

(function($) {

    JSV.init({
        schema: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")+1) + 'adiwg-json-schemas/schema/schema.json',
        title: 'ADIwg mdJSON Schema Viewer'
    });

})(jQuery);
