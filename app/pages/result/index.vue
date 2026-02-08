<script setup lang="ts">
import { useAnonSession } from '~/composables/useAnonSession';

const generationStore = useGenerationStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

/** 開発時のみ: 画面表示確認用プレビューモード（?preview=1 でリダイレクトせず表示、画像なし時はサンプル表示） */
const isPreviewMode
  = import.meta.dev
    && route.query.preview === '1';

/** トップへ戻る（もう一度作る） */
function goHome() {
  generationStore.reset();
  router.push('/');
}

/** 画像をダウンロード */
async function downloadImage() {
  if (!generationStore.resultImageUrl) return;

  try {
    const response = await fetch(generationStore.resultImageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anime-pet-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.add({
      title: 'ダウンロード完了',
      description: '画像を保存しました',
      icon: 'i-heroicons-check-circle',
      color: 'success'
    });
  } catch (error) {
    console.error('Download failed', error);
    toast.add({
      title: 'ダウンロード失敗',
      description: '画像の保存に失敗しました',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    });
  }
}

/** X (Twitter) でシェア */
function shareOnTwitter() {
  const text = encodeURIComponent('うちのペットがアニメキャラになったよ！\n\n');
  const hashtags = encodeURIComponent('AniMe,AI画像生成,ペット');
  const url = encodeURIComponent(window.location.origin); // 本番環境のURLに置き換えるべき

  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`,
    '_blank'
  );
}

/** フィードバック送信 */
async function sendFeedback(type: 'good' | 'bad') {
  if (!generationStore.jobId) return;

  try {
    const { getAnonSessionId } = useAnonSession();
    const anonSessionId = getAnonSessionId();

    await $fetch('/api/feedback', {
      method: 'POST',
      body: {
        job_id: generationStore.jobId,
        anon_session_id: anonSessionId,
        feedback_type: type,
        selected_style: generationStore.selectedStyle,
        free_text: generationStore.freeText
      }
    });

    toast.add({
      title: 'ありがとう！',
      description: 'フィードバックを受け付けました',
      icon: 'i-heroicons-hand-thumb-up',
      color: 'primary'
    });
  } catch (error) {
    console.error('Feedback failed', error);
    toast.add({
      title: 'エラー',
      description: 'フィードバックの送信に失敗しました',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    });
  }
}

/**
 * 結果画面ではブラウザバック・戻るを無効にする
 * ただし AniMe ロゴクリック（トップへ）は許可。「もう一度作る」は goHome() で reset 後に遷移
 */
onBeforeRouteLeave((to, _from, next) => {
  if (generationStore.status === 'completed' && to.path !== '/') {
    toast.add({
      title: '「もう一度作る」からトップへ戻れます',
      color: 'warning'
    });
    next(false);
    return;
  }
  next();
});

onMounted(() => {
  // 開発時プレビューモード: ?preview=1 でリダイレクトせず、画像がなければサンプルを表示
  if (isPreviewMode) {
    if (!generationStore.resultImageUrl) {
      const customImage = route.query.image;
      const sampleUrl = typeof customImage === 'string' && customImage
        ? customImage.startsWith('/') ? customImage : `/${customImage}`
        : '/images/sample.jpg';
      generationStore.setResultImageUrl(sampleUrl);
    }
    if (!generationStore.jobId) {
      generationStore.setJobId('00000000-0000-0000-0000-000000000000');
    }
    if (generationStore.status !== 'completed') {
      generationStore.setStatus('completed');
    }
    return;
  }

  if (!generationStore.jobId || generationStore.status !== 'completed') {
    if (!generationStore.resultImageUrl) {
      router.replace('/');
    }
  }
});
</script>

<template>
  <div class="py-8 max-w-md mx-auto px-4">
    <!-- 開発時プレビューモードであることを示すラベル（デバッグ用） -->
    <p
      v-if="isPreviewMode"
      class="mb-2 text-center text-xs text-amber-600 dark:text-amber-400"
    >
      [プレビュー] /result?preview=1 または ?preview=1&image=/path で表示
    </p>
    <h1 class="text-2xl font-bold text-center mb-8 text-primary-500">
      完成しました！
    </h1>

    <!-- メイン画像（1:1アスペクト比はTailwindのaspect-squareで維持） -->
    <UCard class="overflow-hidden ring-4 ring-primary-100 dark:ring-primary-900 border-0 shadow-xl">
      <div class="aspect-square w-full">
        <NuxtImg
          v-if="generationStore.resultImageUrl"
          :src="generationStore.resultImageUrl"
          alt="生成されたペットアイコン"
          class="w-full h-full object-cover"
          width="512"
          height="512"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400"
        >
          <UIcon
            name="i-heroicons-photo"
            class="w-12 h-12"
          />
        </div>
      </div>
    </UCard>

    <!-- アクションボタン -->
    <div class="mt-8 flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-3">
        <UButton
          size="lg"
          block
          color="primary"
          variant="solid"
          icon="i-heroicons-arrow-down-tray"
          class="rounded-3xl"
          @click="downloadImage"
        >
          保存
        </UButton>

        <UButton
          size="lg"
          block
          color="neutral"
          variant="solid"
          icon="i-simple-icons-x"
          class="rounded-3xl !bg-black !text-white hover:!bg-gray-800"
          @click="shareOnTwitter"
        >
          Post
        </UButton>
      </div>

      <!-- LINEスタンプ作成機能への入口。LINEブランドカラーでユーザーに分かりやすく（仕様: docs/features/ui/line-stamp.md） -->
      <NuxtLink
        to="/result/line-stamp"
        class="block"
      >
        <UButton
          size="lg"
          block
          color="neutral"
          variant="solid"
          icon="i-simple-icons-line"
          class="rounded-3xl w-full bg-[#06C755]! text-white! hover:bg-[#05a84a]!"
        >
          LINEスタンプ用に作る
        </UButton>
      </NuxtLink>

      <UButton
        size="lg"
        block
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-path"
        class="rounded-3xl"
        @click="goHome"
      >
        もう一度作る
      </UButton>
    </div>

    <!-- フィードバック -->
    <div class="mt-10 flex flex-col items-center">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        仕上がりはどうですか？
      </p>
      <div class="flex gap-4">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-hand-thumb-up"
          size="xl"
          class="hover:scale-110 transition-transform hover:text-primary-500"
          @click="sendFeedback('good')"
        />
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-hand-thumb-down"
          size="xl"
          class="hover:scale-110 transition-transform hover:text-red-500"
          @click="sendFeedback('bad')"
        />
      </div>
    </div>
  </div>
</template>
