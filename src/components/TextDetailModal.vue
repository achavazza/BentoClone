<script setup>
import { X, Maximize2 } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  title: String,
  content: String
});

defineEmits(['close']);
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" @click.self="$emit('close')">
    <div class="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div class="flex items-center gap-3">
            <!-- <div class="p-2 bg-black text-white rounded-xl">
                <Maximize2 class="w-5 h-5" />
            </div>
             -->
            <h3 class="font-black text-xl tracking-tight">{{ title || 'Note' }}</h3>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <p class="text-gray-800 text-lg font-medium leading-relaxed whitespace-pre-wrap">
          {{ content }}
        </p>
      </div>
      <!--
      <div class="px-8 py-6 border-t border-gray-100 flex justify-end">
          <button @click="$emit('close')" class="px-8 py-3 bg-black text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-black/10">
              Close
          </button>
      </div>
      -->
    </div>
  </div>
</template>
