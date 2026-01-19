<script setup>
import { ref, watch } from 'vue';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next';
import { useProfileStore } from '../stores/profile';

const props = defineProps({
  isOpen: Boolean,
  currentHandle: String
});

const emit = defineEmits(['close']);

const store = useProfileStore();
const newHandle = ref('');
const isChecking = ref(false);
const isAvailable = ref(null);
const errorMessage = ref('');
const isSaving = ref(false);
const showConfirm = ref(false);

watch(() => props.isOpen, (val) => {
    if (val) {
        newHandle.value = props.currentHandle;
        isAvailable.value = null;
        errorMessage.value = '';
        showConfirm.value = false;
    }
});

async function checkAvailability() {
    if (!newHandle.value || newHandle.value === props.currentHandle) {
        isAvailable.value = null;
        return;
    }
    
    // Basic validation
    if (!/^[a-z0-9_]{3,15}$/.test(newHandle.value)) {
        isAvailable.value = false;
        errorMessage.value = '3-15 chars, lowercase & numbers only';
        return;
    }

    isChecking.value = true;
    isAvailable.value = await store.checkHandleAvailability(newHandle.value);
    errorMessage.value = isAvailable.value ? '' : 'This handle is already taken';
    isChecking.value = false;
}

// Debounced check
let checkTimeout = null;
function handleInput() {
    clearTimeout(checkTimeout);
    isAvailable.value = null;
    checkTimeout = setTimeout(checkAvailability, 500);
}

async function handleSave() {
    isSaving.value = true;
    const result = await store.updateHandle(newHandle.value);
    isSaving.value = false;
    
    if (result.success) {
        emit('close');
        window.location.href = `/${newHandle.value}`; // Redirect to new handle
    } else {
        errorMessage.value = result.error;
        showConfirm.value = false;
    }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" @click.self="$emit('close')">
    <div class="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="font-black text-xl tracking-tight">Profile Settings</h3>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-8">
        <div v-if="!showConfirm">
            <label class="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Change your handle</label>
            
            <div class="relative">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">bento.me/</div>
                <input 
                    v-model="newHandle" 
                    @input="handleInput"
                    placeholder="yourname"
                    class="w-full pl-24 pr-12 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-black outline-none font-bold transition-all"
                    :class="{'border-red-100 text-red-500': isAvailable === false}"
                />
                
                <div class="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 v-if="isChecking" class="w-5 h-5 animate-spin text-gray-300" />
                    <CheckCircle2 v-else-if="isAvailable === true" class="w-5 h-5 text-green-500" />
                    <AlertCircle v-else-if="isAvailable === false" class="w-5 h-5 text-red-500" />
                </div>
            </div>

            <p v-if="errorMessage" class="mt-3 text-xs font-bold text-red-500 px-1">{{ errorMessage }}</p>
            <p v-else class="mt-3 text-xs font-medium text-gray-400 px-1">You can change your handle once every 24 hours.</p>

            <button 
                @click="showConfirm = true"
                :disabled="!isAvailable || isSaving"
                class="w-full mt-8 py-4 bg-black text-white rounded-2xl font-black disabled:opacity-20 transition-all active:scale-95"
            >
                Continue
            </button>
        </div>

        <!-- Confirmation State -->
        <div v-else class="text-center animate-in slide-in-from-bottom-4 duration-300">
            <div class="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle class="w-8 h-8" />
            </div>
            <h4 class="text-lg font-black mb-2">Are you sure?</h4>
            <p class="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
                Your profile will now be at <br/>
                <span class="font-bold text-black">bento.me/{{ newHandle }}</span>.<br/>
                The old link will stop working immediately.
            </p>

            <div class="flex flex-col gap-3">
                <button 
                    @click="handleSave"
                    :disabled="isSaving"
                    class="w-full py-4 bg-black text-white rounded-2xl font-black flex items-center justify-center gap-2"
                >
                    <Loader2 v-if="isSaving" class="w-5 h-5 animate-spin" />
                    Confirm Change
                </button>
                <button 
                    @click="showConfirm = false"
                    :disabled="isSaving"
                    class="w-full py-3 text-gray-400 font-bold hover:text-black transition-colors"
                >
                    Go back
                </button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
