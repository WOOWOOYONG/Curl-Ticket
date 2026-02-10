export function useNotifications() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const { data: notificationsData, refresh: refreshNotifications } = useFetch('/api/notifications', {
    key: 'notifications'
  })

  const { data: unreadCountData, refresh: refreshUnreadCount } = useFetch('/api/notifications/unread-count', {
    key: 'notifications-unread-count'
  })

  const notifications = computed(() => notificationsData.value?.data ?? [])
  const unreadCount = computed(() => unreadCountData.value?.data ?? 0)

  function refresh() {
    refreshNotifications()
    refreshUnreadCount()
  }

  // Supabase Realtime 訂閱
  const channel = ref<ReturnType<typeof supabase.channel> | null>(null)
  const authUserId = computed(() => {
    const currentUser = user.value as { id?: string, sub?: string } | null
    return currentUser?.id ?? currentUser?.sub ?? null
  })

  function subscribe(userId: string) {
    unsubscribe()

    const nextChannel = supabase
      .channel(`notifications-realtime:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          refresh()
        }
      )

    nextChannel.subscribe()
    channel.value = nextChannel
  }

  function unsubscribe() {
    if (channel.value) {
      void channel.value.unsubscribe()
      channel.value = null
    }
  }

  watch(authUserId, (userId) => {
    if (!userId) {
      unsubscribe()
      return
    }

    subscribe(userId)
  }, { immediate: true })

  onScopeDispose(() => {
    unsubscribe()
  })

  async function markAsRead(notificationId: string) {
    await $fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' })
    refresh()
  }

  return {
    notifications,
    unreadCount,
    refresh,
    markAsRead
  }
}
