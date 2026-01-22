<script setup>
import { ref } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import { useProfileStore } from '../stores/profile';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const store = useProfileStore();
const isLogin = ref(true);
const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMsg = ref('');

async function handleEmailAuth() {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        if (isLogin.value) {
            await store.signInWithEmail(email.value, password.value);
        } else {
            await store.signUpWithEmail(email.value, password.value);
        }
        // If successful, the auth listener in ProfileView or HomeView will handle redirect/refresh
        emit('close');
    } catch (e) {
        errorMsg.value = e.message;
    } finally {
        isLoading.value = false;
    }
}

async function handleGoogleAuth() {
    try {
        await store.signInWithGoogle();
        emit('close');
    } catch (e) {
        errorMsg.value = e.message;
    }
}

function close() {
    emit('close');
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="font-bold text-lg">{{ isLogin ? 'Log in' : 'Sign up' }}</h3>
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-8">
        <!-- Google Button -->
        <button 
            @click="handleGoogleAuth"
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

        <div class="mt-6 text-sm text-center">
            <span class="text-gray-400">{{ isLogin ? "Don't have an account?" : "Already have an account?" }}</span>
            <button @click="isLogin = !isLogin" class="ml-1 font-bold hover:underline text-black">{{ isLogin ? 'Sign up' : 'Log in' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
