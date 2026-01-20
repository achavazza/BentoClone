<script setup>
import { computed } from 'vue';
import { X, GripVertical, Pencil } from 'lucide-vue-next';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  editing: {
    type: Boolean,
    default: false
  },
  sorting: {
     type: Boolean,
     default: false
  }
});

const emit = defineEmits(['edit']);

const sizeClasses = computed(() => {
  switch (props.item.size) {
    case '1x2': return 'col-span-1 row-span-2';
    case '2x1': return 'col-span-2 row-span-1';
    case '2x2': return 'col-span-2 row-span-2';
    default: return 'col-span-1 row-span-1';
  }
});

const bgStyle = computed(() => {
    return props.item.bgColor ? { backgroundColor: props.item.bgColor } : {};
});

const socialHandle = computed(() => {
    if (props.item.type !== 'social' || !props.item.content) return null;
    try {
        let url = props.item.content.replace(/\/$/, ""); // Remove trailing slash
        const parts = url.split('/');
        let handle = parts[parts.length - 1];
        
        // Handle optional "in" for LinkedIn if needed, but last part usually works
        if (handle) return `@${handle}`;
    } catch (e) {
        return null;
    }
    return null;
});
</script>

<template>
  <div 
    class="relative group bg-white rounded-3xl border border-black/5 hover:border-black/10 shadow-sm hover:shadow-none active:scale-95 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer h-full w-full"
    :class="{ 'border-dashed border-2 border-gray-300 shadow-none hover:shadow-none bg-gray-50': item.type === 'placeholder' }"
    :style="item.type !== 'placeholder' ? bgStyle : {}"
  >
    <!-- Social/Image Link Wrapper -->
    <a 
      v-if="item.content && item.type !== 'text' && item.type !== 'placeholder'" 
      :href="item.content" 
      target="_blank" 
      class="absolute inset-0 z-0"
    ></a>

    <!-- Drag Handle (visible only when sorting/owner) -->
    <div v-if="sorting && item.type !== 'placeholder'" class="absolute top-4 left-4 text-gray-400 cursor-move transition-all z-30 drop-shadow-sm">
      <GripVertical class="w-4 h-4" />
    </div>

    <!-- Edit Button (Always visible for owner if editing mode is active, or just always if we follow the spirit) -->
    <!-- The user said: "los iconos que solo aparecen al editar, deberian estar siempre" -->
    <button 
      v-if="editing && item.type !== 'placeholder'" 
      @click.stop="$emit('edit', item)" 
      class="absolute top-4 right-4 p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors z-10 opacity-100"
    >
      <Pencil class="w-4 h-4" />
    </button>

    <!-- Content Area (Centered) -->
    <div class="flex-1 flex flex-col justify-left items-start p-6 pointer-events-none">
        <!-- Content Rendering -->
        <div v-if="item.type === 'social'" class="flex flex-col items-left gap-2">
          <i v-if="item.icon" :class="[item.icon, 'text-4xl']"></i>
          <div class="flex flex-col">
            <span class="font-semibold text-gray-900 leading-tight mb-1">{{ item.title }}</span>
            <span v-if="socialHandle" class="text-xs text-gray-400 font-medium">{{ socialHandle }}</span>
          </div>
        </div>

        <div v-else-if="item.type === 'image'" class="absolute inset-0 z-[-1]">
          <img :src="item.content" class="w-full h-full object-cover" alt="Widget" />
        </div>

        <div v-else-if="item.type === 'text'" class="text-center">
          <p class="font-medium text-gray-800">{{ item.content }}</p>
        </div>
        
        <div v-else-if="item.type === 'placeholder'" class="text-gray-400 flex flex-col items-center">
            <span class="text-2xl">+</span>
            <span class="text-xs font-medium">Add Widget</span>
        </div>
    </div>
  </div>
</template>
