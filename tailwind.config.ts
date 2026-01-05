import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        // コーラルピンクのカラーパレットを定義
        'coral-pink': {
          50: '#FFF5F5',
          100: '#FFE6E6',
          200: '#FFCDCD',
          300: '#FFB3B3',
          400: '#FF9A9A',
          500: '#FF7F7F', // メインとなる色
          600: '#E67272',
          700: '#B35959',
          800: '#803F3F',
          900: '#4D2626',
          950: '#261313'
        }
      }
    }
  }
}
