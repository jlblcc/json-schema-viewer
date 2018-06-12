JSON Schema Viewer [![Build Status](https://travis-ci.org/jlblcc/json-schema-viewer.svg?branch=master)](https://travis-ci.org/jlblcc/json-schema-viewer)
==================

JavaScript tool for visualizing [json-schemas](http://json-schema.org/),
includes validator.

Fair warning, the code "just works" - it could use a good refactoring. Pull
requests welcome. The JSV was built to support a
[specific use case](https://github.com/adiwg/mdTools), so support for JSON
schema(draft v4) keywords are added on an as-needed basis. You may also
notice a few extensions to the spec, e.g. example, translation, version,
deprecated, etc.

The [demo](http://jlblcc.github.io/json-schema-viewer/) is rendering the
[mdJson-schemas](https://github.com/adiwg/mdJson-schemas).
There's also a [basic example](http://jlblcc.github.io/json-schema-viewer/basic.html)
without the jQuery Mobile interface elements.

JSDocs are [here](http://jlblcc.github.io/json-schema-viewer/docs)

Built using:
 - [d3js](http://d3js.org/)
 - [jQUery](http://jquery.com/)
 - [jQUery Mobile](http://jquerymobile.com/)
 - [tv4](http://geraintluff.github.io/tv4/)
 - [FileReader.js](http://bgrins.github.io/filereader.js/)
 - [highlight.js](https://highlightjs.org/)
 - [jsonpointer.js](https://github.com/alexeykuzmin/jsonpointer.js)
 - [Grunt HTML Boiler](https://github.com/mhulse/grunt-html-boiler)
 - [URI.js](https://github.com/medialize/URI.js)

## Installation

 1. Clone repository: `git clone https://github.com/jlblcc/json-schema-viewer.git`
 2. Enter project directory: `cd json-schema-viewer`
 3. Install dependencies
    a. via Bower: `bower install`
    b. via NPM: `npm install`
 5. Build project via Grunt: `grunt`
    - `grunt dev`:  Development build. This will create dev.html and basic.html
    in the project root(these files are .gitignored). This build will load all
    unminified js files individually.
    - `grunt prod`: Production build. This will create a production version at
    *./prod/<%= pkg.version %>/<%= now %>/<%= ver %>*. The production version
    includes concatenated and minified js/css. Note: jQuery/JQuery Mobile are
    **not** included in the js builds. The *prod* directory is also .gitignored.
 6. Serve with your favorite web server:
    - Use `grunt connect:server:keepalive` to start a basic server at http://localhost:9001
    - [example basic nginx config](https://gist.github.com/foxxyz/0b978dcea9b95f94aa3e)
    - Python: `python -m SimpleHTTPServer 9001`
    - php 5.4+: `php -S localhost:9001`

## Use in Browser
```js
          (function($) {

            var loc = window.location;
            //if not already set, set the root schema location
            //this allows dev ENV to override the schema location
            var schema = JSV.schema ? JSV.schema : loc.origin + loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1) + 'schemas/schema/schema.json';

            JSV.init({
              schema : schema,
              plain : true, //don't use JQM
              viewerHeight : $('#main-body').height(), //set initial dimensions of SVG
              viewerWidth : $('#main-body').width()
            }, function() {
              $('#jsv-tree').css('width', '100%');
              //set diagram width to 100%, this DOES NOT resize the svg container
              //it will not adjust to window resize, needs a listener to support that
              JSV.resetViewer();
              $('#loading').fadeOut('slow');
            });
          })(jQuery);
```

The `JSV.schema` property must be set to the url of your schema.

Example: http://jlblcc.github.io/json-schema-viewer/basic.html

##Development

Edit the [templates](https://github.com/jlblcc/json-schema-viewer/tree/master/templates)
to modify layout:

 - index.html: jQuery Mobile interface. Copied to /dev.html on
 `grunt dev`.
 - basic.html: a basic example without jQuery Mobile or Sass dependency(css
 included in `<head>`).
 - latest.html: redirects to the last production build. Copied to /index.html on
 `grunt prod`.

##Grunt

See [Gruntfile.js] (https://github.com/jlblcc/json-schema-viewer/blob/master/Gruntfile.js) or
the [JSDocs](http://jlblcc.github.io/json-schema-viewer/docs/module-grunt.html)
for details on the available Grunt tasks. `grunt --help` will also list available
tasks.


This project was inspired by [robschmuecker’s block #7880033](http://bl.ocks.org/robschmuecker/7880033).
