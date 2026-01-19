<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '../stores/profile'
import { Loader2, Check, X } from 'lucide-vue-next'

const store = useProfileStore()
const router = useRouter()

const handle = ref('')
const isChecking = ref(false)
const isAvailable = ref(null) // true, false, or null (not checked)
const isSaving = ref(false)
const errorMsg = ref('')

// Redirect if not logged in
onMounted(() => {
    store.initAuth()
    if (!store.user) {
        router.push('/')
    } else if (store.profile && !store.profile.username.includes('user_')) {
        // Already has a set handle? Redirect to it? 
        // Or maybe they want to change it?
        // Let's assume this view is for setting it initially.
        handle.value = store.profile.username
    }
})

let debounceTimer = null

watch(handle, (newVal) => {
    isAvailable.value = null
    errorMsg.value = ''
    
    // Simple validation
    const clean = newVal.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (newVal !== clean) {
        handle.value = clean
        return
    }

    if (clean.length < 3) return

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => checkAvailability(clean), 500)
})

async function checkAvailability(username) {
    isChecking.value = true
    const available = await store.checkHandleAvailability(username)
    isAvailable.value = available
    isChecking.value = false
    if (!available) errorMsg.value = 'Username is taken'
}

async function saveHandle() {
    if (!isAvailable.value) return
    
    isSaving.value = true
    const success = await store.updateHandle(handle.value)
    if (success) {
        router.push(`/${handle.value}`)
    } else {
        errorMsg.value = 'Error saving handle'
    }
    isSaving.value = false
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] p-4">
    <div class="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl animate-in fade-in zoom-in duration-500">
        <h2 class="text-3xl font-black mb-2 text-center">Claim your Bento</h2>
        <p class="text-gray-500 text-center mb-8">Choose a unique username for your profile.</p>

        <div class="relative mb-6">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="text-gray-400 font-bold">bento.me/</span>
            </div>
            <input 
                v-model="handle" 
                type="text" 
                class="w-full pl-24 pr-10 py-4 bg-gray-50 border-2 rounded-2xl font-bold text-lg outline-none transition-colors"
                :class="isAvailable === true ? 'border-green-500 text-green-700 bg-green-50' : (isAvailable === false ? 'border-red-300 bg-red-50 text-red-900' : 'border-transparent focus:border-black')"
                placeholder="username"
                autofocus
            />
            <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Loader2 v-if="isChecking" class="w-5 h-5 text-gray-400 animate-spin" />
                <Check v-else-if="isAvailable === true" class="w-5 h-5 text-green-500" />
                <X v-else-if="isAvailable === false" class="w-5 h-5 text-red-500" />
            </div>
        </div>

        <p v-if="errorMsg" class="text-red-500 text-sm font-medium text-center mb-4">{{ errorMsg }}</p>

        <button 
            @click="saveHandle"
            :disabled="!isAvailable || isSaving || handle.length < 3"
            class="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
            <span v-if="isSaving">Saving...</span>
            <span v-else>Continue</span>
        </button>
    </div>
  </div>
</template>
