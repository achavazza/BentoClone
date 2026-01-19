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
  }
});

const emit = defineEmits(['delete', 'edit']);

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
</script>

<template>
  <div 
    class="relative group bg-white rounded-2xl border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-center items-center p-4 cursor-pointer"
    :class="[sizeClasses, { 'border-dashed border-2 border-gray-300 shadow-none hover:shadow-none bg-gray-50': item.type === 'placeholder' }]"
    :style="item.type !== 'placeholder' ? bgStyle : {}"
  >
    <!-- Drag Handle (visible only when editing) -->
    <div v-if="editing && item.type !== 'placeholder'" class="absolute top-2 left-2 p-1 bg-white/80 rounded-full text-gray-400 cursor-move hover:text-gray-700 z-10">
      <GripVertical class="w-4 h-4" />
    </div>

    <!-- Edit Button (visible only when editing) -->
    <button v-if="editing && item.type !== 'placeholder'" @click.stop="$emit('edit', item)" class="absolute top-2 right-8 p-1 bg-white/80 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors z-10">
      <Pencil class="w-4 h-4" />
    </button>

    <!-- Delete Button (visible only when editing) -->
    <button v-if="editing && item.type !== 'placeholder'" @click.stop="$emit('delete', item.id)" class="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10">
      <X class="w-4 h-4" />
    </button>

    <!-- Content -->
    <div v-if="item.type === 'social'" class="flex flex-col items-center gap-2">
      <component :is="item.icon" v-if="item.icon" class="w-8 h-8 text-gray-800" />
      <span class="font-semibold text-gray-900">{{ item.title }}</span>
    </div>

    <div v-else-if="item.type === 'image'" class="absolute inset-0">
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
</template>
