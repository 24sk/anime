<script setup lang="ts">
/**
 * 利用規約・プライバシーポリシーページ
 * 利用規約とプライバシーポリシーを1ページで掲載。グローバルメニューから遷移する
 */

useSeoMeta({
  title: '利用規約・プライバシーポリシー',
  description:
    'AniMe（アニミー）の利用規約とプライバシーポリシーです。サービスご利用前にご確認ください。'
});
</script>

<template>
  <div class="py-8 md:py-12">
    <h1 class="text-xl md:text-2xl font-semibold text-brand-700 mb-8">
      利用規約・プライバシーポリシー
    </h1>

    <section class="mb-10">
      <h2 class="text-lg font-semibold text-brand-700 mb-4">
        利用規約
      </h2>
      <div class="prose prose-brand max-w-none text-sm text-default space-y-3 leading-relaxed">
        <p>
          本利用規約は、AniMe（アニミー）（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただくことで、本規約に同意したものとみなします。
        </p>
        <h3 class="text-base font-medium mt-4">
          第1条（適用）
        </h3>
        <p>
          本規約は、ユーザーと本サービス提供者との間の本サービスの利用に関わる一切の関係に適用されるものとします。
        </p>
        <h3 class="text-base font-medium mt-4">
          第2条（禁止事項）
        </h3>
        <p>
          ユーザーは、本サービスの利用にあたり、法令または公序良俗に反する行為、他のユーザーまたは第三者に不利益・損害を与える行為、本サービスの運営を妨害する行為を行ってはならないものとします。
        </p>
        <h3 class="text-base font-medium mt-4">
          第3条（サービスの変更・終了）
        </h3>
        <p>
          本サービス提供者は、必要に応じて本サービスの内容を変更し、または本サービスの提供を終了することができるものとします。
        </p>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-brand-700 mb-4">
        プライバシーポリシー
      </h2>
      <div class="prose prose-brand max-w-none text-sm text-default space-y-3 leading-relaxed">
        <p>
          AniMe（アニミー）は、ユーザーの個人情報の保護を重要な責務とし、以下の方針に従って適切に取り扱います。
        </p>
        <h3 class="text-base font-medium mt-4">
          収集する情報
        </h3>
        <p>
          本サービスでは、匿名セッションID、アップロードされた画像、生成結果の画像を一時的に処理・保存します。これらはサービス提供に必要な範囲で利用し、一定期間経過後に削除する設計です。
        </p>
        <h3 class="text-base font-medium mt-4">
          利用目的
        </h3>
        <p>
          収集した情報は、アイコン生成の提供、サービスの改善、不正利用の防止のために利用します。
        </p>
        <h3 class="text-base font-medium mt-4">
          第三者提供
        </h3>
        <p>
          法令に基づく場合を除き、ユーザーの同意なく個人を特定できる情報を第三者に提供することはありません。
        </p>
      </div>
    </section>

    <p class="mt-10 text-sm text-muted">
      <NuxtLink
        to="/"
        class="text-primary hover:underline"
      >
        トップページへ戻る
      </NuxtLink>
    </p>
  </div>
</template>
