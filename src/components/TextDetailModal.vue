<script setup>
import { ref } from 'vue';
import { X, Maximize2, Minimize2 } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  title: String,
  content: String,
  type: {
    type: String,
    default: 'text'
  }
});

defineEmits(['close']);

const isMaximized = ref(false);

function toggleMaximize() {
  isMaximized.value = !isMaximized.value;
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" @click.self="$emit('close')">
    <div 
      class="shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col transition-all duration-500 ease-in-out relative"
      :class="[
        isMaximized 
          ? (type === 'image' ? 'w-full h-full max-w-none rounded-none bg-transparent shadow-none' : 'w-[600px] max-w-[90vw] h-[80vh] rounded-[32px] bg-white')
          : 'w-[512px] max-w-[90vw] h-[600px] max-h-[90vh] rounded-[32px] bg-white'
      ]"
    >
      <!-- Header - Hidden when maximized -->
      <div 
        v-if="!isMaximized"
        class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0"
      >
        <div class="flex items-center gap-3">
            <h3 class="font-black text-xl tracking-tight">{{ title || (type === 'image' ? 'Image' : 'Note') }}</h3>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div 
        class="overflow-y-auto custom-scrollbar flex-1 flex flex-col"
        :class="isMaximized && type === 'image' ? 'p-0' : 'p-8'"
      >
        <template v-if="type === 'image'">
          <div 
            class="flex-1 flex items-center justify-center min-h-0"
            @click.self="$emit('close')"
          >
            <img 
              :src="content" 
              class="max-w-full max-h-full object-contain transition-all duration-500" 
              :class="isMaximized ? 'rounded-none border-none' : 'rounded-2xl shadow-xl'"
              alt="Detail View"
            />
          </div>
        </template>
        <p v-else 
          class="text-gray-800 font-medium whitespace-pre-wrap transition-all duration-500" 
          :class="isMaximized ? 'text-[20px] leading-[1.6]' : 'text-[16px] leading-relaxed'"
        >
          {{ content }}
        </p>
      </div>

      <!-- Maximize FAB -->
      <button 
        @click="toggleMaximize"
        class="absolute bottom-8 right-8 p-4 bg-black text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-10 flex items-center justify-center group"
        title="Toggle Maximize"
      >
          <Minimize2 v-if="isMaximized" class="w-6 h-6" />
          <Maximize2 v-else class="w-6 h-6" />
          <span class="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap ml-0 group-hover:ml-2 font-bold text-sm">
            {{ isMaximized ? 'Minimize' : 'Maximize' }}
          </span>
      </button>
    </div>
  </div>
</template>
