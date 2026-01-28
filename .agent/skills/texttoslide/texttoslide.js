/**
 * Text to Slide Skill
 *
 * テキスト入力からMarp形式のスライド資料を自動生成し、
 * さらに画像生成用プロンプトに変換するスキル
 *
 * 使用方法:
 *   node texttoslide.js --input <file> --output <dir> [--generate-prompts true/false]
 */

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { execSync } = require('child_process');

// 環境変数を読み込み (.env)
require('dotenv').config();

const globalEnvPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
if (fs.existsSync(globalEnvPath)) {
  require('dotenv').config({ path: globalEnvPath });
}

const args = minimist(process.argv.slice(2));

// APIキーの確認
const API_KEY = process.env.GEMINI_API_KEY || process.env.NANOBANANA_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('[Text to Slide] Error: GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

// Gemini AI クライアントの初期化
const ai = new GoogleGenAI({ apiKey: API_KEY });
const MODEL_NAME = process.env.NANOBANANA_MODEL || 'gemini-2.0-flash-exp';

/**
 * 入力ファイルを読み込む
 * @param {string} inputPath - 入力ファイルのパス
 * @returns {string} ファイルの内容
 */
function loadInputFile(inputPath) {
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`[Text to Slide] Error: Input file not found: ${absolutePath}`);
    process.exit(1);
  }

  try {
    return fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`[Text to Slide] Error reading file: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Marp形式のスライドを生成
 * @param {string} textContent - 入力テキスト
 * @param {string} theme - Marpテーマ名
 * @returns {Promise<string>} 生成されたMarpスライド
 */
async function generateMarpSlides(textContent, theme = 'default') {
  const prompt = `次のテキストを元に、Marp形式のプレゼンテーションスライドを作成してください。

【フォーマット要件】
- Markdown形式 (Marp)
- テーマ: ${theme}
- 構成: 表紙スライド + 内容スライド（適切な枚数）
- 各スライドには適切なタイトルと説明を含める
- スライド間に --- を挿入してスライドを区切る
- marp: { theme: '${theme}' } をメタデータに含める

【入力テキスト】
\`\`\`
${textContent}
\`\`\`

生成したMarp形式のスライドを出力してください。マークダウンのコードブロック記号は不要です。`;

  try {
    console.log('[Text to Slide] Generating Marp slides with Gemini...');
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const result = response.response;
    if (!result || !result.candidates || result.candidates.length === 0) {
      throw new Error('No response from API');
    }

    let slideContent = result.candidates[0].content.parts[0].text;
    
    // マークダウンコードブロックを削除（もし含まれていれば）
    slideContent = slideContent.replace(/^```(?:markdown|marp)?\n?/, '').replace(/\n?```$/, '');

    return slideContent.trim();
  } catch (error) {
    console.error(`[Text to Slide] Error generating slides: ${error.message}`);
    throw error;
  }
}

/**
 * スライドファイルを保存
 * @param {string} slideContent - Marpスライドの内容
 * @param {string} outputDir - 出力ディレクトリ
 * @param {string} filename - ファイル名
 * @returns {string} 保存されたファイルのパス
 */
function saveMarpSlide(slideContent, outputDir, filename) {
  // 出力ディレクトリが存在しない場合は作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, filename);
  
  try {
    fs.writeFileSync(filePath, slideContent, 'utf-8');
    console.log(`[Text to Slide] Marp slide saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`[Text to Slide] Error saving slide: ${error.message}`);
    throw error;
  }
}

/**
 * marp_to_prompts.jsを実行してプロンプトを生成
 * @param {string} slideFilePath - スライドファイルのパス
 * @param {string} promptOutputDir - プロンプト出力ディレクトリ
 * @returns {string} プロンプトファイルが出力されたディレクトリ
 */
function generatePrompts(slideFilePath, promptOutputDir) {
  try {
    // プロジェクトのスクリプトパスを特定
    const scriptPath = path.resolve(__dirname, '../../scripts/marp_to_prompts.js');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`[Text to Slide] Error: marp_to_prompts.js not found at ${scriptPath}`);
      console.warn('[Text to Slide] Note: skipping prompt generation');
      return null;
    }

    console.log('[Text to Slide] Generating image prompts from slides...');
    
    // プロンプト生成スクリプトを実行
    const command = `node "${scriptPath}" "${slideFilePath}"`;
    
    const output = execSync(command, { encoding: 'utf-8' });
    console.log('[Text to Slide] Prompt generation output:');
    console.log(output);

    return promptOutputDir;
  } catch (error) {
    console.error(`[Text to Slide] Error generating prompts: ${error.message}`);
    console.warn('[Text to Slide] Note: prompt generation failed, but slide was created');
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  // 必須パラメータの確認
  if (!args.input || !args.output) {
    console.error('[Text to Slide] Usage: node texttoslide.js --input <file> --output <dir> [--slide-output <name>] [--theme <name>] [--generate-prompts true/false]');
    console.error('');
    console.error('Options:');
    console.error('  --input <path>              Input text file path (required)');
    console.error('  --output <dir>              Output directory (required)');
    console.error('  --slide-output <name>       Slide output filename (optional, default: [input]_slide.md)');
    console.error('  --theme <name>              Marp theme (optional, default: default)');
    console.error('  --generate-prompts <bool>   Generate image prompts (optional, default: true)');
    process.exit(1);
  }

  try {
    // 入力ファイルの読み込み
    console.log(`[Text to Slide] Reading input file: ${args.input}`);
    const inputContent = loadInputFile(args.input);
    console.log(`[Text to Slide] Input content loaded (${inputContent.length} characters)`);

    // 出力ファイル名の決定
    const inputFileName = path.basename(args.input, path.extname(args.input));
    const slideFilename = args['slide-output'] || `${inputFileName}_slide.md`;
    const theme = args.theme || 'default';
    const generatePrompts = args['generate-prompts'] !== 'false';

    // Marpスライドの生成
    const marpContent = await generateMarpSlides(inputContent, theme);

    // スライドの保存
    const slideFilePath = saveMarpSlide(marpContent, args.output, slideFilename);

    // プロンプト生成（オプション）
    if (generatePrompts) {
      const promptDir = args['prompt-dir'] || path.join(args.output, 'prompts');
      generatePrompts(slideFilePath, promptDir);
    }

    console.log('[Text to Slide] Processing complete!');
    console.log(`  Slide file: ${slideFilePath}`);
    if (generatePrompts) {
      console.log(`  Prompts directory: ${args['prompt-dir'] || path.join(args.output, 'prompts')}`);
    }

  } catch (error) {
    console.error(`[Text to Slide] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// メイン処理を実行
main().catch(error => {
  console.error('[Text to Slide] Unhandled error:', error);
  process.exit(1);
});
