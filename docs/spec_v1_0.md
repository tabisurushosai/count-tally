# count-tally (かぞえカウンター) 仕様書 v1_0
## ゴール
複数のカウンターで何でも数えるChrome拡張。プラス/マイナス/リセット/ステップ値。
## 絶対制約
外部API・通信なし/chrome.storage.localのみ/権限storageのみ/MV3・TS・Vite/UIはpopup内で完結。
## 機能
カウンターCRUD(名前/絵文字/初期値)/プラス・マイナス・リセット・ステップ値/並べ替え/起動時復元/i18n ja-en/無料は3カウンター、Premium($3買い切り7日トライアル)で無制限+日次自動リセット+合計表示。
## 完了条件
npm run build成功・dist生成・_locales ja/en・icons16/48/128・release/count-tally.zip生成。
