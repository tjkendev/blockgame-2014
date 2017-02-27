# 繋ぎ消しパズル

2014年工大祭で展示していたゲーム  
その中から音楽、効果音を抜いたもの

[ここ](http://smijake3.s602.xrea.com/game/rogy/kodaisai14/)で動いているものが遊べる

## Requirement

node v7.5.0  
npm 4.1.2  

## Install

必要なモジュールをインストール
```bash
$ npm install
```

webpack, gruntはglobalにインストール
```bash
$ npm install -g webpack webpack-cli grunt grunt-cli
```

## Compile

* ソースコードのコンパイル + 画像の圧縮
```bash
$ grunt
```
コンパイル、圧縮すると、"public"内に出力される

* jsファイルの監視自動コンパイル
```bash
$ webpack --watch
```
もしくは
```bash
$ grunt watch
```

* 画像の圧縮
```bash
$ grunt image
```
