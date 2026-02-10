/**
 * LINEスタンプ画像の後処理ユーティリティ
 * 1. クロマキー緑背景を透過に変換
 * 2. SVGでカラフルテキストオーバーレイを合成
 *
 * AIにテキスト描画を任せると日本語の誤字が発生するため、
 * 画像生成は「キャラクターのみ + 緑背景」で行い、
 * テキストは sharp + SVG で正確に合成する。
 *
 * テキスト描画には opentype.js でフォントを直接読み込み、
 * テキストをSVGパスに変換して合成する。
 * これにより Vercel 等のサーバー環境でシステムフォントに依存せず
 * 日本語テキストを正確にレンダリングできる。
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import opentype from 'opentype.js';

// フォントのキャッシュ（初回ロード後に保持）
let _font: opentype.Font | null = null;
let _fontLoadPromise: Promise<opentype.Font> | null = null;

/**
 * フォントファイルを読み込む。
 * 1. Nitro の useStorage API（本番: バンドル済みアセット）
 * 2. フォールバック: ファイルシステムから直接読み込み（開発時）
 */
async function loadFontBuffer(): Promise<ArrayBuffer> {
  // Nitro の useStorage で読み込みを試みる（本番環境ではバンドル済み）
  try {
    const storage = useStorage('assets:server');
    const data = await storage.getItemRaw('fonts/NotoSansJP-Black.ttf');
    if (data) {
      // Buffer / Uint8Array の場合
      if (data instanceof Uint8Array) {
        // Uint8Array#buffer の型は ArrayBufferLike だが、実際の実装は ArrayBuffer のため明示的にキャストする
        const arrayBuffer = data.buffer as ArrayBuffer;
        return arrayBuffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      }
      // ArrayBuffer の場合
      if (data instanceof ArrayBuffer) {
        return data;
      }
    }
  } catch {
    // useStorage が失敗した場合はフォールバック
  }

  // 開発環境フォールバック: ファイルシステムから直接読み込み
  const fontPath = resolve('server/assets/fonts/NotoSansJP-Black.ttf');
  const buf = readFileSync(fontPath);
  // Node.js の Buffer#buffer も ArrayBufferLike 型なので、実体である ArrayBuffer にキャストして扱う
  const arrayBuffer = buf.buffer as ArrayBuffer;
  return arrayBuffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function getFont(): Promise<opentype.Font> {
  if (_font) return _font;

  if (!_fontLoadPromise) {
    _fontLoadPromise = (async () => {
      const arrayBuffer = await loadFontBuffer();
      _font = opentype.parse(arrayBuffer);
      return _font;
    })();
  }

  return _fontLoadPromise;
}

/** LINE スタンプの出力サイズ */
const STAMP_WIDTH = 370;
const STAMP_HEIGHT = 320;

/** スタンプテキスト用のビビッドカラーパレット */
const STAMP_COLORS = [
  { fill: '#FF4B8B', stroke: '#FFFFFF' }, // Hot pink
  { fill: '#FF6B35', stroke: '#FFFFFF' }, // Orange
  { fill: '#4ECDC4', stroke: '#FFFFFF' }, // Teal
  { fill: '#FFD93D', stroke: '#8B6914' }, // Yellow (dark stroke for contrast)
  { fill: '#6C5CE7', stroke: '#FFFFFF' }, // Purple
  { fill: '#00B894', stroke: '#FFFFFF' }, // Green
  { fill: '#E84393', stroke: '#FFFFFF' }, // Magenta
  { fill: '#0984E3', stroke: '#FFFFFF' }, // Blue
  { fill: '#FF6348', stroke: '#FFFFFF' }, // Red-orange
  { fill: '#A29BFE', stroke: '#FFFFFF' } // Lavender
];

function getColorByIndex(index: number): { fill: string; stroke: string } {
  return STAMP_COLORS[index % STAMP_COLORS.length]!;
}

/**
 * クロマキー緑(#00FF00付近)のピクセルを透過に変換する
 * HSV空間で色相≈120°、彩度>50%、明度>50%を緑と判定
 */
export async function removeGreenBackground(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer).ensureAlpha();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const { width, height, channels } = info;

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;

    // RGB → HSV 簡易判定
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0 || max === 0) continue;

    const saturation = delta / max;
    const value = max / 255;

    // 色相を計算（緑=120°付近）
    let hue = 0;
    if (max === g) {
      hue = 60 * (((b - r) / delta) + 2);
    } else if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else {
      hue = 60 * (((r - g) / delta) + 4);
    }
    if (hue < 0) hue += 360;

    // 緑色判定: 色相80-160°、彩度>40%、明度>30%
    const isGreen = hue >= 80 && hue <= 160 && saturation > 0.4 && value > 0.3;

    if (isGreen) {
      // 完全透過
      pixels[offset + 3] = 0;
    } else if (hue >= 70 && hue <= 170 && saturation > 0.25 && value > 0.2) {
      // エッジ: 半透明にしてアンチエイリアス効果
      const edgeFactor = Math.min(
        Math.abs(hue - 120) / 50,
        1 - saturation,
        1 - value
      );
      pixels[offset + 3] = Math.round(255 * Math.min(edgeFactor * 3, 1));
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();
}

/**
 * テキスト長と画像幅に応じたフォントサイズを決定する
 */
function calculateFontSize(text: string, imageWidth: number): number {
  const len = text.length;
  const base = Math.floor(imageWidth * 0.13);

  if (len <= 2) return Math.max(base + 20, 68);
  if (len <= 4) return Math.max(base + 12, 58);
  if (len <= 6) return Math.max(base + 4, 50);
  if (len <= 8) return Math.max(base, 44);
  return Math.max(base - 6, 38);
}

/**
 * opentype.js でテキストをSVGパスデータに変換する
 * フォントファイルから直接グリフのアウトラインを取得するため、
 * サーバーのシステムフォントに依存しない
 */
async function textToSvgPath(text: string, fontSize: number, x: number, y: number): Promise<string> {
  const font = await getFont();
  const path = font.getPath(text, 0, 0, fontSize);
  const bbox = path.getBoundingBox();

  // テキスト幅を計算して中央揃え用のオフセットを算出
  const textWidth = bbox.x2 - bbox.x1;
  const offsetX = x - textWidth / 2 - bbox.x1;
  const offsetY = y;

  // 新しい位置でパスを再生成
  const centeredPath = font.getPath(text, offsetX, offsetY, fontSize);
  return centeredPath.toPathData(2);
}

/**
 * SVGでカラフルテキストオーバーレイを生成し、スタンプ画像に合成する
 * - テキストは画像下部にテキストバンドとして追加
 * - 半透明白背景 + 影ストローク + 白縁取り + カラフルfill の3層テキスト
 * - カラーパレットから colorIndex に応じた色を使用
 * - opentype.js でテキストをSVGパスに変換（システムフォント不要）
 */
export async function compositeTextOverlay(
  imageBuffer: Buffer,
  label: string,
  colorIndex: number = 0
): Promise<Buffer> {
  // まず画像をスタンプ幅に合わせてリサイズ（テキスト領域分を除く）
  const textAreaHeight = 70;
  const charMaxHeight = STAMP_HEIGHT - textAreaHeight;

  const resized = await sharp(imageBuffer)
    .resize(STAMP_WIDTH, charMaxHeight, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const charWidth = meta.width ?? STAMP_WIDTH;
  const charHeight = meta.height ?? charMaxHeight;

  // キャラクター画像をスタンプ全体のキャンバスに配置（上寄せ・中央揃え）
  const charLeft = Math.round((STAMP_WIDTH - charWidth) / 2);

  const withCharacter = await sharp({
    create: {
      width: STAMP_WIDTH,
      height: STAMP_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .png()
    .composite([{
      input: resized,
      top: 0,
      left: charLeft
    }])
    .toBuffer();

  // テキスト用パラメータ
  const fontSize = calculateFontSize(label, STAMP_WIDTH);
  const strokeWidth = Math.max(4, Math.floor(fontSize / 8));
  const colors = getColorByIndex(colorIndex);

  // テキスト配置: キャラクター画像の直下
  const verticalGap = 4;
  const textY = charHeight + verticalGap + Math.floor(fontSize * 0.75);

  // opentype.js でテキストをSVGパスに変換（システムフォント不要）
  const pathData = await textToSvgPath(label, fontSize, STAMP_WIDTH / 2, textY);

  const svgText = `<svg width="${STAMP_WIDTH}" height="${STAMP_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer stroke for pop effect -->
  <path
    d="${pathData}"
    fill="none"
    stroke="rgba(0,0,0,0.3)"
    stroke-width="${strokeWidth + 3}"
    stroke-linejoin="round"
  />
  <!-- White outer border -->
  <path
    d="${pathData}"
    fill="none"
    stroke="${colors.stroke}"
    stroke-width="${strokeWidth}"
    stroke-linejoin="round"
  />
  <!-- Colored fill -->
  <path
    d="${pathData}"
    fill="${colors.fill}"
  />
</svg>`;

  // テキスト SVG を合成
  return sharp(withCharacter)
    .composite([{
      input: Buffer.from(svgText),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer();
}

/**
 * スタンプ画像の後処理パイプライン
 * 1. クロマキー緑背景を透過に変換
 * 2. SVGでカラフルテキストオーバーレイを合成
 * 3. LINE スタンプ仕様のサイズに収める
 * @param colorIndex - カラーパレットのインデックス（バッチ生成時に各スタンプで異なる色を使用）
 */
export async function processStampImage(
  rawImageBuffer: Buffer,
  label: string,
  colorIndex: number = 0
): Promise<Buffer> {
  // 1. 背景透過
  const transparent = await removeGreenBackground(rawImageBuffer);

  // 2. テキスト合成
  const withText = await compositeTextOverlay(transparent, label, colorIndex);

  // 3. 最終リサイズ（念のため仕様内に収める）
  return sharp(withText)
    .resize(STAMP_WIDTH, STAMP_HEIGHT, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
