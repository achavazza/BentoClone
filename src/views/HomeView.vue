<script setup>
import { useProfileStore } from '../stores/profile'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { Link2, LayoutGrid, BarChart3, ArrowRight } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'

const store = useProfileStore()
const router = useRouter()

onMounted(() => {
    store.initAuth()
})

async function getStarted() {
    if (store.user) {
        const { data } = await supabase.from('profiles').select('username').eq('id', store.user.id).single()
        router.push(data?.username ? `/${data.username}` : '/welcome')
    } else {
        router.push('/welcome')
    }
}

const features = [
    {
        icon: Link2,
        title: 'One link for everything',
        text: 'Share a single URL with all your links, socials and content in one place.'
    },
    {
        icon: LayoutGrid,
        title: 'A grid that is yours',
        text: 'Drag and drop widgets, colours and images to build a page that looks like you.'
    },
    {
        icon: BarChart3,
        title: 'Know your audience',
        text: 'Built-in analytics show visits, clicks and where your visitors come from.'
    }
]
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white text-gray-900">
    <!-- Header -->
    <header class="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
      <h1 class="text-2xl font-black tracking-tighter">bento<span class="text-gray-400">.clone</span></h1>
      <nav class="flex items-center gap-3">
        <router-link to="/login" class="text-sm font-bold text-gray-500 hover:text-black transition-colors px-3 py-2">
          Log in
        </router-link>
        <router-link to="/welcome" class="text-sm font-bold bg-black text-white rounded-xl px-4 py-2 hover:bg-gray-800 transition-colors">
          Get started
        </router-link>
      </nav>
    </header>

    <!-- Hero -->
    <main class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="max-w-3xl w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <p class="inline-block text-xs font-bold uppercase tracking-widest text-gray-400 border border-gray-200 rounded-full px-4 py-1.5 mb-6">
          Link in bio, but rich.
        </p>
        <h2 class="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-6">
          Your whole identity<br />in one <span class="text-gray-400">bento box</span>.
        </h2>
        <p class="text-lg md:text-xl text-gray-500 font-medium max-w-xl mx-auto mb-10">
          Create a beautiful profile page, organize your links as widgets and share it with the world. Free, simple and yours.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            @click="getStarted"
            class="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            Claim your page
            <ArrowRight class="w-5 h-5" />
          </button>
          <router-link
            to="/login"
            class="w-full sm:w-auto px-8 py-4 bg-gray-100 text-black rounded-2xl font-bold text-lg hover:bg-gray-200 transition-colors"
          >
            Log in
          </router-link>
        </div>
      </div>

      <!-- Features -->
      <section class="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-24 mb-16 text-left">
        <div v-for="feature in features" :key="feature.title" class="bg-gray-50 border border-black/5 rounded-3xl p-6">
          <div class="w-10 h-10 bg-white border border-black/5 rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <component :is="feature.icon" class="w-5 h-5 text-gray-700" />
          </div>
          <h3 class="font-bold mb-1">{{ feature.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">{{ feature.text }}</p>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="w-full border-t border-gray-100">
      <div class="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 font-medium">
        <p>&copy; {{ new Date().getFullYear() }} bento.clone &mdash; a demo link-in-bio project.</p>
        <p>This site hosts user-generated profile pages. <router-link to="/login" class="hover:text-black transition-colors">Report abuse</router-link></p>
      </div>
    </footer>
  </div>
</template>
