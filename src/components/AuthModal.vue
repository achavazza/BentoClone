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
const showConfirmation = ref(false);
const registeredEmail = ref('');

async function handleEmailAuth() {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        if (isLogin.value) {
            await store.signInWithEmail(email.value, password.value);
            emit('close');
        } else {
            await store.signUpWithEmail(email.value, password.value);
            registeredEmail.value = email.value;
            showConfirmation.value = true;
            // No emit('close') here, wait for user to read confirmation
        }
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
        <div v-if="!showConfirmation">
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

        <!-- Confirmation Message -->
        <div v-else class="text-center animate-in fade-in zoom-in duration-300">
            <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </div>
            <h4 class="text-xl font-bold mb-2">Check your email</h4>
            <p class="text-gray-500 text-sm mb-8">
                We've sent a confirmation link to <br/>
                <span class="font-bold text-black">{{ registeredEmail }}</span>.<br/>
                Please click the link to activate your account.
            </p>
            <button @click="close" class="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                Got it
            </button>
        </div>
      </div>
    </div>
  </div>
</template>
