<script setup>
import { Copy, Check, X, QrCode } from 'lucide-vue-next';
import { ref } from 'vue';
import QrcodeVue from 'qrcode.vue';

const props = defineProps({
  isOpen: Boolean,
  url: String
});

defineEmits(['close']);

const copied = ref(false);
const showQr = ref(false);

function copyLink() {
  navigator.clipboard.writeText(props.url);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative flex flex-col animate-in fade-in zoom-in duration-200">
      
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">Share Profile</h3>
        <button @click="$emit('close')" class="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Copy Link -->
      <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 mb-4">
        <span class="text-sm text-gray-500 truncate flex-1 px-2">{{ url }}</span>
        <button 
          @click="copyLink"
          class="p-2 rounded-lg transition-all"
          :class="copied ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'"
        >
           <Check v-if="copied" class="w-4 h-4" />
           <Copy v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- QR Code Toggle -->
      <button @click="showQr = !showQr" class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors mb-4 group">
          <div class="flex items-center gap-3">
              <div class="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                  <QrCode class="w-5 h-5 text-gray-700" />
              </div>
              <span class="font-medium text-gray-900">Show QR Code</span>
          </div>
      </button>

      <div v-if="showQr" class="flex justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
           <qrcode-vue :value="url" :size="200" level="H" />
      </div>

      <!-- Built-in Social Share (Native) -->
      <div class="grid grid-cols-4 gap-2">
         <!-- Add native share links here if needed, for now minimalist -->
      </div>
      
    </div>
  </div>
</template>
