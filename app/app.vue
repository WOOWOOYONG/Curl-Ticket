<script setup>
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Curl Ticket'
const description =
  'Curl Ticket is a ticketing system that allows users to create, manage, and track support tickets efficiently.'

// Build an absolute URL for the OG image (social crawlers require absolute URLs)
const ogImage = new URL('/og-image.png', useRequestURL().origin).href

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage,
  twitterImage: ogImage,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="#10b981"
      :height="3"
      :throttle="150"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
