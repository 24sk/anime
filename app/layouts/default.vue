<script setup lang="ts">
const helpModalOpen = ref(false)
</script>

<template>
  <div>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center"
        >
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <template #right>
        <UModal
          v-model:open="helpModalOpen"
          title="使い方"
          description="AniMeの使い方をご紹介します"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-help-circle"
            aria-label="使い方"
            label="使い方"
          />

          <template #body>
            <div class="space-y-4">
              <div>
                <h3 class="font-semibold mb-2">
                  1. ペットの写真をアップロード
                </h3>
                <p class="text-sm text-muted">
                  可愛いペットの写真を選択してください。ドラッグ&ドロップでも対応しています。
                </p>
              </div>

              <div>
                <h3 class="font-semibold mb-2">
                  2. スタイルを選択
                </h3>
                <p class="text-sm text-muted">
                  お好みのスタイルを選択してください。3Dアニメ、水彩画、ゆるふわ手書きなど、6種類のスタイルから選べます。
                </p>
              </div>

              <div>
                <h3 class="font-semibold mb-2">
                  3. フリーテキストを入力（任意）
                </h3>
                <p class="text-sm text-muted">
                  「リボンをつけて」「笑顔で」など、フリーテキストがあれば入力してください。
                </p>
              </div>

              <div>
                <h3 class="font-semibold mb-2">
                  4. 生成開始
                </h3>
                <p class="text-sm text-muted">
                  「生成する」ボタンをクリックすると、AIがアイコンを生成します。生成中は広告が表示されます。
                </p>
              </div>

              <div>
                <h3 class="font-semibold mb-2">
                  5. ダウンロード
                </h3>
                <p class="text-sm text-muted">
                  生成が完了したら、広告視聴後にダウンロードボタンが有効になります。SNSアイコンとして使えるよう、円形マスクのプレビューも確認できます。
                </p>
              </div>
            </div>
          </template>
        </UModal>

        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
