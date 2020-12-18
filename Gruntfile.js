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
          })
        )
      },
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
      tasks: ['webpack'],
    },
  });

  // grunt contribute
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-image');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // grunt webpack
  grunt.loadNpmTasks('grunt-webpack');

  // Default tasks
  grunt.registerTask('default', ['webpack', 'image']);
};
