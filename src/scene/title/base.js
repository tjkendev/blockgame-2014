// scene/title/base.js
// title scene

module.exports = (function() {

  var px = null, py = null;
  var _px = null, _py = null;
  var select = 0;

  var fsize = 25, interval = 40, sty = 280, pad = 10;
  var counter = 0;
  var downkey = false;
  var options = [];

  var bimg = new Image();
  bimg.src = "./public/img/stback.png";
  var gpsimg = new Image();
  gpsimg.src = "./public/img/gps.png";

  var highscore;
  var $el;
  var smode = 0;

  options.push({name: "易しい", length: 6, scene: 'game', options: {x: 18, y: 14, bstroke: 3, max_stage: 4, max_blocknum: 4}});
  options.push({name: "難しい", length: 6, scene: 'game', options: {x: 18, y: 14, bstroke: 3, max_stage: 12, max_blocknum: 6}});
  options.push({name: "エンドレス", length: 10, fix_x: 8, scene: 'game', options: {x: 18, y: 14, bstroke: 4, max_stage: -1, max_blocknum: 6}});
  //options.push({name: "ランキング", length: 10, scene: 'ranking'});
  //options.push({name: "遊び方", length: 6, scene: 'howtoplay'});

  function SceneTitle() {
  }

  SceneTitle.prototype = {
    init: function(options) {
      if(options.select) select = parseInt(options.select);
      // ハイスコアはLocalStorageから
      highscore = Number(localStorage.getItem("TestGame_HighScore"));
    },
    render: function(context) {
      // background
      context.globalAlpha = 1.0;
      context.fillStyle = "rgb(0, 0, 0)";
      context.fillRect(0, 0, 640, 480);
      context.drawImage(bimg, 0, 0);
      context.globalAlpha = 0.1;
      context.drawImage(gpsimg, 0, 0, 490, 360, 0, 0, 640, 480);
      context.globalAlpha = 1.0;

      // render
      context.beginPath();
      context.strokeStyle = "rgb(255, 255, 255)";
      context.lineWidth = 4;
      context.font = "60px bold sans-serif";
      context.fillText("繋ぎ消しパズル", 130, 100+60);

      context.beginPath();
      context.font = ""+fsize+"px bold sans-serif";

      // 選択肢強調表示
      if(select != -1) {
        context.beginPath();
        context.fillStyle = "rgb(255, 255, 255)";
        context.globalAlpha = 0.4 + 0.2 * Math.sin(counter/80*Math.PI);
        //var ss = fsize*options[select].length/4;
        context.fillRect(50, sty+(fsize+interval)*select-pad, 540, fsize+pad*2);
        context.fill();
      }

      context.beginPath();
      context.globalAlpha = 0.8;
      context.fillStyle = '#000';
      context.fillText("上下キーで選択、Enterキーで決定", 140, 240);
      for(var i=0; i<options.length; ++i) {
        var fx = options[i].fix_x ? options[i].fix_x : 0;
        context.fillText(options[i].name,
            320-fsize*options[i].length/4 + fx, sty+(fsize+interval)*i + fsize);
      }
      context.fillText("Highscore "+highscore, 360, 20 + fsize);
      context.fill();

    },
    move: function(mus, key) {
      var _select = select;
      if(mus) {
        px = mus.x; py = mus.y;
        if(_px !== px || _py !== py) {
          smode = 1;
        }
        if(smode) {
          var pp = parseInt((py - sty + pad) / (fsize + interval));
          if(0 <= pp && pp < options.length) {
            var yy = (py - sty + pad) - (fsize + interval)*pp;
            if(0 <= yy && yy <= fsize+2*pad) {
              select = pp;
              if(mus.clk) {
                this.setScene(options[select].scene, options[select].options);
              }
            }
          }
        }
      }
      _px = px; _py = py;
      if(key[38]) {
        if(!downkey) {
          smode = 0;
          --select;
          if(select < 0) select = 0;
          downkey = true;
        }
      } else if(key[40]) {
        if(!downkey) {
          smode = 0;
          ++select;
          if(options.length <= select) select = options.length-1;
          downkey = true;
        }
      } else {
        downkey = false;
      }
      if(key[13]) {
        this.setScene(options[select].scene, options[select].options);
      }
      if(_select !== select) {
      }
      ++counter;
    },
  };

  return SceneTitle;
})();
