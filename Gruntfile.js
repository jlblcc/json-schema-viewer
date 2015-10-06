/* jslint es3: false */
/* global module:false, console:false, process:false */

/**
 * Grunt module.
 * @module grunt
 */
module.exports = function(grunt) {

    'use strict';

    grunt.initConfig({

        /*----------------------------------( PACKAGE )----------------------------------*/

        /**
         * @member {config} pkg
         * The `package.json` file belongs in the root directory of your project,
         * next to the `Gruntfile`, and should be committed with your project
         * source. Running `npm install` in the same folder as a `package.json`
         * file will install the correct version of each dependency listed therein.
         *
         * Install project dependencies with `npm install` (or `npm update`).
         *
         * @see http://gruntjs.com/getting-started#package.json
         * @see https://npmjs.org/doc/json.html
         * @see http://package.json.nodejitsu.com/
         * @see http://stackoverflow.com/a/10065754/922323
         */

        pkg : grunt.file.readJSON('package.json'),

        /*----------------------------------( BANNERS )----------------------------------*/

        /**
         * @member {config} banner
         * Short and long banners.
         *
         * @see http://gruntjs.com/getting-started#an-example-gruntfile
         */

        banner : {

            'short' : '/*! ' +
                      '<%= pkg.title || pkg.name %>' +
                      '<%= pkg.version ? " v" + pkg.version : "" %>' +
                      '<%= pkg.licenses ? " | " + _.pluck(pkg.licenses, "type").join(", ") : "" %>' +
                      ' - For included libraries, see source for additional licensing info.' +
                      '<%= pkg.homepage ? " | " + pkg.homepage : "" %>' +
                      ' */',

            'long' : '/**\n' +
                     ' * <%= pkg.title || pkg.name %>\n' +
                     '<%= pkg.description ? " * " + pkg.description + "\\n" : "" %>' +
                     ' *\n' +
                     '<%= pkg.author.name ? " * @author " + pkg.author.name + "\\n" : "" %>' +
                     '<%= pkg.author.url ? " * @link " + pkg.author.url + "\\n" : "" %>' +
                     '<%= pkg.homepage ? " * @docs " + pkg.homepage + "\\n" : "" %>' +
                     //' * @copyright Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>.\n' +
                     '<%= pkg.licenses ? " * @license Released under the " + _.pluck(pkg.licenses, "type").join(", ") + ".\\n" : "" %>' +
                     '<%= pkg.version ? " * @version " + pkg.version + "\\n" : "" %>' +
                     ' * @date <%= grunt.template.today("yyyy/mm/dd") %>\n' +
                     ' */\n\n',

        },

        /*----------------------------------( VERSIONING )----------------------------------*/

        /**
         * @member {config} now
         * Build date. Formats: <i>yyyymmdd</i> or <i>yyyymmddhhMMss</i>
         *
         * @see http://tanepiper.com/blog/2012/11/25/building-and-testing-javascript-with-gruntjs/
         * @see http://blog.stevenlevithan.com/archives/date-time-format
         */

        now : grunt.template.today('yyyymmdd'), // Alternative: yyyymmddhhMMss

        /**
         * @member {config} ver
         * Build version. Increment if more than one build is needed in a single
         * day.
         *
         * @see http://tanepiper.com/blog/2012/11/25/building-and-testing-javascript-with-gruntjs/
         * @see http://blog.stevenlevithan.com/archives/date-time-format
         */

        ver : 1,

        /*----------------------------------( BOWER )----------------------------------*/

        /**
         *
         * Install Bower packages. Smartly.
         *
         * Use this task to update dependencies defined in `bower.json`.
         *
         * @see https://github.com/yatskevich/grunt-bower-task
         * @see http://bower.io/
         */

        /*bower : {

            install : {

                options : {

                    targetDir : './lib', // A directory where you want to keep your Bower packages.
                    cleanTargetDir: false,
                    cleanBowerDir: false,
                    layout : 'byComponent',        // Folder structure type.
                    verbose : true,                // Debug output.

                },

            },

        },*/

        /*----------------------------------( WATCH )----------------------------------*/

        /**
         * @member {task} watch
         * Run predefined tasks whenever watched file patterns are added, changed
         * or deleted.
         *
         * @see https://github.com/gruntjs/grunt-contrib-watch
         */

        watch : {

            files : [

                '<%= jshint.init %>',
                './json-schema-viewer.js',
                './lib/**/*',
                './lib/*',
                './templates/**/*',
                './styles/sass/**/*',
                './images/**/*',

            ],

            tasks : ['default'],

        },

        /*----------------------------------( JSHINT )----------------------------------*/

        /**
         * @member {task} jshint
         * Validate files with JSHint.
         *
         * @see https://github.com/gruntjs/grunt-contrib-jshint
         * @see http://www.jshint.com/docs/
         */

        jshint : {

            options : {

                jshintrc : '.jshintrc', // Defined options and globals.

            },

            init : [

                './Gruntfile.js',
                './json-schema-viewer.js',
                './lib/translator.js',
                './lib/tv4.async-load-jquery.js',

            ],

        },

        /*----------------------------------( ENV )----------------------------------*/

        /**
         * @member {task} env
         * Grunt task to automate environment configuration for future tasks.
         *
         * @see https://github.com/onehealth/grunt-env
         */

        env : {

            dev : {

                NODE_ENV : 'DEVELOPMENT',

            },

            prod : {

                NODE_ENV : 'PRODUCTION',

            },

        },

        /*----------------------------------( CLEAN )----------------------------------*/

        /**
         * @member {task} clean
         * Clean files and folders.
         *
         * @see https://github.com/gruntjs/grunt-contrib-clean
         */

        clean : {

            options : {

                force : true, // Allows for deletion of folders outside current working dir (CWD). Use with caution.

            },

            prod : [

                './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/**/*',

            ],

            doc : [

                './jsdoc/**/*',

            ],

        },

        /*----------------------------------( UGLIFY )----------------------------------*/

        /**
         * @member {task} uglify
         * Minify files with UglifyJS.
         *
         * @see https://github.com/gruntjs/grunt-contrib-uglify
         * @see http://lisperator.net/uglifyjs/
         */

        uglify : {

            prod : {

                options : {

                    banner : '<%= banner.short %>',

                },

                files : {

                    './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/<%= pkg.name %>.min.js' : [
                        //'./files/scripts/jquery.js',
                        //'./files/scripts/jquery.*.js',
                        './bower_components/uri.js/src/URI.js',
                        //'./bower_components/uri.js/jquery.URI.js',
                        './bower_components/tv4/tv4.js',
                        './lib/tv4.async-load-jquery.js',
                        './bower_components/jquery.scrollTo/jquery.scrollTo.js',
                        './bower_components/d3/d3.js',
                        './bower_components/filereader.js/filereader.js',
                        './bower_components/jsonpointer.js/src/jsonpointer.js',
                        './bower_components/highlightjs/highlight.pack.js',
                        './<%= pkg.name %>.js',
                        './lib/example.js',

                    ],
                    './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/lib/preinit.js' : [
                        './lib/preinit.js',

                    ],

                },

            },

        },

        /*----------------------------------( SASS )----------------------------------*/

        /**
         * @member {task} sass
         * Compile Sass to CSS.
         *
         * @see https://github.com/gruntjs/grunt-contrib-sass
         * @see http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#output_style
         */

        sass : {

            options : {

                noCache : true,  // Don't cache to sassc files.
                precision : 14, // How many digits of precision to use when outputting decimal numbers.
                //sourcemap : 'none', // Generate CSS source maps?

            },

            dev : {

                options : {

                    //banner : '<%= banner.long %>', TODO:this is no longer valid use https://github.com/mattstyles/grunt-banner
                    style : 'expanded', // Output style. Can be nested, compact, compressed, expanded.

                },

                files : {

                    './styles/<%= pkg.name %>.css' : './styles/sass/<%= pkg.name %>.scss',
                    //'../dev/styles/development.css' : './files/styles/development.scss',

                },

            },

            prod : {

                options : {

                    //banner : '<%= banner.short %>', see above
                    style : 'compressed',

                },

                files : {

                    './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/styles/<%= pkg.name %>.min.css' : './styles/sass/<%= pkg.name %>.scss',

                },

            },

        },

        /*----------------------------------( PREPROCESS )----------------------------------*/

        /**
         * @member {task} preprocess
         * Grunt task around preprocess npm module.
         *
         * @see https://github.com/onehealth/grunt-preprocess
         * @see https://github.com/onehealth/preprocess
         * @see http://gruntjs.com/configuring-tasks#building-the-files-object-dynamically
         */

        preprocess : {

            options : {

                context : {

                    title : '<%= pkg.title %>',
                    description : '<%= pkg.description %>',
                    name : '<%= pkg.name %>',
                    version : '<%= pkg.version %>',
                    homepage : '<%= pkg.homepage %>',
                    production : '<%= pkg.production %>',
                    now : '<%= now %>',
                    ver : '<%= ver %>',

                },

            },

            dev : {

                files: [

                    {

                        src : './templates/index.html',
                        dest : './dev.html',

                    },

                    {

                        src : './templates/basic.html',
                        dest : './basic.html',

                    },

                    {

                        src : './templates/latest.html',
                        dest : './index.html',

                    },

                ],

            },

            prod : {

                files: [

                    {

                        src : './templates/index.html',
                        dest : './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/index.html',

                    },

                    {

                        src : './templates/latest.html',
                        dest : './prod/index.html',

                    },

                    {

                        src : './templates/basic.html',
                        dest : './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/basic.html',

                    },

                ],

            },

        },

        /*----------------------------------( COPY )----------------------------------*/

        /**
         * @member {task} copy
         * Copy files and folders.
         *
         * @see https://github.com/gruntjs/grunt-contrib-copy
         * @see http://gruntjs.com/configuring-tasks#globbing-patterns
         */


        copy : {

            prod : {

                files : [

                    {

                        expand : true,
                        cwd : './',
                        src : [
                            'images/**/*',
                            '!images/junk/**',
                        ],
                        dest : './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/',

                    },
                    {

                        expand : true,
                        cwd : './bower_components/mdjson-schemas/',
                        src : [
                            '**/*.json',
                            '!*bower.json',
                        ],
                        dest : './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/schemas',

                    },
                    {

                        expand : true,
                        cwd : './jsdoc/',
                        src : [
                            '**/*',
                        ],
                        dest : './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/docs',

                    }

                ],

            },

        },

      /**
       * @member {task} gh-pages
       * Deploy to GitHub Pages.
       *
       * @see https://github.com/tschaub/grunt-gh-pages
       */

      'gh-pages' : {
        options: {
          base: './prod/<%= pkg.version %>/<%= now %>/<%= ver %>/'
        },
        src: ['**/*']
      },

      /**
       * @member {task} jsdoc
       * Build docs.
       *
       * @see https://github.com/krampstudio/grunt-jsdoc
       */

      jsdoc : {
          dist : {
              src: ['<%= pkg.name %>.js', 'README.md', 'Gruntfile.js'],
              options: {
                  destination: 'jsdoc',
                  verbose: true,
                  //template : "./node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
                  //configure : "node_modules/grunt-jsdoc/node_modules/ink-docstrap/template/jsdoc.conf.json",
              }
          }
      },

      /**
       * @member {task} connect
       * Start a static web server. Use <code>grunt connect:server:keepalive</code>
       * for a persistent server instance. Default port is <b>9001</b>.
       *
       * @see https://github.com/gruntjs/grunt-contrib-connect
       */

      connect: {
        server: {
          options: {
            port: 9001
          }
        }
      },
    });

    /*----------------------------------( TASKS )----------------------------------*/

    //grunt.loadNpmTasks('grunt-bower-task');

    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.loadNpmTasks('grunt-env');

    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-sass');

    grunt.loadNpmTasks('grunt-preprocess');

    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.loadNpmTasks('grunt-gh-pages');

    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.loadNpmTasks('grunt-contrib-connect');
    //----------------------------------

    /**
     * @see https://github.com/onehealth/grunt-preprocess/issues/7
     * @see https://github.com/onehealth/grunt-env/issues/4
     */

    grunt.registerTask('printenv', function () { console.log(process.env); });

    //----------------------------------

    /**
     * @member {task} init
     * Used to initialize other tasks(e.g. dev, prod).
     */
    grunt.registerTask('init', ['jshint',]);
    /**
     * @member {task} dev
     * Build development.
     */
    grunt.registerTask('dev', ['init', 'env:dev', 'sass:dev', 'preprocess:dev',]);
    /**
     * @member {task} prod
     * Build production.
     */
    grunt.registerTask('prod', ['init', 'dev', 'env:prod', 'doc', 'clean:prod', 'sass:prod', 'uglify:prod', 'preprocess:prod', 'copy:prod',]);
    /**
     * @member {task} doc
     * Build jsdocs.
     */
    grunt.registerTask('doc', ['clean:doc', 'jsdoc',]);
    grunt.registerTask('default', ['dev',]);

};