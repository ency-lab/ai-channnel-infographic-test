# Text to Slide Skill - Claude Instructions

このドキュメントは Claude（AI Assistant）向けの指示です。このスキルを使用する際のガイドラインを記載しています。

## スキルの概要

`texttoslide` スキルは、テキスト入力からMarp形式のプレゼンテーションスライドを自動生成し、さらに各スライドの画像生成プロンプトを出力するスキルです。

## 発動条件

以下のいずれかの要求が来た場合にこのスキルを使用してください：

- ユーザーがテキストや記事からプレゼンテーションスライドを作成したい
- テキスト内容をビジュアル化してスライド化したい
- 各スライド用の詳細な画像生成プロンプトが必要
- Marp形式のスライドデッキを自動生成したい

## 使用パターン

### パターン1: 完全な自動処理（推奨）

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "path/to/input.md" \
  --output "path/to/output"
```

このコマンドは以下を実行します：
1. 入力テキストからMarp形式スライドを生成
2. スライドを保存
3. marp_to_prompts.jsを使用して画像生成プロンプトを自動生成

### パターン2: スライドのみ生成

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "path/to/input.md" \
  --output "path/to/output" \
  --generate-prompts false
```

スライド生成のみで、プロンプト生成はスキップ。

### パターン3: カスタムテーマで生成

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "path/to/input.md" \
  --output "path/to/output" \
  --theme "gaia"
```

Marpの異なるテーマ（`default`, `gaia`, `uncover` など）を指定可能。

### パターン4: カスタムファイル名

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "path/to/input.md" \
  --output "path/to/output" \
  --slide-output "my_presentation.md"
```

スライド出力ファイル名をカスタマイズ。

## 入力形式

入力ファイルは以下の形式をサポートしています：

- **Markdown** (.md): 構造化されたテキスト、箇条書き、見出しなど
- **Plain Text** (.txt): 段落ベースのテキスト

### 入力例

```markdown
# 自動運転技術の未来

## 現状
自動運転技術は急速に発展しています。
- レベル2: 一部の運転支援
- レベル3: 条件付き自動運転
- レベル4: 高度な自動運転

## 課題
セキュリティ、倫理的問題、法的整備が必要です。

## 将来の展望
2030年までに広く普及すると予想されます。
```

## 出力形式

スキルは以下の構造で出力を生成します：

```
output/
├── [input]_slide.md              # 生成されたMarpスライド
└── prompts/
    └── YYYY-MM-DD_HH-MM-SS/      # タイムスタンプ付きプロンプトディレクトリ
        ├── 01_slide_prompt.md     # 1番目のスライド用プロンプト
        ├── 02_slide_prompt.md     # 2番目のスライド用プロンプト
        └── ...
```

## 出力ファイルの内容

### Marpスライル (.md)

```markdown
---
marp: true
theme: default
---

# Presentation Title

## Slide 1
Content here...

---

## Slide 2
More content...
```

### プロンプトファイル (prompts/)

```markdown
# Slide 1 - Image Generation Prompt

## Slide Title
Presentation Title

## Content
- Main point 1
- Main point 2

## Detailed Visual Prompt
A professional infographic showing...
[詳細な画像生成用プロンプト]
```

## image-gen スキルとの連携

生成されたプロンプトは `image-gen` スキルと組み合わせて使用できます：

```bash
# texttoslide でプロンプトを生成
node ~/.claude/skills/texttoslide/texttoslide.js --input "article.md" --output "./output"

# image-gen で各スライド用の画像を生成
node ~/.claude/skills/image-gen/image_gen.js \
  --prompt-file "output/prompts/YYYY-MM-DD_HH-MM-SS/01_slide_prompt.md" \
  --output "output/images"
```

## 前提条件

このスキルが正常に動作するために必要な条件：

1. **Gemini API キーの設定**
   - `.env` ファイルに `GEMINI_API_KEY` を設定
   - または `.claude/.env` に設定

2. **Node.js環境**
   - Node.js 18以上

3. **marp_to_prompts.jsスクリプト**
   - プロンプト生成に必要
   - `/scripts/marp_to_prompts.js` に配置されていることが前提

## トラブルシューティング

### APIキーエラー
```
[Text to Slide] Error: GEMINI_API_KEY is not set in .env
```
→ .env ファイルに GEMINI_API_KEY を設定してください

### ファイルが見つからない
```
[Text to Slide] Error: Input file not found
```
→ --input で指定したパスが正しいか確認してください

### プロンプト生成に失敗
```
[Text to Slide] Error: marp_to_prompts.js not found
```
→ スクリプトパスを確認し、存在することを確認してください
→ --generate-prompts false でプロンプト生成をスキップできます

## ベストプラクティス

1. **入力テキストの品質**
   - 明確な見出しと段落構造を持つテキストが最適
   - 箇条書きは自動的にスライドに変換されます

2. **テーマの選択**
   - `default`: シンプルで汎用的
   - `gaia`: 明るくフレンドリー
   - `uncover`: ダークテーマ

3. **スライド枚数**
   - Gemini APIが自動的に適切なスライド数を判断
   - 長いテキスト（2000語以上）は自動的に多数スライドに分割

4. **プロンプト活用**
   - 生成されたプロンプトは image-gen スキルで即座に画像化可能
   - プロンプトの内容をカスタマイズしてさらに精密な画像生成も可能

## 関連スキル

- **image-gen**: 生成されたプロンプトから画像を生成
- **article-infographic**: 記事全体のインフォグラフィック生成
