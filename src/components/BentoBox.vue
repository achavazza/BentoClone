<script setup>
import { computed } from 'vue';

const props = defineProps({
  // Widget enriched with a `preview` object (row from box_previews).
  // Only rendered by BentoItem when preview.image_url is a remote image.
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['failed']);

// Keep the widget's own icon when possible; otherwise the cached favicon.
const faviconSrc = computed(() => {
  const icon = props.item.icon;
  if (icon && /^(https?:|data:)/i.test(icon)) return icon;
  return props.item.preview?.favicon_url || null;
});

// "generic" is an ugly label; show the hostname instead.
const platformLabel = computed(() => {
  const p = props.item.preview?.platform;
  if (p && p !== 'generic') return p;
  try {
    return new URL(props.item.preview?.url || props.item.content).hostname.replace(/^www\./, '');
  } catch {
    return p || 'link';
  }
});

function onImageError() {
  emit('failed');
}
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <img
      :src="item.preview.image_url"
      class="absolute inset-0 w-full h-full object-cover"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="onImageError"
    />

    <!-- Scrim so text stays legible over any image -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10"></div>

    <!-- Text block, anchored to the bottom -->
    <div class="absolute inset-x-0 bottom-0 p-4 md:p-5 flex flex-col gap-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <img
          v-if="faviconSrc && faviconSrc !== item.preview.image_url"
          :src="faviconSrc"
          class="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span class="text-[10px] font-semibold uppercase tracking-wide text-white/60 truncate">
          {{ platformLabel }}
        </span>
      </div>
      <span class="font-semibold text-white leading-tight line-clamp-2">
        {{ item.preview?.title || item.title }}
      </span>
      <p
        v-if="(item.preview?.description || item.description) && item.size !== '2x1'"
        class="text-xs text-white/70 leading-relaxed line-clamp-2"
      >
        {{ item.preview?.description || item.description }}
      </p>
    </div>
  </div>
</template>