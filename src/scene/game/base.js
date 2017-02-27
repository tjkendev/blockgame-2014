// scene/game/base.js

var GameMap = require('./game_map.js');

module.exports = (function() {

  // ゲーム情報
  var plnum, GameObject;
  var sx, sy;
  var prev_key = new Array(256);

  var counter = 0;
  var fpause = false;


  var BLOCK_SIZE = {x: 25, y: 25};
  var d = [{x: -1, y:  0},{x:  0, y: -1},{x:  1, y:  0},{x:  0, y:  1}, {x: 0, y: 0}];

  var GAME_MODE = {ready: -1, play: 0, dead: 1, clear: 2};
  var fade = 0, fframe = 0;
  var next_scene, s_options;
  // スコアを通常表示するまでの時間
  var judge_showscore = 120;

  //var BLOCK_COLOR = {none: null, red: '#f00', green: '#0f0', blue: '#00f', orange: '#e70', aqua: '#ee0', pink: '#e07'};
  var REV_COLOR = {none: -1, '#f00': 0, '#0f0': 1, '#00f': 2, '#e70': 3, '#ee0': 4, '#e07': 5};
  var chainColor = [
    ['#77f', '#55f'],
    ['#7dd', '#6bb'],
    ['#2f2', '#6f6'],
    ['#ff0', '#ffa'],
    ['#ffa500', '#cc3'],
    ['#f22', '#f00']
  ];
    var chainChange = 3;

    //var fsize = 20;

    // 画像の読み込み
    var gimg = new Image(); gimg.src = "./img/obj.png";
    var bimg = new Image(); bimg.src = "./img/op5.png";
    var stimg = new Image(); stimg.src = "./img/stback.png";

    var highscore;
    var $el;

    // ブロック描画関数
    var renderBlock = function(context, p, x, y, bcolor, brate, mrate) {
      context.beginPath();
      var gobj = GameObject[p];
      // 一番上と一番下のブロックは別ケース
      if(y==-1) {
        var rate = brate - mrate;
        if(rate<0) {
          context.drawImage(gimg, BLOCK_SIZE.x*bcolor, BLOCK_SIZE.y*(2+rate),
              BLOCK_SIZE.x, BLOCK_SIZE.y*(-rate),
              gobj.renderX + BLOCK_SIZE.x*x, gobj.renderY,
              BLOCK_SIZE.x, BLOCK_SIZE.y*(-rate));
        }
      }else if(y==0) {
        var rate = brate - mrate;
        context.drawImage(gimg, BLOCK_SIZE.x*bcolor, BLOCK_SIZE.y*(rate >= 0 ? 1 + rate : 1),
            BLOCK_SIZE.x, BLOCK_SIZE.y*(rate >= 0 ? 1-rate : 1),
            gobj.renderX + BLOCK_SIZE.x*x, (rate>=0 ? gobj.renderY : gobj.renderY - BLOCK_SIZE.y*rate),
            BLOCK_SIZE.x, BLOCK_SIZE.y*(rate >= 0 ? 1-rate : 1));
      }else if(y==sy-1) {
        context.drawImage(gimg, BLOCK_SIZE.x*bcolor, BLOCK_SIZE.y,
            BLOCK_SIZE.x, BLOCK_SIZE.y*brate,
            gobj.renderX + BLOCK_SIZE.x*x, gobj.renderY + BLOCK_SIZE.y*(y - brate),
            BLOCK_SIZE.x, BLOCK_SIZE.y*brate);
      }else {
        context.drawImage(gimg, BLOCK_SIZE.x*bcolor, BLOCK_SIZE.y,
            BLOCK_SIZE.x, BLOCK_SIZE.y,
            gobj.renderX + BLOCK_SIZE.x*x,
            gobj.renderY + BLOCK_SIZE.y*(y - brate + mrate),
            BLOCK_SIZE.x, BLOCK_SIZE.y);
      }
      context.fill();
    }

    function SceneGame() {
      this.wh_now = 0;
      this.wh_stride = 0.125;
    }

    SceneGame.prototype = {
      init: function(options) {
        fade = 0; fframe = 0; fpause = false;
        ///console.log(options);
        sx = Number(options.x) || 5;
        sy = Number(options.y) || 10;
        plnum = Number(options.player) || 1;
        GameObject = [];
        for(var i=0; i<plnum; ++i) {
          GameObject.push({
            renderX: 100, // ステージの描画座標X
            renderY: 100, // ステージの描画座標Y
            fallntime: 0, // 落下時間
            judgetime: 0, // 判定時間
            chanum: 0,    // 判定時のチェイン数
            mode: GAME_MODE.ready,  // ゲームモード
            frame: 0,     // フレーム
            gmap: new GameMap({
              x: sx, y: sy,
              blocknum_stroke: options.bstroke,
              max_stage: options.max_stage,
              max_blocknum: options.max_blocknum,
            }),
          });
        }
        this.wh_now = 0;
        // ハイスコアはLocalStorageから
        highscore = Number(localStorage.getItem("TestGame_HighScore"));
      },
      render: function(context) {
        var fsize = 20;
        context.globalAlpha = 1.0;
        context.fillStyle = "#000";
        context.fillRect(0, 0, 640, 480);
        context.drawImage(bimg, 0, 0);
        context.font = ""+fsize+"px sans-serif";

        context.lineWidth = 3;

        //ppp = [];
        // 各オブジェクトを描画する
        for(var p=0; p<plnum; ++p) {
          var gobj = GameObject[p];
          var di = gobj.gmap.moveDir();

          // ステージ背景を描画
          context.beginPath();
          context.drawImage(stimg, 0, 0, BLOCK_SIZE.x*sx, BLOCK_SIZE.y*sy,
              gobj.renderX, gobj.renderY, BLOCK_SIZE.x*sx, BLOCK_SIZE.y*(sy-1));
          context.fill();
          // ブロックなどの描画
          var brate = gobj.gmap.getBlockUpRate();
          for(var i=0; i<sy; ++i) {
            for(var j=0; j<sx; ++j) {
              if(gobj.gmap.exist(j, i)) {
                // プレイヤーの座標の描画はスキップする
                if(gobj.gmap.getPlayerPos().x === j &&
                    gobj.gmap.getPlayerPos().y === i) {
                  continue;
                }
                // プレイヤーと入れ替わる時のブロック
                if (gobj.gmap.isMove() &&
                    gobj.gmap.getPlayerPos().x - d[di].x === j &&
                    gobj.gmap.getPlayerPos().y - d[di].y === i) {
                  // 一番上に死にに行く時がコーナーケース
                  if(i === 1 && di === 1) {
                    renderBlock(context, p, j, 0, REV_COLOR[gobj.gmap.getBlock(j, i).color], brate, gobj.gmap.moveRate());
                  }else {
                    // それ以外は方向に応じて移動してる感じに描画
                    context.beginPath();
                    context.drawImage(gimg, BLOCK_SIZE.x*REV_COLOR[gobj.gmap.getBlock(j, i).color], BLOCK_SIZE.y,
                        BLOCK_SIZE.x, BLOCK_SIZE.y,
                        gobj.renderX + BLOCK_SIZE.x*(j + d[di].x * (1-gobj.gmap.moveRate())),
                        gobj.renderY + BLOCK_SIZE.y*((i - brate) + d[di].y * (1-gobj.gmap.moveRate())),
                        BLOCK_SIZE.x, BLOCK_SIZE.y);
                    context.fill();
                  }
                  continue;
                }
                // 通常描画
                renderBlock(context, p, j, i, REV_COLOR[gobj.gmap.getBlock(j, i).color], brate, 0.0);
              }
            }
          }
          context.beginPath();
          context.globalAlpha = 0.6;
          context.fillStyle = '#000';
          context.fillRect(
              gobj.renderX,
              gobj.renderY + BLOCK_SIZE.y*(sy-1-brate),
              BLOCK_SIZE.x*sx, BLOCK_SIZE.y*brate);
          context.fill();
          context.globalAlpha = 1.0;
          for(var i=0; i<gobj.gmap.getFallBlockNum(); ++i) {
            var fb = gobj.gmap.getFallBlock(i);
            if(fb.y < -1 || sy <= fb.y) continue;
            if(fb.x === gobj.gmap.getPlayerPos().x &&
                fb.y === gobj.gmap.getPlayerPos().y)
              continue;
            renderBlock(context, p, fb.x, fb.y, REV_COLOR[fb.color], brate, gobj.gmap.moveRate());
          }
          context.stroke();

          context.beginPath();
          // プレイヤーの描画
          var rx, ry;
          rx = gobj.renderX + BLOCK_SIZE.x * gobj.gmap.getPlayerPos().x;// + BLOCK_SIZE.x/2;
          ry = gobj.renderY + BLOCK_SIZE.y * (gobj.gmap.getPlayerPos().y - brate);// + BLOCK_SIZE.y/2;
          //var di = gobj.gmap.moveDir();
          if((gobj.gmap.isMove() || gobj.gmap.isFall()) && di<4) {
            rx += d[di].x * (gobj.gmap.moveRate() * BLOCK_SIZE.x - BLOCK_SIZE.x);
            ry += d[di].y * (gobj.gmap.moveRate() * BLOCK_SIZE.y - BLOCK_SIZE.y);
          }else if(gobj.gmap.isPlayerFalling() && di<4) {
            ry += d[di].y * (gobj.gmap.moveRate() * BLOCK_SIZE.y);
          }
          var pip = 0;
          if(gobj.gmap.isTouch()) {
            //var di = gobj.gmap.getTouchDir();
            pip = BLOCK_SIZE.x*(gobj.gmap.getTouchDir() + 1);
          }
          if(gobj.gmap.getPlayerPos().y === 0) {
            context.drawImage(gimg, pip, BLOCK_SIZE.y*brate, BLOCK_SIZE.x, BLOCK_SIZE.y*(1-brate), rx, gobj.renderY, BLOCK_SIZE.x, BLOCK_SIZE.y*(1-brate));
          } else {
            context.drawImage(gimg, pip, 0, BLOCK_SIZE.x, BLOCK_SIZE.y, rx, ry, BLOCK_SIZE.x, BLOCK_SIZE.y);
          }
          context.fill();

          // 水面描画
          var wh = gobj.gmap.getWaterHeight();
          if(this.wh_now !== wh) {
            if(this.wh_now < wh) {
              this.wh_now += this.wh_stride;
            }else {
              this.wh_now -= this.wh_stride;
            }
          }
          context.beginPath();
          context.fillStyle = '#0ff';
          context.globalAlpha = 0.4;
          context.moveTo(gobj.renderX + 0, gobj.renderY + BLOCK_SIZE.y*(sy - 1 - this.wh_now - 1/2));
          for(var i=0; i<sx; ++i) {
            if(i%2==1) {
              context.quadraticCurveTo(
                  gobj.renderX + BLOCK_SIZE.x*(i + 1/2) + 0.8*Math.cos(((2*i+1)%7)*counter / 1000.0),
                  gobj.renderY + BLOCK_SIZE.y*(sy - 1 - this.wh_now - 0.8 + 0.1*Math.sin(((2*i+1)%7)*counter / 100.0)),
                  gobj.renderX + BLOCK_SIZE.x*(i + 1),
                  gobj.renderY + BLOCK_SIZE.y*(sy - 1- this.wh_now - 1/2));
            }else {
              context.quadraticCurveTo(
                  gobj.renderX + BLOCK_SIZE.x*(i + 1/2) + 0.8*Math.cos((((i+1)%7)*counter) / 1000.0),
                  gobj.renderY + BLOCK_SIZE.y*(sy - 1 - this.wh_now - 0.2 - 0.1*Math.sin(((i+1)%7)*counter/ 100.0)),
                  gobj.renderX + BLOCK_SIZE.x*(i + 1),
                  gobj.renderY + BLOCK_SIZE.y*(sy - 1 - this.wh_now - 1/2));
            }
          }
          context.lineTo(gobj.renderX + BLOCK_SIZE.x*sx, gobj.renderY + BLOCK_SIZE.y*(sy-1)); // 底面2点
          context.lineTo(gobj.renderX + 0, gobj.renderY + BLOCK_SIZE.y*(sy-1));
          context.fill();
          context.globalAlpha = 1.0;

          // 上部刺描画
          context.beginPath();
          context.fillStyle = '#e8ffff';
          for(var i=0; i<2*sx; ++i) {
            context.moveTo(gobj.renderX + BLOCK_SIZE.x*(i/2), gobj.renderY);
            context.lineTo(gobj.renderX + BLOCK_SIZE.x*((i+1/2)/2), gobj.renderY);
            context.lineTo(gobj.renderX + BLOCK_SIZE.x*((i+1/2)/2), gobj.renderY + BLOCK_SIZE.y*(2/3));
          }
          context.fill();
          context.beginPath();
          context.fillStyle = '#e8f9ff';
          for(var i=0; i<2*sx; ++i) {
            context.moveTo(gobj.renderX + BLOCK_SIZE.x*((i+1)/2), gobj.renderY);
            context.lineTo(gobj.renderX + BLOCK_SIZE.x*((i+1/2)/2), gobj.renderY);
            context.lineTo(gobj.renderX + BLOCK_SIZE.x*((i+1/2)/2), gobj.renderY + BLOCK_SIZE.y*(2/3));
          }
          context.fill();

          // 外枠描画
          context.beginPath();
          context.strokeStyle = '#fff';
          context.rect(gobj.renderX, gobj.renderY,
              BLOCK_SIZE.x*sx, BLOCK_SIZE.y*(sy - 1));
          context.stroke();

          // 体力メータ描画
          context.beginPath();
          context.fillStyle = '#000';
          context.fillRect(gobj.renderX, gobj.renderY + BLOCK_SIZE.y*(sy - 1)+4,
              BLOCK_SIZE.x*sx, 10);
          context.fill();
          context.beginPath();
          context.fillStyle = '#188bff';
          context.fillRect(gobj.renderX, gobj.renderY + BLOCK_SIZE.y*(sy - 1)+4,
              BLOCK_SIZE.x*sx*gobj.gmap.getHPRate(), 10);
          context.fill();
          context.strokeStyle = '#05a';
          context.rect(gobj.renderX, gobj.renderY + BLOCK_SIZE.y*(sy - 1)+4,
              BLOCK_SIZE.x*sx, 10);
          context.stroke();

          // テキスト表示
          context.beginPath();
          context.fillStyle = '#448bff';
          context.fillRect(gobj.renderX-30, gobj.renderY-70,
              250, 60);
          context.fillRect(gobj.renderX+240, gobj.renderY-40,
              250, 30);
          context.fill();
          context.strokeStyle = '#fff';
          context.rect(gobj.renderX-30, gobj.renderY-70,
              250, 60);
          context.rect(gobj.renderX+240, gobj.renderY-40,
              250, 30);
          context.stroke();
          context.beginPath();
          context.font = ""+fsize+"px bold sans-serif";
          context.fillStyle = '#000';
          context.globalAlpha = 1.0;
          context.fillText("Level : "+(gobj.gmap.getStage() + gobj.gmap.getProgress()) +
              (gobj.gmap.getMaxStage()>=0 ? " / " + gobj.gmap.getMaxStage() : ""),
              gobj.renderX-15, gobj.renderY-65 +fsize);
          context.fillText("Score : "+gobj.gmap.getScore(),
              gobj.renderX-15, gobj.renderY-40 +fsize);
          context.fillText("Highscore : " +highscore,
              gobj.renderX+ 255, gobj.renderY - 38 +fsize);
          context.fill();
          if(gobj.gmap.isJudgement()) {
            if(gobj.chanum !== gobj.gmap.getChainNum()) {
              gobj.judgetime = 0;
              gobj.chanum = gobj.gmap.getChainNum();
            }
            var color = parseInt(gobj.gmap.getChainNum() / chainChange);
            if(color >= chainColor.length) color = chainColor.length-1;
            fsize = 48;
            context.beginPath();
            context.font = ""+fsize+"px bold sans-serif";
            context.textBaseline = 'top';
            context.lineWidth = 2.0;
            //context.fillStyle = chainColor[color][0];//[(counter%10)>5 ? 1 : 0];
            context.strokeStyle = '#000';
            context.fillStyle = '#ccf';
            context.globalAlpha = 1.0;
            context.strokeText("+"+gobj.gmap.getGettingScore()+"",
                gobj.renderX + 150, gobj.renderY + 120);
            context.fillText("+"+gobj.gmap.getGettingScore()+"",
                gobj.renderX + 150, gobj.renderY + 120);
            fsize = 36;
            context.font = ""+fsize+"px bold sans-serif";
            context.strokeText(""+gobj.gmap.getChainNum()+"chain",
                gobj.renderX + 170, gobj.renderY + 120 + 48);
            context.fillText(""+gobj.gmap.getChainNum()+"chain",
                gobj.renderX + 170, gobj.renderY + 120 + 48);
            context.stroke();
            context.fill();
            context.textBaseline = 'alphabetic';
          }

          // modeごとの処理
          switch(gobj.mode) {
            case GAME_MODE.ready:
              var f = gobj.frame;
              var fsize = 60;
              context.beginPath();
              context.font = ""+fsize+"px bold sans-serif";
              context.globalAlpha = 1.0;
              context.fillStyle = '#f00';
              if(60 < f && f < 90) {
                context.fillText("Ready?", gobj.renderX +130, 210 + 270*(90-f)/30 +fsize);
              }
              if(90 <= f && f < 150) {
                context.fillText("Ready?", gobj.renderX +130, 210 +fsize);
              }
              if(150 <= f && f < 180) {
                context.fillText("Go!!", gobj.renderX +160, 210 +fsize);
              }
              if(180 <= f) {
                gobj.mode = GAME_MODE.play;
                gobj.frame = 0;
              }
              context.fill();
              if(gobj.frame < 1000) ++gobj.frame;
              break;
            case GAME_MODE.dead:
              context.beginPath();
              context.globalAlpha = (gobj.frame < 60 ? gobj.frame/90 : 2/3);
              context.fillStyle = '#000';
              context.fillRect(gobj.renderX, gobj.renderY, BLOCK_SIZE.x*sx, BLOCK_SIZE.y*(sy-1));
              context.fill();
              if(gobj.frame > 120) {
                var fsize = 40;
                context.font = ""+fsize+"px bold sans-serif";
                context.beginPath();
                context.globalAlpha = 1.0;
                context.fillStyle = '#f00';
                context.fillText("ゲームオーバー", gobj.renderX +100, gobj.renderY +50 +fsize);
                context.fillText("スコア : "+gobj.gmap.getScore(), gobj.renderX +100, gobj.renderY +150 +fsize);
                context.fill();
                fsize = 30;
                context.font = ""+fsize+"px sans-serif";
                context.fillText("Press Enter Key", gobj.renderX +100, gobj.renderY +250 +fsize);
              }
              if(gobj.frame < 1000) ++gobj.frame;
              break;
            case GAME_MODE.clear:
              context.beginPath();
              context.globalAlpha = (gobj.frame < 60 ? gobj.frame/90 : 2/3);
              context.fillStyle = '#fff';
              context.fillRect(gobj.renderX, gobj.renderY, BLOCK_SIZE.x*sx, BLOCK_SIZE.y*(sy-1));
              context.fill();
              if(gobj.frame > 120) {
                var fsize = 40;
                context.font = ""+fsize+"px bold sans-serif";
                context.beginPath();
                context.globalAlpha = 1.0;
                context.fillStyle = '#f00';
                context.fillText("ゲームクリア", gobj.renderX +100, gobj.renderY +50 +fsize);
                context.fillText("スコア : "+gobj.gmap.getScore(), gobj.renderX +100, gobj.renderY +150 +fsize);
                context.fill();
                fsize = 30;
                context.font = ""+fsize+"px sans-serif";
                context.fillText("Press Enter Key", gobj.renderX +100, gobj.renderY +250 +fsize);
              }
              if(gobj.frame < 1000) ++gobj.frame;
              break;
            default:
              break;
          }

          // フェードなどの描画
          if(fade>=0) {
            context.beginPath();
            context.fillStyle = '#000';
            if(fade==0) {
              context.globalAlpha = (60 - fframe)/60;
            }else {
              context.globalAlpha = fframe/60;
            }
            context.fillRect(0, 0, 640, 480);
            context.fill();
            ++fframe;
            if(fframe>60) fade = -1;
          }
        }

        // ポーズ時の画面
        if(fpause) {
          context.beginPath();
          context.fillStyle = '#fff';
          context.globalAlpha = 0.5;
          context.fillRect(0, 0, 640, 480);
          context.fill();
          context.beginPath();
          context.globalAlpha = 1.0;
          context.font = "60px bold sans-serif";
          context.fillStyle = '#000';
          context.fillText("Pause", 320-75, 260 + 5*Math.sin(counter/30));
          context.fill();
        }


        ++counter;
      },
      move: function(mus, key) {
        switch(GameObject[0].mode) {
          case GAME_MODE.play:
            // 十字キー操作
            if(key[37]) {
              // left
              GameObject[0].gmap.move(0);
            }else if(key[39]) {
              // right
              GameObject[0].gmap.move(2);
            } else if(key[38]) {
              // up
              GameObject[0].gmap.move(1);
            } else if(key[40]) {
              // down
              GameObject[0].gmap.move(3);
            }
            // キーボード操作
            else if(key[65] && !prev_key[65]) {
              // A
              GameObject[0].gmap.touch(0);
            } else if(key[68] && !prev_key[68]) {
              // D
              GameObject[0].gmap.touch(2);
            } else if(key[87] && !prev_key[87]) {
              // W
              GameObject[0].gmap.touch(1);
            } else if(key[83] && !prev_key[83]) {
              // S
              GameObject[0].gmap.touch(3);
            } else if(key[32]) {
              // SP
              GameObject[0].gmap.speedup(8);
            } else if(key[27] && !prev_key[27]) {
              // P(80) -> ESC(27)へ変更
              fpause = !fpause;
            }
            break;
          case GAME_MODE.dead:
            // 死亡時の処理
            if(key[13]) {
              //console.log("Enter");
              if(fade !== 1 && GameObject[0].frame > 120) {
                fade = 1; fframe = 0; next_scene = 'title'; s_options = {};
              }
            }
            // 何もしなかった時の自動遷移(工大祭用)
            //if(fade === 1 && GameObject[0].frame > 1000) {
            //  fade = 1; fframe = 0; next_scene = 'title'; s_options = {};
            //}
            break;
          case GAME_MODE.clear:
            // ゲームクリアした時の処理
            if(key[13]) {
              //console.log("Enter");
              if(fade !== 1 && GameObject[0].frame > 120) {
                fade = 1; fframe = 0; next_scene = 'title'; s_options = {};
              }
            }
            // 何もしなかった時の自動遷移(工大祭用)
            //if(fade === 1 && GameObject[0].frame > 1000) {
            //  fade = 1; fframe = 0; next_scene = 'title'; s_options = {};
            //}
            break;
          default:
            // その他の処理
            break;
        }
        // ESC Keyでタイトル画面へ
        //if(key[27]) {
        //  //console.log("Esc");
        //  this.setScene('title', {});
        //}
        if(!fpause) {
          for(var i=0; i<plnum; ++i) {
            if(GameObject[i].mode !== GAME_MODE.ready &&
                GameObject[i].mode !== GAME_MODE.clear) GameObject[i].gmap.update();
            if(GameObject[i].mode === GAME_MODE.play && GameObject[i].gmap.isDead()) {
              GameObject[i].mode = GAME_MODE.dead;
              GameObject[i].frame = 0;
            }
            if(GameObject[i].mode === GAME_MODE.play &&
                GameObject[i].gmap.getStage() === GameObject[i].gmap.getMaxStage()) {
              GameObject[i].mode = GAME_MODE.clear;
              GameObject[i].frame = 0;
            }
          }
        }
        // その他シーン移動
        if(fade == 1 && fframe == 60) {
          // ゲームクリア時にしようと思ったけど死んでもスコア反映するか
          //if(GameObject[0].mode === GAME_MODE.clear) {
          if(GameObject[0].gmap.getScore() > highscore) {
            // LocalStorageに保存しよう
            localStorage.setItem("TestGame_HighScore", String(GameObject[0].gmap.getScore()));
          }
          //}
          this.setScene(next_scene, s_options);
        }
        for(var i=0; i<key.length; ++i) prev_key[i] = key[i];
      },
    }

    return SceneGame;
})();
