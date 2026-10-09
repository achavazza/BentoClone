<script setup>
import { ref } from 'vue';

const props = defineProps({
  // Widget enriched with a `preview` object (row from box_previews).
  item: {
    type: Object,
    required: true
  }
});

const imgFailed = ref(false);
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <!-- Background: link image, or a gradient fallback if none/failed -->
    <img
      v-if="item.preview?.image_url && !imgFailed"
      :src="item.preview.image_url"
      class="absolute inset-0 w-full h-full object-cover"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="imgFailed = true"
    />
    <div v-else class="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"></div>

    <!-- Scrim so text stays legible over any image -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10"></div>

    <!-- Text block, anchored to the bottom -->
    <div class="absolute inset-x-0 bottom-0 p-4 md:p-5 flex flex-col gap-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <img
          v-if="item.preview?.favicon_url && item.preview.favicon_url !== item.preview.image_url"
          :src="item.preview.favicon_url"
          class="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span class="text-[10px] font-semibold uppercase tracking-wide text-white/60 truncate">
          {{ item.preview?.platform || 'link' }}
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
