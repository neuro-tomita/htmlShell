# htmlShell.js
HTMLに挙動を記述して「構造と状態の宣言的プログラム」に変える、超軽量表示マネージャ

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 概要
* HTML を「記述的プログラム」として活用し、表示だけを書き換える超軽量ライブラリ
* `data-*` 属性に挙動や状態を定義して UI を制御
* ページ遷移や URL 書き換えなしで SPA 的動きを実現
* 対象の要素の指定は、CSSセレクターにを拡張して、イベントが発生した要素からの相対指定を追加して柔軟な DOM 操作が可能

## 特長
- 依存性ゼロ・軽量構成（ファイル数少、300–1000行程度）
- fetch／AbortController 対応によるモダンな通信制御
- `requestBefore`／`requestAfter`／`targetHooks` によるフック拡張で柔軟性アップ
- HTML 構造／CSS セレクター準拠の設計で習得コストが低い

## インストール

<script src="htmlShell.js"></script>


## クイックスタート
```html:button.html
<!-- ボタンを押すと、detail.htmlを取得して、ボタン自身（!）を置き換える -->
<button data-url="detail.html" data-target="_change_!" data-event="">
	詳細を表示
</button>
```
1. `htmlShell.js` を読み込み、`DOMContentLoaded` 後に初期化
1. ボタン押下 → リクエスト → HTML取得 → `data-target="!"` によってボタン自身が置き換えられます


## 想定してる使い方
* ブラウザベースの小規模ツール/社内アプリ/中小規模の業務アプリ
* Electronの表示管理

## もう少し詳しく 〜 公開に至った背景
* イベントの発生やリクエスト後の挙動をHTML内に記述しておけばSPA的な動きを実現でき、コード量を減らすことが出来ると思って開発開始。
* 社内での小〜中規模業務ツールやElectronアプリ開発において、軽量かつ直感的に使えるUIマネージャとしてまとめました。
* 状態管理・ルーティング・コンポーネント構造といった重厚な仕組みは一切持たず、HTML構造だけを制御する設計です。
* URL書き換えやページ遷移を行わず、DOM構造の更新だけで体験を提供します。
* `data-*` 属性やCSSセレクターに準拠したシンプルな作法により、学習コストを限りなく低く抑えました。
* CSSセレクターは、イベント発生要素からの相対指定を拡張しているため、HTML構造に柔軟に追随できます。
* 小〜中規模なリクエストと表示切替中心の開発であれば十分に実用的です。
* 公開したのは、VS CodeのGitHub Copilotによる補完をより効果的に活用できるようになるからです。

## リファレンス
### イベント発生時の処理
 * data-eventがあれば行う。
 * 通信を行う属性があれば、行う
 * 戻ってきたhtmlを data-target に従って処理する
 * 戻ってきたhtmlのbodyにdata-eventがあれば処理する

### 専用属性
 * data-target
  * 読込んだ内容をどう表示するか。
  * 元のa/formタグに記述するが、読込んだ内容のbodyタグの内容で上書きして処理
 * data-url:buttonなどでurl/action要素がない場合に使用する
  * data-params:↑やフォーム外の同時に送信するparamNameを指定する rootTarget[name1,name2] 
* data-body
  * レスポンスに指定。指定したエレメントをbodyタグと見なして、その子を対象エレメントとする
 * data-event
  * 通信にかかわらない。エレメントの表示/削除などの処理
  * 元のa/formタグは読込前に、読込んだ内容のbodyタグの内容は読込後に実行
  * スペース区切りで複数記述可能

### 要素の指定
* htmlShell内での各種要素の指定は、基本CSSセレクター指定ですが、イベントが発生した場所からの相対指定できるように以下のように拡張しています。
 * ! イベントが発生した要素。>区切りで下位要素が指定できる
 * !>[parent|next|before|closest] でイベントが発生した要素からの位置関係で対象要素を指定できます。
  * closestは次の>までの文字をセレクターとして、祖先に向かって検索

### data-target
 * [_pageNew_xxx]xxxの子として追加して、それ以外をhiddenにする。ページの追加・切り替えに使います。
 * [_pageFirst_xxx]xxxの子をすべて削除し、最初の子として追加する。ページの追加・切り替えに使います。
 * [_pageChange_xxx]xxxの最後の子を削除し、最後の子として追加する。ページの追加・切り替えに使います。
 * [_addElement_xxx]xxxの子として追加
 * [_change_xxx]id:xxxの内容を書き換える。内容変更
 * [_dialog]ダイアログとして表示。ダイアログを閉じるまでダイアログ内での作業となる

### data-event
 * [_clear_xxx]id:xxxの内容を削除する
 * [_addClass_xxx_ccc]xxxにcccクラスを追加する
 * [_removeClass_xxx_ccc]xxxにcccクラスを削除する
 * [_toggleClass_xxx_ccc]xxxにcccクラスをトグルする
 * [_toggle_xxx]id:xxxの内容がなければ、読込。あれば、削除のみを行う
 * [_open_dialog]ダイアログとして開く
 * [_hidden_dialog]ダイアログを閉じる
 * [_close_dialog]ダイアログを閉じる
 * [_close_xxx]id:xxxを閉じる。fade効果がある。
 * [_pageBackFirst_xxx]xxxの最初の子を表示して、その他の子を削除
 * [_pageBack_xxx]xxxの最期の子を削除して、最後になった子を表示
 * [_remove_xxx]xxxを削除(見つかった最初の要素)
 * [_removes_xxx]xxxを削除(見つかったすべての要素)
 * [_show_xxx]xxxを表示
 * [_hidden_xxx]xxxを隠す
 * [_showToggle_xxx]xxxを表示/隠すをトグル
 * [_replace_xxx_yyy]xxxをyyyに置き換える
 * [_execute_xxx]xxxを実行する
 * [_focus_xxx]xxxにフォーカスを移動する

## フックと拡張

* **requestBefore / requestAfter**
  リクエスト処理の前後にフックを追加

* **addRequestParamHooks**
  `FormData` 生成後、submit 前に追加のパラメータを挿入

* **targetHooks**
  `data-target` の挙動を共通処理で拡張・カスタマイズ

---

### 利用例

```js
htmlShell.targetHooks.push((target, el, params, event) => {
  if (target === '_download') {
    // custom download handler
    return false; // core の処理をスキップ
  }
  return true;
});
```
## 更新履歴
* **2015**: 社内ツールとして開発開始
* **2019/06-** vanilaJsとして再構築
* **2025‑07‑22**: v0.1.0 リリース


