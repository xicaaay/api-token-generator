import { readonly, ref } from 'vue'

export type AppTheme = 'light' | 'dark'

const theme = ref<AppTheme>('light')
let initialized = false

function getPreferredTheme(): AppTheme {
  try {
    const savedTheme = window.localStorage.getItem('api-key-theme')

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }
  } catch {
    // Local storage can be unavailable in private or restricted contexts.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(nextTheme: AppTheme): void {
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeColor?.setAttribute('content', nextTheme === 'dark' ? '#0a0a0a' : '#ffffff')
}

export function useTheme() {
  function initializeTheme(): void {
    if (initialized || typeof window === 'undefined') {
      return
    }

    initialized = true
    applyTheme(getPreferredTheme())
  }

  function setTheme(nextTheme: AppTheme): void {
    applyTheme(nextTheme)

    try {
      window.localStorage.setItem('api-key-theme', nextTheme)
    } catch {
      // The visual theme still works even when persistence is unavailable.
    }
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(theme),
    initializeTheme,
    setTheme,
    toggleTheme,
  }
}
