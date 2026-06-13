<script setup>
import { ref, computed } from 'vue';
import { GripVertical, Pencil } from 'lucide-vue-next';

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

const emit = defineEmits(['edit', 'click']);

const iconFailed = ref(false);

const isUrlIcon = computed(() => {
    return props.item.icon && (props.item.icon.startsWith('http') || props.item.icon.startsWith('data:'));
});

const iconInitial = computed(() => {
    if (props.item.title && props.item.title.length > 0) return props.item.title[0].toUpperCase();
    return null;
});

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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

const useLightText = computed(() => {
    if (!props.item.bgColor || props.item.bgColor === '#ffffff') return false;
    const rgb = hexToRgb(props.item.bgColor);
    if (!rgb) return false;
    return getLuminance(rgb.r, rgb.g, rgb.b) < 0.4;
});

const textPrimaryClass = computed(() => useLightText.value ? 'text-white' : 'text-gray-900');
const textSecondaryClass = computed(() => useLightText.value ? 'text-white/70' : 'text-gray-500');
const textMutedClass = computed(() => useLightText.value ? 'text-white/50' : 'text-gray-400');

const socialHandle = computed(() => {
    if (props.item.type !== 'social' || !props.item.content) return null;
    try {
        const parsed = new URL(props.item.content);
        const pathParts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        if (pathParts.length > 0) {
            return `@${pathParts[pathParts.length - 1]}`;
        }
        return parsed.hostname;
    } catch (e) {
        return null;
    }
});

const showDescription = computed(() => {
    return props.item.description && props.item.size !== '1x1';
});
</script>

<template>
  <div 
    class="relative group bg-white rounded-3xl border border-black/5 hover:border-black/10 shadow-sm hover:shadow-none active:scale-95 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer h-full w-full"
    :class="{ 'border-dashed border-2 border-gray-300 shadow-none hover:shadow-none bg-gray-50': item.type === 'placeholder' }"
    :style="item.type !== 'placeholder' ? bgStyle : {}"
    @click="$emit('click', item)"
  >
    <!-- Social/Image Link Wrapper -->
    <a 
      v-if="item.content && item.type !== 'text' && item.type !== 'image' && item.type !== 'placeholder'" 
      :href="item.content" 
      target="_blank" 
      class="absolute inset-0 z-0"
    ></a>

    <!-- Drag Handle (visible only when sorting/owner) -->
    <div v-if="sorting && item.type !== 'placeholder'" 
    class="absolute top-4 left-4 rounded-md p-2 hover:text-blue-500 bg-white/80 backdrop-blur-sm transition-colors cursor-move z-10"
    :class="useLightText ? 'text-white/70' : 'text-gray-400'">
      <GripVertical class="w-4 h-4" />
    </div>

    <!-- Edit Button (Always visible for owner if editing mode is active, or just always if we follow the spirit) -->
    <button 
      v-if="sorting && item.type !== 'placeholder'" 
      @click.stop="$emit('edit', item)" 
      class="absolute top-4 right-4 rounded-md p-2 hover:text-blue-500 bg-white/80 backdrop-blur-sm transition-colors z-10"
      :class="useLightText ? 'text-white/70' : 'text-gray-400'"
    >
      <Pencil class="w-4 h-4" />
    </button>

    <!-- Content Area (Centered) -->
    <div class="flex-1 flex flex-col justify-left items-start p-6 pointer-events-none">
      
        <!-- Content Rendering -->
        <div v-if="item.type === 'social'" class="flex flex-col items-left gap-2">
          <template v-if="item.icon">
            <img v-if="isUrlIcon && !iconFailed" :src="item.icon" class="w-10 h-10 rounded-lg object-contain" @error="iconFailed = true" />
            <div v-else-if="isUrlIcon && iconFailed && iconInitial" class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" :class="textPrimaryClass" :style="{ backgroundColor: useLightText ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }">{{ iconInitial }}</div>
            <i v-else-if="!isUrlIcon" :class="[item.icon, 'text-4xl']"></i>
          </template>
          <div class="flex flex-col min-w-0">
            <span class="font-semibold leading-tight mb-1 truncate" :class="textPrimaryClass">{{ item.title }}</span>
            <span v-if="socialHandle" class="text-xs font-medium truncate" :class="textMutedClass">{{ socialHandle }}</span>
            <p v-if="showDescription" class="text-xs mt-1.5 leading-relaxed line-clamp-2" :class="textSecondaryClass">{{ item.description }}</p>
          </div>
        </div>

        <div
          v-else-if="item.type === 'image'"
          class="-m-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] overflow-hidden"
        >
          <img
            :src="item.content"
            class="w-full h-full object-cover"
            alt="Widget"
          />
        </div>

        <div v-else-if="item.type === 'text'" class="flex flex-col h-full w-full">
          <span v-if="item.title" class="font-bold leading-tight mb-2 truncate" :class="textPrimaryClass">{{ item.title }}</span>
          <p class="font-medium text-sm line-clamp-3 leading-relaxed" :class="textSecondaryClass">{{ item.content }}</p>
          <p v-if="showDescription" class="text-xs mt-2 leading-relaxed line-clamp-2" :class="textMutedClass">{{ item.description }}</p>
        </div>
        
        <div v-else-if="item.type === 'placeholder'" class="text-gray-400 flex flex-col items-center w-full">
            <span class="text-2xl">+</span>
            <span class="text-xs font-medium">Add Widget</span>
        </div>
    </div>
  </div>
</template>
