<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

import { useTheme } from '@/composables/useTheme'

const { theme, initializeTheme } = useTheme()
initializeTheme()
</script>

<template>
  <RouterView />
  <Toaster :theme="theme" position="top-right" close-button :duration="2600" />
</template>
