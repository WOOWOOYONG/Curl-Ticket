<script setup lang="ts">
export interface NavItem {
  to: string
  icon: string
  label: string
}

const props = withDefaults(
  defineProps<{
    navItems?: NavItem[]
  }>(),
  {
    navItems: () => []
  }
)

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const colorMode = useColorMode()
const { t } = useI18n()

function isActive(item: NavItem) {
  return item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)
}

const themePreferenceLabel = computed(() => {
  if (colorMode.preference === 'dark') return t('nav.themeDark')
  if (colorMode.preference === 'light') return t('nav.themeLight')
  return t('nav.themeSystem')
})

const items = computed(() => [
  {
    label: `${t('nav.theme')} (${themePreferenceLabel.value})`,
    icon: 'i-lucide-palette',
    children: [
      {
        type: 'checkbox' as const,
        label: t('nav.themeLight'),
        icon: 'i-lucide-sun',
        checked: colorMode.preference === 'light',
        onSelect: () => {
          colorMode.preference = 'light'
        }
      },
      {
        type: 'checkbox' as const,
        label: t('nav.themeDark'),
        icon: 'i-lucide-moon',
        checked: colorMode.preference === 'dark',
        onSelect: () => {
          colorMode.preference = 'dark'
        }
      },
      {
        type: 'checkbox' as const,
        label: t('nav.themeSystem'),
        icon: 'i-lucide-monitor',
        checked: colorMode.preference === 'system',
        onSelect: () => {
          colorMode.preference = 'system'
        }
      }
    ]
  },
  {
    type: 'separator' as const
  },
  {
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await supabase.auth.signOut()
      navigateTo('/login')
    }
  }
])
</script>

<template>
  <ClientOnly>
    <UHeader
      :toggle="!!user"
      :ui="{
        root: 'bg-slate-50/85 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-white/10 backdrop-blur',
        container: 'max-w-full',
        right: 'gap-6'
      }"
    >
      <template #title>
        <NuxtLink to="/">
          <span class="text-lg font-bold">Curl Ticket</span>
        </NuxtLink>
      </template>

      <template #body>
        <nav class="flex flex-col gap-1">
          <UButton
            v-for="item in props.navItems"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :color="isActive(item) ? 'primary' : 'neutral'"
            :variant="isActive(item) ? 'soft' : 'ghost'"
            :class="['w-full justify-start', isActive(item) && 'font-semibold']"
          >
            {{ item.label }}
          </UButton>
        </nav>
      </template>

      <template #right>
        <LocaleSwitcher />
        <NotificationBell v-if="user" />
        <UDropdownMenu
          v-if="user"
          :items="items"
        >
          <UAvatar
            :src="user.user_metadata?.avatar_url"
            :alt="user.user_metadata?.full_name"
            size="sm"
            class="cursor-pointer"
          />
        </UDropdownMenu>
      </template>
    </UHeader>

    <template #fallback>
      <header
        class="sticky top-0 z-50 h-(--ui-header-height) border-b border-slate-200/80 bg-slate-50/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/70"
      >
        <div
          class="mx-auto flex h-full w-full max-w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
        >
          <NuxtLink
            to="/"
            class="text-lg font-bold"
          >
            Curl Ticket
          </NuxtLink>
        </div>
      </header>
    </template>
  </ClientOnly>
</template>
