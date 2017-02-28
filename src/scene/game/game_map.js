// javascript/scene/game/game_map.js
// ゲーム盤データ

module.exports = (function() {
  // enum ACTION_TYPE
  var ACTION_TYPE = {none: 0, move: 1, touch: 2, fall: 3, dead: 4};
  // enum BLOCK_STATUS_TYPE
  var BLOCK_STATUS_TYPE = {none: 'none', block: 'block', bother: 'bother', player: 'player'};
  var BLOCK_STATUS_TYPE_ARRAY = _.map(BLOCK_STATUS_TYPE, function(e){return e;});
  // enum BLOCK_COLOR
  var BLOCK_COLOR = {none: null, red: '#f00', green: '#0f0', blue: '#00f', orange: '#e70', aqua: '#ee0', pink: '#e07'};
  var BLOCK_COLOR_ARRAY = _.map(BLOCK_COLOR, function(e){return e;});
  // enum DIRECTION
  var DIRECTION = {none: 4, left: 0, up: 1, right: 2, down: 3};
  // direction
  var d = [{x: -1, y:  0}, {x:  0, y: -1}, {x:  1, y:  0}, {x:  0, y:  1}, {x: 0, y: 0}];

  function BlockNoneData(n) {
    var arr = new Array(n);
    for(var i=0; i<n; ++i) {
      arr[i] = {color: BLOCK_COLOR.none, status: BLOCK_STATUS_TYPE.none};
    }
    return arr;
  }

  // # of blocks erased
  var ERASE_BNUM = 4;

  // temporal variable
  var jmap = [];
  function jmapInit(sx, sy) {
    if(Number(sy)) {
      while(jmap.length < sy) {
        jmap.push(new Array(sx));
      }
    }
    for(var i=0; i<sy; ++i) {
      for(var j=0; j<sx; ++j) {
        jmap[i][j] = false;
      }
    }
  }

  // スコア単位
  var baseScore = 12;
  var setWaterUpTime = function(stage) {
    return 0;
  };
  var setBlockUpTime = function(stage) {
    var vv = 3*(100 - (stage-1)*5);
    return vv>80 ? vv : 80;
  };
  var setBlockColorNum = function(stage, stroke, max) {
    var col = 3 + parseInt(stage/stroke);
    return col <= max ? col : max;
  };

  function GameMap(options) {
    options = toString.call(options) === toString.call({}) ? options : {};
    // ゲームスコア
    this.score = 0;
    // 取得スコア
    this.getscore = 0;
    // 体力
    this.hpMax = 100.0;
    this.hp = this.hpMax;
    this.hp_mod = 0.1;
    // レベル
    this.stage = Number(options.stage) || 1;
    this.max_stage = Number(options.max_stage) || 10;
    // レベルアップライン
    this.lupline = Number(options.levelup) || 20;
    this.linecount = 0;
    // チェイン数
    this.chainNum = 0;
    this.prevchain = 0;
    // ステージサイズ
    this.sx = Number(options.x) || 5;
    this.sy = Number(options.y) || 10;
    // ブロックの種類が増えるレベルの間隔
    this.gamestroke = Number(options.blocknum_stroke) || 5;
    // ブロックの種類の最大数
    this.max_blocknum = Number(options.max_blocknum) || 6;
    // ステージの設定を行う
    this.setStageData();
    // 水の高さ
    this.waterHeight = 0;
    // ステージデータ
    this.gmap = [];
    this.init();
    this.fblock = [];
    this.checkblock = [];
    this.touchDir = DIRECTION.none;

    // その他プレイヤーデータ
    this.x = parseInt(this.sx/2);
    this.y = this.sy-3;
    this.gmap[this.y+(this.gmap.length-this.sy)][this.x].status = BLOCK_STATUS_TYPE.player;
    this.direct = DIRECTION.none;
    this.action = ACTION_TYPE.none;
    this.next_action = ACTION_TYPE.none;
    this.defmtime = Number(options.movetime) || 6;
    this.movetime = this.defmtime;
    // ブロック消去中フラグ
    this.judgement = false;
    this.pfall = false; this.prev_pfall = false;
    this.bfall = false;
  }

  GameMap.prototype = {
    // 初期化処理
    init: function() {
      this.gmap = [];
      for(var i=0; i<this.sy; ++i) {
        this.gmap.push(BlockNoneData(this.sx));
      }
      // 下段にブロック用意
      this.addline(); this.addline();
    },
    setStageData: function() {
      // 水上昇時間
      this.wat_t = setWaterUpTime(this.stage);
      this.wtrest = this.wat_t;
      // ブロック上昇
      this.btime = setBlockUpTime(this.stage);
      this.btrest = this.btime;
      // ブロック色
      this.bcol = setBlockColorNum(this.stage, this.gamestroke, this.max_blocknum);
    },
    // 最下段にブロック列を追加
    addline: function(inCount) {
      var arr = new Array(this.sx);
      for(var i=0; i<this.sx; ++i) {
        var rand = Math.floor(Math.random() * this.bcol)+1;
        arr[i] = {color: BLOCK_COLOR_ARRAY[rand], status: BLOCK_STATUS_TYPE.block};
      }
      this.gmap.push(arr);
      this.y -= 1;
      if(inCount && (this.stage < this.max_stage || this.max_stage<0)) {
        ++this.linecount;
        // レベルアップ
        if(this.linecount === this.lupline) {
          this.linecount = 0;
          ++this.stage;
          this.setStageData();
        }
      }
    },
    //
    isEmptyLine: function(l) {
      var ret = 0;
      var arr = this.gmap[l];
      for(var i=0; i<this.sx; ++i) {
        if(arr[i].status === BLOCK_STATUS_TYPE.none) ++ret;
      }
      return ret;
    },
    // 空列のブロック行を削除する
    eraseEmptyblockLine: function() {
      var canl=this.gmap.length-this.sy;
      for(var i=0; i<canl; ++i) {
        if(this.isEmptyLine(0)) {
          this.gmap.shift();
        }else {
          break;
        }
      }
    },
    // 移動処理(引数はNumber(0~3))
    move: function(di) {
      if(di!==0 && !parseInt(di)) return false;
      if(this.action !== ACTION_TYPE.none || this.judgement ||
          !this.inPlayer(this.x + d[di].x, this.y + d[di].y)) return false;
      // 上に移動する場合は、上にブロックが存在しなければならない
      if(di == 1 && !this.exist(this.x + d[di].x, this.y + d[di].y)) return false;
      this.next_action = ACTION_TYPE.move;
      this.direct = di;
      return true;
    },
    // 消去処理(引数はNumber(0~3))
    touch: function(di) {
      if(di!==0 && !parseInt(di)) return false;
      if(this.action !== ACTION_TYPE.none || this.judgement ||
          !this.inPlayer(this.x + d[di].x, this.y + d[di].y)) return false;
      this.next_action = ACTION_TYPE.touch;
      this.direct = di;
      return true;
    },
    // 上昇速度を加速させる
    speedup: function(sp) {
      if(this.action !== ACTION_TYPE.none || this.judgement) return false;
      this.btrest -= sp;
      return true;
    },
    // プレイヤー座標を取得
    getPlayerPos: function() {
      return {x: this.x, y: this.y};
    },
    // (x, y)にデータを設定する
    setBlock: function(x, y, options) {
      var ny = this.gmap.length - this.sy + y;
      // 色
      if(options.color !== undefined && _.include(BLOCK_COLOR, options.color)) {
        this.gmap[ny][x].color = BLOCK_COLOR[options.color];
      }
      // 色(生値)
      if(options.color_raw !== undefined && _.include(BLOCK_COLOR_ARRAY, options.color_raw)) {
        this.gmap[ny][x].color = options.color_raw;
      }
      // マスの状態
      if(options.status !== undefined && _.include(BLOCK_STATUS_TYPE, options.status)) {
        this.gmap[ny][x].status = BLOCK_STATUS_TYPE[options.status];
      }
      // マスの状態(生値)
      if(options.status_raw !== undefined && _.include(BLOCK_STATUS_TYPE_ARRAY, options.status_raw)) {
        this.gmap[ny][x].status = options.status_raw;
      }
    },
    // (x, y)に存在するブロックの情報を取得
    getBlock: function(x, y) {
      if(!this.inRange(x, y)) return null;
      return this.gmap[this.gmap.length - this.sy + y][x];
    },
    // 落下中のブロック数を取得
    getFallBlockNum: function() {
      return this.fblock.length;
    },
    // 落下中のブロックの情報を取得
    getFallBlock: function(i) {
      if(this.fblock.length <= i) return null;
      return {x: this.fblock[i].x,
              y: this.fblock[i].y - (this.gmap.length - this.sy),
              status: this.fblock[i].status,
              color: this.fblock[i].color};
    },
    getHP: function() { return this.hp; },
    getMaxHP: function() { return this.hpMax; },
    getHPRate: function() { return this.hp / this.hpMax; },
    getBlockUpRate: function() { return (this.btime - this.btrest) / this.btime; },
    getScore: function() { return this.score; },
    getChainNum: function() { return this.chainNum; },
    getGettingScore: function() {return this.getscore;},
    getStage: function() { return this.stage; },
    getMaxStage: function() { return this.max_stage; },
    getProgress: function() { return this.linecount / this.lupline; },
    getWaterHeight: function() { return this.waterHeight; },
    // プレイヤーの影響できる範囲か判定
    inPlayer: function(x, y) {
      return (0 <= x) && (x < this.sx) && (0 <= y) && (y < this.sy-1);
    },
    // ゲーム盤内か判定
    inRange: function(x, y) {
      return (0 <= x) && (x <= this.sx) && (0 <= y) && (y < this.sy);
    },
    // ブロックが存在するか判定
    exist: function(x, y) {
      //return this.inRange(x, y) &&
      //  this.gmap[y][x].status !== BLOCK_STATUS_TYPE.none;
      //var ny = this.gmap.length - this.sy + y;
      return this.inRange(x, y) &&
        !_.include([BLOCK_STATUS_TYPE.none, BLOCK_STATUS_TYPE.player], this.getBlock(x, y).status);
    },
    // 行動終了までの時間
    untilMove: function() {
      return this.movetime;
    },
    // 同色の幅優先探索
    bfs: function(nx, ny, jmap_initialize) {
      var pl = [];
      var queue = [{x: nx, y: ny}];
      var color = this.gmap[ny][nx].color;
      // jmap : 探索済みかを保持する
      if(jmap_initialize) jmapInit(this.sx, this.gmap.length);
      if(jmap[ny][nx]) return [];
      jmap[ny][nx] = true;
      while(queue.length>0) {
        var pp = queue.pop();
        pl.push(pp);
        for(var di=0; di<4; ++di) {
          nx = pp.x + d[di].x; ny = pp.y + d[di].y;
          if(0 <= nx && nx < this.sx && 0 <= ny && ny < this.gmap.length-1 && this.gmap[ny][nx].status === BLOCK_STATUS_TYPE.block) {
            if(!jmap[ny][nx] && color === this.gmap[ny][nx].color) {
              queue.push({x: nx, y: ny});
              jmap[ny][nx] = true;
            }
          }
        }
      }
      return pl;
    },
    // 渡された配列の上にあるブロックを落下ブロック化する
    toFallBlock: function(pl) {
      for(var i=0; i<pl.length; ++i) {
        var nx = pl[i].x, ny = pl[i].y-1;
        while(1) {
          if(ny<0 || this.gmap[ny][nx].status===BLOCK_STATUS_TYPE.none) break;
          var attr = {};
          attr.color = this.gmap[ny][nx].color;
          attr.status = this.gmap[ny][nx].status;
          attr.x = nx; attr.y = ny;
          if(attr.status === BLOCK_STATUS_TYPE.player) {
            this.pfall = true;
          }
          this.gmap[ny][nx].color = BLOCK_COLOR.none;
          this.gmap[ny][nx].status = BLOCK_STATUS_TYPE.none;
          this.fblock.push(attr);
          ny -= 1;
        }
      }
      // Yの降順ソート
      _.sortBy(this.fblock, function(e){return -e.y;});
      this.bfall = this.fblock.length > 0;
    },
    // 落下中のブロックを1ブロック分落とす
    updateFallBlock: function(doChain) {
      for(var i=0; i<this.fblock.length; ++i) {
        ++this.fblock[i].y;
        if(this.fblock[i].status === BLOCK_STATUS_TYPE.player) {
          this.x = this.fblock[i].x;
          this.y = this.fblock[i].y - (this.gmap.length - this.sy);
        }
        // 一番下に到達したり、一つ下がnone以外の場合
        if(this.gmap.length-1 <= this.fblock[i].y+1 ||
            this.gmap[this.fblock[i].y+1][this.fblock[i].x].status !== BLOCK_STATUS_TYPE.none) {
          // color, statusをコピーする
          this.gmap[this.fblock[i].y][this.fblock[i].x].color = this.fblock[i].color;
          this.gmap[this.fblock[i].y][this.fblock[i].x].status = this.fblock[i].status;
          if(doChain && this.fblock[i].status == BLOCK_STATUS_TYPE.block) {
            // ブロックであれば連鎖チェック
            this.checkblock.push({x: this.fblock[i].x, y: this.fblock[i].y});
          }
          if(this.fblock[i].status === BLOCK_STATUS_TYPE.player) {
            this.pfall = false;
          }
          this.fblock.splice(i, 1);
          --i; continue;
        }
      }
      this.bfall = this.fblock.length > 0;
    },
    // ブロックが消去できるかをチェックする
    doCheck: function(n) {
      n = Number(n) || ERASE_BNUM;
      var pl = [];
      jmapInit(this.sx, this.gmap.length);
      for(var i=0; i<this.checkblock.length; ++i) {
        if(this.gmap[this.checkblock[i].y][this.checkblock[i].x].status === BLOCK_STATUS_TYPE.none) {
          continue;
        }
        var pll = this.bfs(this.checkblock[i].x, this.checkblock[i].y, false);
        if(n <= pll.length) {
          // ブロックが消せる場合
          for(var j=0; j<pll.length; ++j) {
            this.gmap[pll[j].y][pll[j].x].color = BLOCK_COLOR.none;
            this.gmap[pll[j].y][pll[j].x].status = BLOCK_STATUS_TYPE.none;
          }
          pl.push(pll);
        }
      }
      this.checkblock = [];
      for(var k=0; k<pl.length; ++k) {
        this.toFallBlock(pl[k]);
      }
      return pl;
    },
    // 移動比率 (0 -> 1)
    moveRate: function() {
      return (this.defmtime - this.movetime) / this.defmtime;
    },
    // 移動方向
    // 落下時は下方向になる
    moveDir: function() {
      return this.action === ACTION_TYPE.move ? this.direct :
        this.pfall || this.isFall() ? DIRECTION.down : DIRECTION.none;
    },
    // 移動中か
    isMove: function() {
      return this.action === ACTION_TYPE.move;
    },
    firstMove: function() {
      return this.action === ACTION_TYPE.move && this.movetime === this.defmtime-1;
    },
    // 落下中か
    isFall: function() {
      return this.action === ACTION_TYPE.fall && (this.pfall || this.prev_pfall);
    },
    // ブロック消去中か
    isTouch: function() {
      return this.action === ACTION_TYPE.touch || this.judgement;
    },
    // ブロック消去中か
    isJudgement: function() {
      return this.judgement;
    },
    firstJudge: function() {
      if(this.judgement && this.prevchain !== this.chainNum) {
        this.prevchain = this.chainNum;
        return true;
      }
      return false;
    },
    // ブロック消去方向
    getTouchDir: function() {
      return this.touchDir;
    },
    // プレイヤーが死亡しているか
    isDead: function() {
      return this.action === ACTION_TYPE.dead;
    },
    // ブロックが落下中か
    isBlockFalling: function() {
      return this.bfall;
    },
    // プレイヤーが落下中か
    isPlayerFalling: function() {
      return this.judgement && this.pfall;
    },
    // 更新処理
    update: function() {
      if(this.movetime<=0) {
        this.action = this.next_action;
        if(this.judgement) {
          this.prevchain = this.chainNum;
          if(this.fblock.length>0) {
            this.updateFallBlock(true);
          }else {
            var pl = this.doCheck(ERASE_BNUM);
            if(pl.length===0) {
              this.eraseEmptyblockLine();
              this.judgement = false;
            }else {
              var blockCount = 0;
              for(var i=0; i<pl.length; ++i) {
                blockCount += pl[i].length;
              }
              ++this.chainNum;
              if(this.waterHeight>0) --this.waterHeight;
              this.hp += this.hp_mod*(this.chainNum*10);
              this.score += this.chainNum * blockCount * baseScore;
              this.getscore = this.chainNum * blockCount * baseScore;
            }
          }
          this.movetime = this.defmtime;
        }else {
          this.prev_pfall = this.pfall;
          var nx = this.x + d[this.direct].x, ny = this.y + d[this.direct].y;
          // 各処理を行う
          switch(this.action) {
          case ACTION_TYPE.none: // 何もしていない状態
            // 刺による即死
            if(this.y <= 0) this.action = this.next_action = ACTION_TYPE.dead;
            this.action = this.next_action;
            // ここで時間を初期化しないのは、どの状態も即実行可能にするため
            break;
          case ACTION_TYPE.move: // 移動中の状態
            this.next_action = ACTION_TYPE.none;
            this.setBlock(this.x, this.y, {
                  status_raw: this.getBlock(nx, ny).status,
                  color_raw: this.getBlock(nx, ny).color,
                });
            if(this.getBlock(nx, ny).status === BLOCK_STATUS_TYPE.none) {
              this.toFallBlock([{x: this.x, y: this.y + (this.gmap.length - this.sy)}]);
              if(this.bfall) {
                this.next_action = ACTION_TYPE.fall;
              }
            }
            this.setBlock(nx, ny, {status_raw: BLOCK_STATUS_TYPE.player, color: 'none'});
            this.x = nx; this.y = ny;
            // 下にオブジェクトが存在しない場合、落下処理
            if(this.inPlayer(this.x, this.y+1) && !this.exist(this.x, this.y+1)) {
              this.pfall = true;
              this.next_action = ACTION_TYPE.fall;
            }
            // 落下処理がなければ処理終了
            if(this.next_action === ACTION_TYPE.none) {
              this.pfall = false; this.bfall = false;
            }
            this.movetime = this.defmtime;
            break;
          case ACTION_TYPE.fall: // 落下中の状態
            var needpfall = this.pfall = this.inPlayer(this.x, this.y+1) && !this.exist(this.x, this.y+1);
            var needbfall = this.bfall = this.fblock.length>0;
            if(needpfall) {
              this.setBlock(this.x, this.y, {status: 'none', color: 'none'});
              ++this.y;
              this.setBlock(this.x, this.y, {status: 'player', color: 'none'});
              this.pfall = this.inPlayer(this.x, this.y+1) && !this.exist(this.x, this.y+1);
            }
            if(needbfall) {
              this.updateFallBlock(false);
            }
            if(!needpfall && !needbfall) {
              this.next_action = ACTION_TYPE.none;
            }
            this.direct = DIRECTION.down;
            this.movetime = this.defmtime;
            break;
          case ACTION_TYPE.touch: // 消そうとしている状態
            this.touchDir = this.direct;
            var jx = this.x + d[this.direct].x,
                jy = this.gmap.length - this.sy + this.y + d[this.direct].y;
            if(this.gmap[jy][jx].status === BLOCK_STATUS_TYPE.block) {
              var pl = this.bfs(jx, jy, true);
              if(ERASE_BNUM <= pl.length) {
                // ブロックが消せる場合
                this.chainNum = 1; this.prevchain = 0;
                this.score += pl.length * baseScore;
                this.getscore = pl.length * baseScore;
                for(var j=0; j<pl.length; ++j) {
                  this.gmap[pl[j].y][pl[j].x].color = BLOCK_COLOR.none;
                  this.gmap[pl[j].y][pl[j].x].status = BLOCK_STATUS_TYPE.none;
                }
                this.toFallBlock(pl);
                // 落下判定処理へ
                this.judgement = true;
              }else {
                // 消せない場合
              }
            }
            this.next_action = ACTION_TYPE.none;
            this.movetime = this.defmtime;
            break;
          case ACTION_TYPE.dead: // 死んだ状態
            this.hp = 0.0;
            break;
          default:
            break;
          }
        }
      }else {
        // 処理終了まで待機
        if(this.hp > 0.0) --this.movetime;
      }

      // 判定中はステージ状態変更を行わない
      if(!this.judgement) {
        // 水位によるダメージ判定
        if(this.y > this.sy - 2 - this.waterHeight) {
          this.hp -= this.hp_mod;
        }else {
          if(this.hp < this.hpMax && this.hp > 0.0) this.hp += this.hp_mod;
        }
        // 水位上昇判定
        var objCount = 0;
        for(var i=0; i<this.sy; ++i) {
          for(var j=0; j<this.sx; ++j) {
            if(this.getBlock(j, i).status !== BLOCK_STATUS_TYPE.none) {
              ++objCount;
            }
          }
        }

        // ブロック上昇判定
        if(this.hp>0.0 && this.btrest < 0) {
          this.addline(true);
          this.btrest = this.btime;
          if(this.y <= 0) this.action = this.next_action = ACTION_TYPE.dead;
          if(objCount/(this.sx*this.sy) >= 0.8) {
            if(this.wtrest <= 0) {
              if(this.waterHeight < this.sy-2) ++this.waterHeight;
              this.wtrest = this.wat_t;
            }else {
              if(this.hp>0.0) --this.wtrest;
            }
          }
        } else {
          if(this.hp>0.0) --this.btrest;
        }
      }

      // 体力limit
      if(this.hp<=0.0) {
        this.hp = 0.0;
        this.action = this.next_action = ACTION_TYPE.dead;
      }
      if(this.hp>this.hpMax) this.hp = this.hpMax;
      return true;
    },
  };

  return GameMap;
})();
