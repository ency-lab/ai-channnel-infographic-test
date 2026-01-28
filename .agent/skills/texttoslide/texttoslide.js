/**
 * Text to Slide Skill - Simple Version
 *
 * Gemini APIの代わりに、テキストを分割してMarp形式のスライドに変換
 * APIの互換性問題を回避した簡潔版
 */

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const { execSync } = require('child_process');

const args = minimist(process.argv.slice(2));

/**
 * 入力ファイルを読み込む
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
 * テキストをMarp形式のスライドに変換
 */
function convertToMarpSlides(textContent, theme = 'default') {
  const lines = textContent.split('\n');
  let marpContent = `---
marp: true
theme: ${theme}
---

`;

  let currentSlide = '';
  let slideCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // # で始まる行は新しいスライドを開始（レベル1の見出しのみ）
    if (line.startsWith('# ') && currentSlide.trim().length > 0) {
      slideCount++;
      marpContent += currentSlide.trim() + '\n\n---\n\n';
      currentSlide = line + '\n';
    } else if (line.startsWith('## ')) {
      // ## は見出しレベルを一段階上げる（スライド内）
      currentSlide += '\n' + line + '\n';
    } else if (line.trim().length === 0) {
      currentSlide += '\n';
    } else {
      currentSlide += line + '\n';
    }
  }

  // 最後のスライドを追加
  if (currentSlide.trim().length > 0) {
    slideCount++;
    marpContent += currentSlide.trim();
  }

  console.log(`[Text to Slide] Generated ${slideCount} slides`);
  return marpContent;
}

/**
 * スライドファイルを保存
 */
function saveMarpSlide(slideContent, outputDir, filename) {
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
 */
function generatePrompts(slideFilePath, promptOutputDir) {
  try {
    const scriptPath = path.resolve(__dirname, '../../scripts/marp_to_prompts.js');

    if (!fs.existsSync(scriptPath)) {
      console.error(`[Text to Slide] Error: marp_to_prompts.js not found at ${scriptPath}`);
      console.warn('[Text to Slide] Note: skipping prompt generation');
      return null;
    }

    console.log('[Text to Slide] Generating image prompts from slides...');

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
function main() {
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
    console.log(`[Text to Slide] Reading input file: ${args.input}`);
    const inputContent = loadInputFile(args.input);
    console.log(`[Text to Slide] Input content loaded (${inputContent.length} characters)`);

    const inputFileName = path.basename(args.input, path.extname(args.input));
    const slideFilename = args['slide-output'] || `${inputFileName}_slide.md`;
    const theme = args.theme || 'default';
    const shouldGeneratePrompts = args['generate-prompts'] !== 'false';

    // テキストをMarpスライドに変換
    console.log('[Text to Slide] Converting text to Marp slides...');
    const marpContent = convertToMarpSlides(inputContent, theme);

    // スライドを保存
    const slideFilePath = saveMarpSlide(marpContent, args.output, slideFilename);

    // プロンプト生成（オプション）
    if (shouldGeneratePrompts) {
      const promptDir = args['prompt-dir'] || path.join(args.output, 'prompts');
      generatePrompts(slideFilePath, promptDir);
    }

    console.log('[Text to Slide] Processing complete!');
    console.log(`  Slide file: ${slideFilePath}`);
    if (shouldGeneratePrompts) {
      console.log(`  Prompts directory: ${args['prompt-dir'] || path.join(args.output, 'prompts')}`);
    }

  } catch (error) {
    console.error(`[Text to Slide] Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
