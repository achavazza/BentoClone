<script setup>
import { computed } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { X, Download } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  url: String
});

const emit = defineEmits(['close']);
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 relative flex flex-col items-center animate-in fade-in zoom-in duration-200">
      <button @click="$emit('close')" class="absolute top-4 right-4 p-2 text-gray-400 hover:text-black">
        <X class="w-5 h-5" />
      </button>

      <div class="mb-6 text-center">
        <h3 class="text-xl font-bold mb-1">Share Profile</h3>
        <p class="text-sm text-gray-500">Scan to visit this bento</p>
      </div>

      <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-100 mb-6">
        <qrcode-vue :value="url" :size="200" level="H" />
      </div>

      <div class="text-xs text-gray-400 break-all text-center">
        {{ url }}
      </div>
    </div>
  </div>
</template>
