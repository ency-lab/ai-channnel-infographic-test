---
name: texttoslide
description: |
  テキストからMarp形式のスライド資料を自動生成し、さらに画像生成用プロンプトへ変換するスキル。
  
  【発動条件】
  - テキストや記事からスライド資料を作成したい
  - テキストを分割してスライド化し、インフォグラフィック用プロンプトを生成したい場合
  
  【処理フロー】
  1. 入力テキストをGemini APIに送信してMarp形式のスライドを生成
  2. 生成されたスライドを解析
  3. marp_to_prompts.jsを実行して画像生成プロンプトを出力
  
version: 1.0.0
---

# Text to Slide Skill

テキスト入力からMarp形式のスライド資料を自動生成し、さらに画像生成用プロンプトファイルを生成するスキルです。

## 使用方法

### 基本的な使い方

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "./article/sample.md" \
  --output "./output"
```

### オプション

| オプション | 必須 | 説明 |
|-----------|------|------|
| `--input <path>` | Yes | 入力テキストファイル（.md または .txt） |
| `--output <dir>` | Yes | 出力先ディレクトリ |
| `--slide-output <name>` | No | スライドファイル名（省略時は `[入力ファイル名]_slide.md`） |
| `--theme <name>` | No | Marpテーマ（デフォルト: `default`） |
| `--generate-prompts` | No | 画像生成プロンプトも生成するか（デフォルト: true） |
| `--prompt-dir <path>` | No | プロンプト出力ディレクトリ（省略時は output/prompts） |

## 出力

```
output/
├── [filename]_slide.md          # 生成されたMarpスライド
└── prompts/
    └── YYYY-MM-DD_HH-MM-SS/     # 画像生成プロンプト群
        ├── 01_slide_prompt.md
        ├── 02_slide_prompt.md
        └── ...
```

## 例

### テキストからスライドのみ生成

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "./article/document.md" \
  --output "./output" \
  --slide-output "my_presentation.md" \
  --generate-prompts false
```

### テキストからスライドと画像生成プロンプトを生成

```bash
node ~/.claude/skills/texttoslide/texttoslide.js \
  --input "./article/document.md" \
  --output "./output" \
  --generate-prompts true
```

## 前提条件

- Gemini API キーが `.env` に設定されていること
- Node.js 18以上
- marp_to_prompts.js スクリプトへのアクセス（プロンプト生成時）

## 処理の詳細

1. **スライド生成フェーズ**
   - 入力テキストを分析
   - Gemini APIを使用してMarp形式のスライドを生成
   - defaultテーマを使用（カスタマイズ可能）

2. **プロンプト生成フェーズ** (--generate-prompts true の場合)
   - 生成されたスライドをスライドごとに分割
   - 各スライドについて画像生成用プロンプトを作成
   - タイムスタンプ付きディレクトリに保存
