// Get JSON data
var treeData;

tv4.addAllAsync('adiwg-json-schemas/schema/schema.json', function(schemas) {
    //var treeData;

    //create schema tree
    function compileData(schema, parent, name, real) {
        var key, obj, prop, node = {},
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
        node.name = s.title || name || 'schema';
        node.type = s.type;
        node.opacity = real ? 1 : 0.5;
        node.required = s.required;
        node.schema = s.id || schema.$ref || parent.schema;
        node.require = parent && parent.required ? parent.required.indexOf(node.name) > -1 : false;

        if (parent) {
            if (node.name === 'item') {
                node.parent = parent;
            } else if (parent.name === 'item') {
                parent.parent.children.push(node);
            } else {
                parent.children.push(node);
            }
        } else {
            treeData = node;
        }

        if(node.type === 'array') {
            node.name += '[ ]';
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

                    all[key].forEach(function(itm,idx, arr){
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

    compileData(tv4.getSchema('adiwg-json-schemas/schema/schema.json'),false,'schema');

    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // variables for drag/drop
    //var selectedNode = null;
    //var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.
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
    });
    $("#info-panel").on("panelclose", function() {
        resizeViewer();
    });

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal1 = function(d, i) {
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
    visit(treeData, function(d) {
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
        var self = this;
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

    d3.selectAll('#zoom-controls>a').on('click', zoomClick);

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
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source, ratio) {
        r = ratio ? ratio : 2;
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / r;
        y = y * scale + viewerHeight / r;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
        focusNode = source;
    }

    // Toggle children function

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }

    // Show info on click.

    function clickTitle(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        var panel = $( "#info-panel" );
//console.info(arguments);
        panel.panel( "open" );
        $("#info-title").text("Info: " + d.name);

        centerNode(d);
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
            d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
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
            .attr("class", "node")
            .attr("id", function(d, i) {
//console.info(arguments);
                return "n-" + d.id;
            })
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            });

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .on('click', click);

        nodeEnter.append("text")
            .attr("x", function(d) {
                return 10;
//                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', function(d) {
                return d.children || d._children ? 'nodeText nodeBranch' : 'nodeText';
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
        node.select("circle.nodeCircle")
            .attr("r", 6.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
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

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");
    // Define the root
    root = treeData;
    root.x0 = viewerHeight / 2;
    root.y0 = 0;


    // Layout the tree initially and center on the root node.
    //update(root);
    // Call visit function to set initial depth
    tree.nodes(root);
    visit(root, function(d) {
//console.info(d.depth);
        if (d.children && d.children.length > 0 && d.depth > 1) {
            d._children = d.children;
            d.children = null;
        }
    }, function(d) {
        if(d.children && d.children.length > 0) {
            return d.children;
        } else if(d._children && d._children.length > 0) {
            return d._children;
        } else {
          return null;
        }
    });

    update(root);

    centerNode(root, 4);
//console.info(root);
    //d3.select("#loading").attr("style", "display:none;");
    $("#loading").fadeOut("slow");

});