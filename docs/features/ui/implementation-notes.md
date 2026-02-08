# 実装時の注意事項

[← 画面一覧に戻る](../ui-features.md)

---

1. **NuxtUIコンポーネントの優先使用**
   - カスタムコンポーネントを作成する前に、NuxtUIの標準コンポーネントで実装可能か確認すること
   - 必要最小限のカスタマイズに留めること

2. **レスポンシブデザイン**
   - モバイルファーストアプローチで実装すること
   - Tailwind CSS のブレークポイントを活用すること

3. **アクセシビリティ**
   - 適切な `aria-label` や `aria-describedby` を設定すること
   - キーボード操作に対応すること

4. **パフォーマンス**
   - 画像は `NuxtImg` を使用して最適化すること
   - 遅延読み込み（lazy-loading）を適切に設定すること

5. **エラーハンドリング**
   - エラー発生時は `UNotifications` でユーザーフレンドリーなメッセージを表示すること
   - エラー詳細はログに記録し、ユーザーには簡潔なメッセージのみを表示すること

6. **ステート管理（Pinia）**
   - ステート管理は **Pinia** で統一すること
   - ページ間での状態共有には Pinia store を使用すること
   - 画像データ、選択スタイル、フリーテキスト入力は Pinia store で管理すること
   - ストアは `stores/` ディレクトリに配置し、機能ごとに分割すること（例: `stores/generation.ts`）
   - Piniaストアの命名規則: `use[機能名]Store`（例: `useGenerationStore`）
   - ストアの構造例:

     ```typescript
     // stores/generation.ts
     export const useGenerationStore = defineStore('generation', {
       state: () => ({
         imageFile: null as File | null,
         imagePreview: null as string | null,
         selectedStyle: null as string | null,
         freeText: '' as string,
         jobId: null as string | null,
         status: 'idle' as 'idle' | 'generating' | 'completed' | 'error'
       }),
       actions: {
         reset() {
           // ストアをリセット
         }
       }
     })
     ```

7. **API連携**
   - バックエンドAPIとの通信は `useFetch` または `$fetch` を使用すること
   - エラーハンドリングを適切に実装すること
