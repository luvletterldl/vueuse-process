import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
} from 'unocss'

const shortcuts = {
  cp: 'cursor-pointer pointer-events-auto',
  cna: 'cursor-not-allowed pointer-events-none',
  fc: 'flex flex-col',
  fr: 'flex-row',
  ic: 'items-center',
  jc: 'justify-center',
  jb: 'justify-between',
}

export default defineConfig({
  shortcuts: [shortcuts],
  safelist: [...Object.keys(shortcuts)],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  rules: [
    [/^text-(.*)$/, ([, c], { theme }) => {
      if (theme.colors[c])
        return { color: theme.colors[c] }
    }],
  ],
  theme: {
    colors: {
    },
  },
})
