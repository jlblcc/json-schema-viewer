/**
 * JSV namespace.
 */
if (typeof JSV === "undefined") {
    var JSV = {};
}

(function($) {
    JSV = {
        /**
         * Initializes this object.
         */
        init: function() {
            //fix for IE
            if (!window.location.origin) {
              window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
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
        },
        /**
         * Schema to load
         */
        schema: window.location.origin + '/adiwg-json-schemas/schema/schema.json',

        contentHeight: function() {
            var screen = $.mobile.getScreenHeight();
            var header = $(".ui-header").hasClass("ui-header-fixed") ? $(".ui-header").outerHeight() - 1 : $(".ui-header").outerHeight();
            var footer = $(".ui-footer").hasClass("ui-footer-fixed") ? $(".ui-footer").outerHeight() - 1 : $(".ui-footer").outerHeight();
            var contentCurrent = $("#main-body.ui-content").outerHeight() - $("#main-body.ui-content").height();
            var content = screen - header - footer - contentCurrent;

            $("#main-body.ui-content").css("min-height", content + "px");
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
                        } catch(e) {
                            //JSV.showError('Unable to parse JSON: <br/>' + e);
                            JSV.showError('Failed to load ' + file.name + '. The file is not valid JSON. <br/>The error: <i>' + e + '</i>');
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
            try {
                var data = $.parseJSON($('#textarea-json').val());
            } catch(e) {
                JSV.showError('Unable to parse JSON: <br/>' + e);
            }

            if (data) {
                var stop = $("#checkbox-stop").is(':checked'),
                    strict = $("#checkbox-strict").is(':checked'),
                    schema = tv4.getSchemaMap()[this.schema], result,
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
            var cont = $("#validation-results");

            if(result.valid) {
                cont.html('<p class=ui-content>JSON is valid!</p>');
            } else {
                cont.html('<p class=ui-content>JSON is <b>NOT</b> valid!</p>');
            }
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

            $("#info-definition").html(node.description || 'No definition provided.');

            $.each([schema, def, ex], function(i, e){
                e.height(height);
            });

            this.createPre(schema, tv4.getSchema(node.schema));

            $.getJSON(node.schema.match( /^(.*?)\.json/g ) + '/../../../examples/full_example.json', function(data) {
                JSV.createPre(ex, data);
            }).fail(function() {
                ex.html('<h3>No example found.</h3>');
                //console.log("error");
            });


            //schema.html(btn);

            //schema.append(pre);
            //hljs.highlightBlock(pre[0]);
            //pre.height(height - btn.outerHeight(true) - (pre.outerHeight(true) - pre.height()));
        },

        createPre: function(el, obj, title) {
            ///../../../examples/full_example.json
            var pre = $('<pre><code class="language-json">' + JSON.stringify(obj, null, '  ') + '</code></pre>');
            var btn = $('<a href="#" class="ui-btn ui-mini ui-icon-action ui-btn-icon-right">Open in new window</a>').click(function() {
                var w = window.open(null, "pre", null, true);

                $(w.document.body).html(pre.clone().height('95%'));
                hljs.highlightBlock($(w.document.body).children('pre')[0]);
                $(w.document.body).append('<link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.1/styles/default.min.css">');
                w.document.title = title || 'JSON Schema Viewer';
            });

            el.html(btn);

            el.append(pre);
            //setTimeout(function(){hljs.highlightBlock(pre[0]);},1000);
            //Prism.highlightElement(pre.children('code')[0]);
            pre.height(el.height() - btn.outerHeight(true) - (pre.outerHeight(true) - pre.height()));
        },

        /**
         * TODO: Refactor this method to support refreshing diagram
         */
        createDiagram: function() {
            tv4.addAllAsync(JSV.schema, function() {

                var labels = {
                    allOf: true,
                    anyOf: true,
                    oneOf: true,
                    "object{ }": true
                };

                //create schema tree
                function compileData(schema, parent, name, real) {
                    var key, node = {},
                        s = schema.$ref ? tv4.getSchema(schema.$ref) : schema,
                        props = s.properties,
                        items = s.items,
                        owns = Object.prototype.hasOwnProperty,
                        all = {};


                    if (s.allOf) {
                        all.allOf = s.allOf;
                    }

                    if (s.oneOf) {
                        all.oneOf = s.oneOf;
                    }

                    if (s.anyOf) {
                        all.anyOf = s.anyOf;
                    }

                    node.description = s.description;
                    node.name = (schema.$ref && real ? name : false) || s.title || name || 'schema';
                    node.type = s.type;
                    node.opacity = real ? 1 : 0.5;
                    node.required = s.required;
                    node.schema = s.id || schema.$ref || parent.schema;
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

                    if(props || items || all) {
                        node.children = [];
                    }

                    for (key in props) {
                        if (owns.call(props, key)) {
                            //console.log(key, "=", props[key]);
                            compileData(props[key],  node, key, true);
                        }
                    }

                    for (key in all) {
                        if (owns.call(all, key)) {
                            //console.log(key, "=", all[key]);
                            if(all[key]) {
                                var allNode = {
                                    name: key,
                                    children: [],
                                    opacity: 0.5
                                };


                                if (node.name === 'item') {
                                    node.parent.children.push(allNode);
                                } else {
                                    node.children.push(allNode);
                                }

                                all[key].forEach(function(itm){
                                    compileData(itm, allNode, key);
                                });

                            }
                        }
                    }

                    if (Object.prototype.toString.call(items) === "[object Object]") {
                        compileData(items, node, 'item');
                    } else if (Object.prototype.toString.call(items) === "[object Array]") {

                        items.forEach(function(itm, idx, arr) {
                            compileData(itm, node, idx.toString());
                        });
                    }

                }

                compileData(tv4.getSchema(JSV.schema),false,'schema');

                // Calculate total nodes, max label length
                var totalNodes = 0;
                var maxLabelLength = 0;
                // variables for drag/drop
                //var selectedNode = null;
                //var draggingNode = null;
                // panning variables
                //var panSpeed = 200;
                //var panBoundary = 20; // Within 20px from edges will pan when dragging.
                // Misc. variables
                var i = 0;
                var duration = 750;
                var root;
                var focusNode; //the currently focused node

                // size of the diagram
                var viewerWidth = $("#main-body").width();
                var viewerHeight = $("#main-body").height();

                //reset size when open/close left panel, center diagram
                var resizeViewer = function() {
                    viewerWidth = $("#main-body").width();
                    viewerHeight = $("#main-body").height();
                    if(focusNode) {
                        centerNode(focusNode);
                    }
                };


                $("#info-panel").on("panelopen", function() {
                    resizeViewer();
                    if(focusNode) {
                        d3.select('#n-' + focusNode.id).classed('focus',true);
                    }
                });
                $("#info-panel").on("panelclose", function() {
                    resizeViewer();
                    if(focusNode) {d3.select('#n-' + focusNode.id).classed('focus',false);}
                });

                var tree = d3.layout.tree()
                    .size([viewerHeight, viewerWidth]);

                // define a d3 diagonal projection for use by the node paths later on.
                var diagonal1 = function(d) {
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

            //       console.info(node);
            //       console.info(src.id + ":" + width);
                   return dia;
            };

                // A recursive helper function for performing some setup by walking through all nodes

                function visit(parent, visitFn, childrenFn) {
                    if (!parent) return;

                    visitFn(parent);

                    var children = childrenFn(parent);
                    if (children) {
                        var count = children.length;
                        for (var i = 0; i < count; i++) {
                            visit(children[i], visitFn, childrenFn);
                        }
                    }
                }

                // Call visit function to establish maxLabelLength
                visit(JSV.treeData, function(d) {
                    totalNodes++;
                    maxLabelLength = Math.max(d.name.length, maxLabelLength);

                }, function(d) {
                    return d.children && d.children.length > 0 ? d.children : null;
                });

                // sort the tree according to the node names

                function sortTree() {
                    tree.sort(function(a, b) {
                        return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
                    });
                }
                // Sort the tree initially incase the JSON isn't in a sorted order.
                //sortTree();

                function resetTree(source, level) {
                    visit(source, function(d) {
                        if (d.children && d.children.length > 0 && d.depth > level && !labels[d.name]) {
                            collapse(d);
                            //d._children = d.children;
                            //d.children = null;
                        }else if(labels[d.name]){
                            expand(d);
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
                }

                /*// TODO: Pan function, can be better implemented.

                function pan(domNode, direction) {
                    var speed = panSpeed;
                    if (panTimer) {
                        clearTimeout(panTimer);
                        translateCoords = d3.transform(svgGroup.attr("transform"));
                        if (direction == 'left' || direction == 'right') {
                            translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                            translateY = translateCoords.translate[1];
                        } else if (direction == 'up' || direction == 'down') {
                            translateX = translateCoords.translate[0];
                            translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
                        }
                        scaleX = translateCoords.scale[0];
                        scaleY = translateCoords.scale[1];
                        scale = zoomListener.scale();
                        svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
                        d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
                        zoomListener.scale(zoomListener.scale());
                        zoomListener.translate([translateX, translateY]);
                        panTimer = setTimeout(function() {
                            pan(domNode, speed, direction);
                        }, 50);
                    }
                }*/

                // Define the zoom function for the zoomable tree

                /*function zoom() {
                    svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                }*/

                function zoomed() {
                    svgGroup.attr("transform",
                        "translate(" + zoomListener.translate() + ")" +
                        "scale(" + zoomListener.scale() + ")"
                    );
                }

                function interpolateZoom (translate, scale) {
                    return d3.transition().duration(350).tween("zoom", function () {
                        var iTranslate = d3.interpolate(zoomListener.translate(), translate),
                            iScale = d3.interpolate(zoomListener.scale(), scale);
                        return function (t) {
                            zoomListener
                                .scale(iScale(t))
                                .translate(iTranslate(t));
                            zoomed();
                        };
                    });
                }

                function zoomClick() {
                    var clicked = d3.event.target,
                        direction = 1,
                        factor = 0.2,
                        target_zoom = 1,
                        center = [viewerWidth / 2, viewerHeight / 2],
                        extent = zoomListener.scaleExtent(),
                        translate = zoomListener.translate(),
                        translate0 = [],
                        l = [],
                        view = {x: translate[0], y: translate[1], k: zoomListener.scale()};

                    d3.event.preventDefault();
                    direction = (this.id === 'zoom_in') ? 1 : -1;
                    target_zoom = zoomListener.scale() * (1 + factor * direction);

                    if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

                    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
                    view.k = target_zoom;
                    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

                    view.x += center[0] - l[0];
                    view.y += center[1] - l[1];

                    interpolateZoom([view.x, view.y], view.k);
                }

                function resetClick() {
                    // Define the root
                    root = JSV.treeData;
                    root.x0 = viewerHeight / 2;
                    root.y0 = 0;


                    // Layout the tree initially and center on the root node.
                    // Call visit function to set initial depth
                    tree.nodes(root);
                    resetTree(root, 1);
                    update(root);

                    //focusNode = root;
                    centerNode(root, 4);
                }

                d3.selectAll('#zoom-controls>a').on('click', zoomClick);
                d3.select('#tree-controls>a#reset-tree').on('click', resetClick);

                // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
                var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoomed);

                // define the baseSvg, attaching a class for styling and the zoomListener
                var baseSvg = d3.select("#main-body").append("svg")
                    .attr("width", viewerWidth)
                    .attr("height", viewerHeight)
                    .attr("class", "overlay")
                    .call(zoomListener);




                // Helper functions for collapsing and expanding nodes.

                function collapse(d) {
                    if (d.children) {
                        d._children = d.children;
                        //d._children.forEach(collapse);
                        d.children = null;
                    }
                }

                function expand(d) {
                    if (d._children) {
                        d.children = d._children;
                        //d.children.forEach(expand);
                        d._children = null;
                    }

                    if (d.children) {
                        var count = d.children.length, i;
                        for (i = 0; i < count; i++) {
                            if(labels[d.children[i].name]) {
                                expand(d.children[i]);
                            }
                        }
                    }
                }

                // Function to center node when clicked so node doesn't get lost when collapsing with large amount of children.

                function centerNode(source, ratioX) {
                    var rX = ratioX ? ratioX : 2,
                        scale = zoomListener.scale(),
                        x = -source.y0,
                        y = -source.x0,
                        x = x * scale + viewerWidth / rX,
                        y = y * scale + viewerHeight / 2;

                    d3.select('g#node-group').transition()
                        .duration(duration)
                        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
                    zoomListener.scale(scale);
                    zoomListener.translate([x, y]);
                    //d3.select('#n-' + focusNode.id).classed('focus',false);
                    //d3.select('#n-' + source.id).classed('focus',true);
                    //focusNode = source;
                }

                // Toggle children function

                function toggleChildren(d) {
                    if (d.children) {
                        collapse(d);
                    } else if (d._children) {
                        expand(d);
                    }
                    return d;
                }

                // Toggle children on click.

                function click(d) {
                    if(!labels[d.name]) {
                        if (d3.event.defaultPrevented) return; // click suppressed
                        d = toggleChildren(d);
                        update(d);
                        centerNode(d);
                    }
                }

                // Show info on click.

                function clickTitle(d) {
                    if(!labels[d.name]) {
                        if (d3.event.defaultPrevented) return; // click suppressed
                        var panel = $( "#info-panel" );

                        if(focusNode) {
                            d3.select('#n-' + focusNode.id).classed('focus',false);
                        }
                        focusNode = d;
                        centerNode(d);
                        d3.select('#n-' + d.id).classed('focus',true);

                        $("#info-title").text("Info: " + d.name);
                        JSV.setInfo(d);
                        panel.panel( "open" );
            //console.info(focusNode);
                    }
                }

                function update(source) {
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
                    tree = tree.size([newHeight, viewerWidth]);

                    // Compute the new tree layout.
                    var nodes = tree.nodes(root).reverse(),
                        links = tree.links(nodes);

                    // Set widths between levels based on maxLabelLength.
                    nodes.forEach(function(d) {
                        d.y = (d.depth * (maxLabelLength * 8)); //maxLabelLength * 8px
                        // alternatively to keep a fixed scale one can set a fixed depth per level
                        // Normalize for fixed-depth by commenting out below line
                        // d.y = (d.depth * 500); //500px per level.
                    });
                    // Update the nodes…
                    node = svgGroup.selectAll("g.node")
                        .data(nodes, function(d) {
                            return d.id || (d.id = ++i);
                        });

                    // Enter any new nodes at the parent's previous position.
                    var nodeEnter = node.enter().append("g")
                        //.call(dragListener)
                        .attr("class", function(d) {
                            return labels[d.name] ? "node label" : "node";
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
                        .on('click', click);

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
                        .on('click', clickTitle);

                    // phantom node to give us mouseover in a radius around it
                    /*nodeEnter.append("circle")
                        .attr('class', 'ghostCircle')
                        .attr("r", 5)
                        .attr("opacity", 0.7) // change this to zero to hide the target area
                    .style("fill", "red")
                        .attr('pointer-events', 'mouseover')
                        .on("mouseover", function(node) {
                            //overCircle(node);
                        })
                        .on("mouseout", function(node) {
                            //outCircle(node);
                        });*/

                    // Update the text to reflect whether node has children or not.
                    /*node.select('text')
                        .attr("x", function(d) {
                            return d.children || d._children ? -10 : 10;
                        })
                        .attr("text-anchor", function(d) {
                            return d.children || d._children ? "end" : "start";
                        })
                        .text(function(d) {
                            return d.name;
                        });*/

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
                    var link = svgGroup.selectAll("path.link")
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

                            return diagonal1({
                                source: o,
                                target: o
                            });
                        });

                    // Transition links to their new position.
                    link.transition()
                        .duration(duration)
                        .attr("d", diagonal1);

                    // Transition exiting nodes to the parent's new position.
                    link.exit().transition()
                        .duration(duration)
                        .attr("d", function(d) {
                            var o = {
                                x: source.x,
                                y: source.y
                            };
                            return diagonal1({
                                source: o,
                                target: o
                            });
                        })
                        .remove();

                    //hide circles for "labels"
                    /*node.select("circle.nodeCircle")
                        .style("display", function(d) {
                            return labels[d.name] ? "none" : null;
                        });*/

                    // Stash the old positions for transition.
                    nodes.forEach(function(d) {
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });
                }

                // Append a group which holds all nodes and which the zoom Listener can act upon.
                var svgGroup = baseSvg.append("g")
                    .attr("id", "node-group");

                // Layout the tree initially and center on the root node.
                resetClick();

                centerNode(root, 4);

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
                        return cls += d.itemCls || '';
                    })
                    .attr("transform", function(d) {
                        return "translate(10, " + d.y + ")";
                    });

                // Enter any new nodes at the parent's previous position.
                //var itemEnter = legendItem.enter();
                    /*.attr("transform", function(d) {
                        return "translate(" + source.y0 + "," + source.x0 + ")";
                    });*/

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

    JSV.init();

})(jQuery);
