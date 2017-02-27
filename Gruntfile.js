var path = require('path');
var webpack = require('webpack');

module.exports = function(grunt) {
  var webpackConfig = require('./webpack.config.js');
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    webpack: {
      options: webpackConfig,
      build: {
        plugins: webpackConfig.plugins.concat(
          new webpack.DefinePlugin({
            "process.env": {
              "NODE_ENV": JSON.stringify("production")
            }
          }),
          new webpack.optimize.DedupePlugin(),
          new webpack.optimize.UglifyJsPlugin()
        )
      },
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        mangle: true,
        //mangle: false,
        //beautify: true,
        compress: true,
        report: 'gzip',
      },
      build: {
        src: './public/js/<%= pkg.name %>.js',
        dest: './public/js/<%= pkg.name %>.min.js'
      }
    },
    image: {
      dynamic :{
        files: [{
          expand: true,
          cwd: 'image/',
          src: ['**/*.{png,jpg,gif}'],
          dest: 'public/img/'
        }]
      },
    },
    jshint: {
      files: ['./Gruntfile.js', './src/main.js', './src/**/*.js'],
      options: {
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        },
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['webpack', 'uglify'],
    },
  });

  // grunt contribute
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-image');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // grunt webpack
  grunt.loadNpmTasks('grunt-webpack');

  // Default tasks
  grunt.registerTask('default', ['webpack', 'uglify', 'image']);
};
