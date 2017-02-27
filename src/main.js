// main.js : メイン関数

// ライブラリ
_ = require('underscore'); window._ = _;
$ = require('jquery'); window.$ = $;
// 扱うシーン
var SceneClass = require('./scene/scene.js');
var scene = null;
// デフォルトのキー機能を防ぐキー
// ESC, SP, Left, Right, Up, Down
var preventKey = [27, 32, 37, 38, 39, 40];

// タイマーで毎フレーム呼び出す関数
function timerfunc(event) {
  scene.move();
  scene.render();
  scene.update();
}
// マウスが移動した時
function movefunc(event) {
  scene.setPos(event);
  scene.setClk(event.which > 0);
}
// クリックを離したときの処理
function mouseup(event) {
  scene.setPos(event);
  scene.setClk(false);
}
// クリックした時の処理
function mousedown(event) {
  scene.setPos(event);
  scene.setClk(true);
}
// キーを押した時の処理
function keydownfunc(event) {
  if(_.include(preventKey, event.keyCode)) {
    event.preventDefault();
  }
  scene.setKey(event);
}
// キーを離した時の処理
function keyupfunc(event) {
  if(_.include(preventKey, event.keyCode)) {
    event.preventDefault();
  }
  scene.unsetKey(event);
}

// 読み込み時の処理(entry point)
onload = function() {
  canvas = document.getElementById('game_canvas');
  scene = new SceneClass(canvas);
  scene.before();
  scene.init();
  if(!scene) {
    alert("エラーが発生しました");
    return false;
  }
  canvas.onmousemove = movefunc;
  canvas.onmouseup = mouseup;
  canvas.onmousedown = mousedown;
  window.addEventListener('keydown', keydownfunc);
  window.addEventListener('keyup', keyupfunc);
  setInterval(timerfunc, 16);
  return true;
};
