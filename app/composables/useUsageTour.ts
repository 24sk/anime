/**
 * 使い方ガイド（Driver.js）のステップ定義
 * トップ画面（/）の要素を順にハイライトして操作手順を案内する
 */

/** Driver.js のステップ定義（useDriver に渡す形式） */
export interface UsageTourStep {
  element?: string
  popover: {
    title: string
    description: string
    side?: 'top' | 'right' | 'bottom' | 'left'
  }
}

/**
 * 使い方ツアーのステップ定義
 * 各ステップは index.vue に付与した id（#tour-*）をターゲットとする
 */
export const usageTourSteps: UsageTourStep[] = [
  {
    element: '#tour-upload',
    popover: {
      title: '1. ペットの写真をアップロード',
      description: '可愛い写真を選んでね。ドラッグ&ドロップまたはクリックで選択できます（4.5MBまで）。',
      side: 'bottom'
    }
  },
  {
    element: '#tour-style',
    popover: {
      title: '2. スタイルを選択',
      description: 'お好みのスタイルを1つ選んでください。3Dアニメ、水彩画、ゆるふわ手書き、サイバーパンク、韓国風、シンプルイラストの6種類から選べます。',
      side: 'bottom'
    }
  },
  {
    element: '#tour-freetext',
    popover: {
      title: '3. フリーテキストを入力（任意）',
      description: '「リボンをつけて」「笑顔で」「背景をシンプルに」など、ペットの特徴や要望があれば入力してください。',
      side: 'bottom'
    }
  },
  {
    element: '#tour-generate',
    popover: {
      title: '4. アイコンを作成',
      description: '「アイコンを作成する」ボタンをクリックすると、AIがアイコンを生成します。生成中は広告が表示されます。',
      side: 'top'
    }
  },
  {
    popover: {
      title: '5. ダウンロード',
      description: '生成が完了したら、広告視聴後にダウンロードボタンが有効になります。',
      side: 'left'
    }
  }
]
