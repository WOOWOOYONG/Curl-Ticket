<script setup lang="ts">
import type { NavItem } from '~/components/AppHeader.vue'
import { UserRole } from '~~/shared/constants'

interface SubMenu {
  prefix: string
  label: string
  icon: string
  backTo: string
  children: NavItem[]
}

type NavState =
  | {
      mode: 'main'
      items: NavItem[]
    }
  | {
      mode: 'sub'
      menu: SubMenu
      activeItem: NavItem | undefined
    }

function resolveNavState(path: string, mainItems: NavItem[], subMenus: SubMenu[]): NavState {
  const matched = subMenus.find((m) => path.startsWith(m.prefix))
  if (matched) {
    const exact = matched.children.find((c) => c.to === path)
    const byPrefix = matched.children
      .filter((c) => c.to !== matched.prefix && path.startsWith(c.to))
      .sort((a, b) => b.to.length - a.to.length)[0]
    return { mode: 'sub', menu: matched, activeItem: exact ?? byPrefix }
  }
  return { mode: 'main', items: mainItems }
}

function isActive(item: NavItem, path: string) {
  return item.to === '/' ? path === '/' : path.startsWith(item.to)
}

const route = useRoute()

const { profile, fetchProfile } = useProfile()
// Silently catch: unauthenticated visitors won't have a profile — that's fine,
// but the await is needed so SSR renders the same nav items as the client.
await fetchProfile().catch(() => {})

const { t } = useI18n()

const hasProfile = computed(() => !!profile.value)
const { data: myIssuesSummaryData } = useMyIssuesSummary(hasProfile)

const myIssuesBadge = computed(() => {
  const s = myIssuesSummaryData.value?.summary
  if (!s) return undefined
  const n = s.open + s.inProgress
  return n > 0 ? n : undefined
})

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [{ to: '/', icon: 'i-lucide-folder', label: t('nav.projects') }]
  if (profile.value) {
    items.push({
      to: '/my-issues',
      icon: 'i-lucide-inbox',
      label: t('nav.myIssues'),
      badge: myIssuesBadge.value
    })
  }
  if (profile.value?.role === UserRole.Admin) {
    items.push({ to: '/admin', icon: 'i-lucide-shield', label: t('nav.admin') })
  }
  return items
})

const subMenus: SubMenu[] = [
  {
    prefix: '/settings',
    label: 'Settings',
    icon: 'i-lucide-settings',
    backTo: '/',
    children: [
      { to: '/settings', icon: 'i-lucide-user', label: 'Profile' },
      { to: '/settings/tokens', icon: 'i-lucide-key', label: 'API Tokens' }
    ]
  }
]

const navState = computed(() => resolveNavState(route.path, navItems.value, subMenus))
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader :nav-items="navItems" />
    <UDashboardGroup class="flex-1 pt-(--ui-header-height)">
      <UDashboardSidebar
        :ui="{
          root: 'bg-slate-50/85 dark:bg-slate-950/70 border-slate-200/80 dark:border-white/10',
          body: 'px-4 py-3'
        }"
      >
        <!-- Sub-menu (drill-down) -->
        <nav
          v-if="navState.mode === 'sub'"
          class="flex flex-col gap-1"
        >
          <UButton
            :to="navState.menu.backTo"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            class="mb-2 w-full justify-start font-semibold"
          >
            {{ navState.menu.label }}
          </UButton>
          <UButton
            v-for="item in navState.menu.children"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :color="navState.activeItem?.to === item.to ? 'primary' : 'neutral'"
            :variant="navState.activeItem?.to === item.to ? 'soft' : 'ghost'"
            :class="[
              'w-full justify-start',
              navState.activeItem?.to === item.to && 'font-semibold'
            ]"
          >
            {{ item.label }}
          </UButton>
        </nav>

        <!-- Main navigation -->
        <nav
          v-else
          class="flex flex-col gap-1"
        >
          <UButton
            v-for="item in navState.items"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :color="isActive(item, route.path) ? 'primary' : 'neutral'"
            :variant="isActive(item, route.path) ? 'soft' : 'ghost'"
            :class="['w-full justify-start', isActive(item, route.path) && 'font-semibold']"
          >
            {{ item.label }}
            <UBadge
              v-if="item.badge"
              color="primary"
              variant="subtle"
              class="ml-auto"
            >
              {{ item.badge }}
            </UBadge>
          </UButton>
          <UButton
            v-for="menu in subMenus"
            :key="menu.prefix"
            :to="menu.children[0]?.to ?? menu.prefix"
            :icon="menu.icon"
            color="neutral"
            variant="ghost"
            class="mt-auto w-full justify-start"
          >
            {{ menu.label }}
            <UIcon
              name="i-lucide-chevron-right"
              class="ml-auto size-4"
            />
          </UButton>
        </nav>
      </UDashboardSidebar>
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-gray-950">
        <slot />
      </main>
    </UDashboardGroup>
  </div>
</template>
