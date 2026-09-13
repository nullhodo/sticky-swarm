# sticky-swarm

接着・剛体融合する物理エージェント群シミュレーション。

## 概要

Matter.js と p5.js を組み合わせた物理シミュレーション Web アプリケーションです。エージェント同士が遊泳しながら衝突し、ルールに従って腕やボディが接着します。腕が一直線に揃うと物理的に1つの巨大な複合剛体（Compound Body）へと融合し、巨大な幾何学構造を形成していきます。

直感的なパラメータ調整 UI、カラーパレット切り替え、Undo/Redo 履歴管理、高解像度 JPG 画像および SVG ベクター書き出し、mp4-muxer による 60fps H.264 MP4 動画録画を備えています。

## 仕組み

- 言語: TypeScript
- フレームワーク: React 18
- ビルドツール: Vite
- パッケージマネージャー: pnpm
- 物理エンジン: Matter.js
- 描画エンジン: p5.js, p5.js-svg
- 状態管理: Jotai
- UI アニメーション: Framer Motion
- アイコン: Lucide React
- スタイリング: TailwindCSS (Zen Maru Gothic フォント)
- 動画録画: mp4-muxer + WebCodecs (60fps H.264 MP4 直接出力、MediaRecorder WebM フォールバック対応)
- コード品質: Biome, Knip

### 構造

```text
sticky-swarm/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── biome.json
├── .gitignore
├── .npmrc
├── README.md
├── output/                   - 画像・動画・設定の出力先ディレクトリ
└── src/
    ├── main.tsx              - アプリケーションマウントおよび p5 ライフサイクル
    ├── index.css
    ├── vite-env.d.ts
    ├── types/
    │   └── swarm.ts          - パラメータ、エージェント、パーツ、剛体の型定義
    ├── constants/
    │   └── palettes.ts       - カラーパレット定義およびデフォルト設定
    ├── state/
    │   └── swarmStore.ts     - Jotai による状態管理 (パラメータ、履歴、録画状態)
    ├── core/
    │   ├── swarmEngine.ts    - 物理ワールド管理・シミュレーション進行オーケストレータ
    │   ├── agentBuilder.ts   - エージェントパーツ構成および剛体生成
    │   ├── dockingSolver.ts  - 腕同士・ボディ同士のドッキング相対幾何計算
    │   ├── forces.ts         - パーリンノイズ外力、マウス操作、境界反発、速度制限
    │   ├── compoundMerger.ts - 複合剛体 (Compound Body) への非弾性融合
    │   ├── swarmRenderer.ts  - エージェント・拘束・デバッグベクトルの統合描画
    │   ├── recorder.ts       - mp4-muxer / WebCodecs による 60fps MP4 録画マネージャー
    │   └── exporter.ts       - 高解像度画像 / SVG ベクター / JSONC 設定の書き出し
    ├── components/
    │   ├── ControlPanel.tsx  - 設定パネル UI コンテナ
    │   ├── RecordingOverlay.tsx - 録画中 HUD オーバーレイ
    │   ├── ui/               - 再利用可能な UI プリミティブ (Slider, Checkbox, Select, Accordion)
    │   └── panel/            - 設定セクション群 (System, Agent, Connection, Interaction, Color, Export)
    ├── hooks/
    │   └── useKeyboardShortcuts.ts - グローバルキーボードショートカット
    └── utils/
        └── date.ts           - 日時フォーマット
```

## 実行方法

| コマンド       | 実行内容                                      |
| -------------- | --------------------------------------------- |
| `pnpm install` | 依存パッケージのインストール                  |
| `pnpm dev`     | 開発サーバーの起動 (ローカル実行)             |
| `pnpm build`   | TypeScript 型チェックおよび本番バンドルビルド |
| `pnpm preview` | ビルド成果物のプレビュー                      |
| `pnpm check`   | Biome による静的解析とフォーマット確認        |
| `pnpm format`  | Biome によるコードの自動フォーマット          |
| `pnpm knip`    | 未使用ファイル・エクスポート・依存関係の検証  |

## 操作方法・キーボードショートカット

| キー・操作       | 動作                                                      |
| ---------------- | --------------------------------------------------------- |
| `Space`          | パラメータのランダム実行                                  |
| `Ctrl + Z`       | 元に戻す (Undo)                                           |
| `Ctrl + Y`       | やり直す (Redo)                                           |
| `H`              | 設定コントロールパネルの開閉                              |
| `R`              | MP4 動画録画の開始                                        |
| `S`              | MP4 動画録画の停止・保存                                  |
| `E`              | 高解像度 JPG 画像の書き出し                               |
| `ホイールスクロール` | キャンバスの拡大・縮小 (設定UI操作時はUIスクロールを優先)  |
| `左ドラッグ`     | エージェントの牽引・操作                                  |
