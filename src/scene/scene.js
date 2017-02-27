// scene.js
// Scene Base
var req = require.context(".", true, /^\.\/[ -\[\]-~]*\/base.js$/);

module.exports = (function() {
  var context;

  // scene list
  var scenes = {};
  _.each(req.keys(), function(key) {
    var sname = key.match(/^\.\/([ -\[\]-~]*)\/base.js$/)[1];
    scenes[sname] = new (req(key))();
  });

  // initial scene
  var first_scene = 'title';

  // device info
  var mMus = {x: -1, y: -1, clk: false};
  var mKey = new Array(256);
  for(var i=0; i<mKey.length; ++i) mKey[i] = false;

  // scene
  var current_scene = first_scene, next_scene = first_scene;
  // scene options
  var s_options = {};
  // process flag
  var st_process = false;

  function SceneClass(canvas) {
    context = canvas.getContext('2d');

    // default font set
    context.font = "16px sans-serif";
  }

  SceneClass.prototype = {
    // scene setter/getter
    setScene: function(name, options) {
      next_scene = name;
      s_options = toString.call(options) === toString.call({}) ? options : {};
    },
    getScene: function() {
      return current_scene;
    },
    // シーン更新処理
    update: function() {
      if(next_scene != current_scene) {
        st_process = false;
        current_scene = next_scene;
        this.init();
      }
      return true;
    },

    // delegation function

    // before : ロード時に各シーンが行っておく処理
    before: function() {
      var i;
      for(var sname in scenes) {
        // setSceneで変えれるようにしておく
        scenes[sname].setScene = this.setScene;
        // getSceneも参照可に
        scenes[sname].getScene = this.getScene;
        // 自身のシーン名参照
        scenes[sname].name = sname;
        if(scenes[sname].before !== undefined) {
          scenes[sname].before();
          ++i;
        }
      }
      return i;
    },

    // init : 各シーンの初期化処理
    // scene's init => function(options)
    init: function() {
      var ret =  scenes[current_scene].init(s_options);
      st_process = true;
      return ret;
    },
    // render : 描画処理
    // scene's render => function(context)
    render: function() {
      if(!st_process) return true;
      if(context === null) return false;
      context.beginPath();
      var ret = scenes[current_scene].render(context);
      context.closePath();
      return ret;
    },
    // move : 移動処理
    // scene's move => function(mus, key)
    move: function() {
      if(!st_process) return true;
      return scenes[current_scene].move(mMus, mKey);
    },

    // interrupt function
    setPos: function(event) {
      var rect = event.target.getBoundingClientRect();
      mMus.x = event.clientX - rect.left;
      mMus.y = event.clientY - rect.top;
    },
    setClk: function(flag) {
      mMus.clk = flag;
    },
    setKey: function(event) {
      var code = event.keyCode;
      mKey[code] = true;
    },
    unsetKey: function(event) {
      var code = event.keyCode;
      mKey[code] = false;
    },
  };

  return SceneClass;
})();
