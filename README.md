JSON Schema Viewer
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
There's also a [basic example](http://jlblcc.github.io/json-schema-viewer/basic.html")
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
