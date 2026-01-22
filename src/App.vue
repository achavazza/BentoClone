<script setup>
import { RouterView, useRouter, useRoute } from 'vue-router'
import { watch, onMounted } from 'vue'
import { useProfileStore } from './stores/profile'
import { supabase } from './lib/supabase'

const store = useProfileStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
    store.initAuth()
})

// Global Login Redirect
watch(() => store.user, async (newUser, oldUser) => {
    // If we transitioned from no-user to user (fresh login or session init)
    // Or if we are on the Home page and have a user (home redirect)
    const isAtHome = route.path === '/'
    
    // We only want to trigger a redirect if it's a "significant" change 
    // or if the user is just hanging out on the Home page logged in.
    if (newUser && (isAtHome || !oldUser)) {
        const { data } = await supabase.from('profiles').select('username').eq('id', newUser.id).single()
        
        if (data?.username) {
            const targetPath = `/${data.username}`
            // Avoid redundant navigation
            if (route.path !== targetPath) {
                router.push(targetPath)
            }
        }
    }
})
</script>

<template>
  <RouterView />
</template>
