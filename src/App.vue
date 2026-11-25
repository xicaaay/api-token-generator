<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

import { useTheme } from '@/composables/useTheme'
import HomeView from '@/views/HomeView.vue'

const { theme, initializeTheme } = useTheme()
initializeTheme()
</script>

<template>
  <HomeView />
  <Toaster :theme="theme" position="top-right" close-button :duration="2600" />
</template>
