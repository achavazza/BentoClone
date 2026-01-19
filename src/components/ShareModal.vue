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
      <h4 class="text-xs font-bold text-gray-500 uppercase mb-3 text-center">Share via</h4>
      <div class="grid grid-cols-4 gap-2">
         <a :href="`https://twitter.com/intent/tweet?text=Check%20out%20my%20Bento%20profile!&url=${encodeURIComponent(url)}`" target="_blank" class="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <svg class="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span class="text-[10px] font-medium">X</span>
         </a>
         <a :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`" target="_blank" class="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <svg class="w-5 h-5 mb-1 text-blue-700" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9H12.92v1.632h.049c.576-1.101 2-2.256 4.106-2.256 4.387 0 5.2 2.891 5.2 6.641v5.435zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span class="text-[10px] font-medium">LinkedIn</span>
         </a>
         <a :href="`https://wa.me/?text=Check%20out%20my%20Bento%20only!%20${encodeURIComponent(url)}`" target="_blank" class="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <svg class="w-5 h-5 mb-1 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
             <span class="text-[10px] font-medium">WhatsApp</span>
         </a>
         <a :href="`mailto:?subject=Check%20out%20my%20Bento&body=${encodeURIComponent(url)}`" target="_blank" class="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
             <div class="w-5 h-5 mb-1 flex items-center justify-center text-gray-700 font-bold bg-white rounded-full border border-gray-200">@</div>
             <span class="text-[10px] font-medium">Email</span>
         </a>
      </div>
      
    </div>
  </div>
</template>
