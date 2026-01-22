<script setup>
import { useProfileStore } from '../stores/profile'
import { useRouter } from 'vue-router'
import { onMounted, watch, ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'

const store = useProfileStore()
const router = useRouter()

const isLogin = ref(true) // Toggle between Login and Signup
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

// Email Auth Handler
async function handleEmailAuth() {
    isLoading.value = true
    errorMsg.value = ''
    try {
        if (isLogin.value) {
            await store.signInWithEmail(email.value, password.value)
        } else {
            await store.signUpWithEmail(email.value, password.value)
        }
    } catch (e) {
        errorMsg.value = e.message
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
    <div class="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 class="text-6xl font-black mb-2 tracking-tighter">bento<span class="text-gray-400">.clone</span></h1>
        <p class="text-xl text-gray-500 mb-8 font-medium">Link in bio, but rich.</p>

        <!-- Auth Card -->
        <div class="bg-white p-8 rounded-3xl shadow-xl mb-8">
            <!-- Google Button -->
            <button 
                @click="store.signInWithGoogle"
                class="w-full py-3 mb-6 bg-black text-white rounded-xl font-bold hover:bg-gray-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" />
                {{ isLogin ? 'Log in' : 'Sign up' }} with Google
            </button>

            <div class="relative mb-6">
                <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
                <div class="relative flex justify-center text-sm"><span class="px-2 bg-white text-gray-400">Or with email</span></div>
            </div>

            <form @submit.prevent="handleEmailAuth" class="flex flex-col gap-3">
                <input v-model="email" type="email" placeholder="Email" required class="p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-black outline-none transition-colors" />
                <input v-model="password" type="password" placeholder="Password" required class="p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-black outline-none transition-colors" />
                
                <p v-if="errorMsg" class="text-red-500 text-sm font-medium">{{ errorMsg }}</p>

                <button type="submit" :disabled="isLoading" class="w-full py-3 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
                    <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin mx-auto" />
                    <span v-else>{{ isLogin ? 'Log In' : 'Sign Up' }}</span>
                </button>
            </form>

            <div class="mt-6 text-sm">
                <span class="text-gray-400">{{ isLogin ? "Don't have an account?" : "Already have an account?" }}</span>
                <button @click="isLogin = !isLogin" class="ml-1 font-bold hover:underline">{{ isLogin ? 'Sign up' : 'Log in' }}</button>
            </div>
        </div>
    </div>
  </div>
</template>
