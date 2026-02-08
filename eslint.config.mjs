// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  // セミコロンを付与する方針のため、@stylistic/semi を明示的に "always" に設定
  {
    rules: {
      '@stylistic/semi': ['error', 'always']
    }
  },
  // nuxt.config.ts のみメンバー区切りをカンマに（IDE と pre-commit の挙動差を解消）
  {
    files: ['nuxt.config.ts'],
    rules: {
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: { delimiter: 'comma', requireLast: true },
          singleline: { delimiter: 'comma', requireLast: false }
        }
      ]
    }
  }
);
