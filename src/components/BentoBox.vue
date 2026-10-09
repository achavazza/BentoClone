<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  // Widget enriched with a `preview` object (row from box_previews).
  // Only rendered by BentoItem when preview.image_url is a remote image.
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['failed']);

// ---- Box-color based scrim + auto text contrast ----

function normalizeHex(c) {
  const v = (c || '').trim();
  let m = v.match(/^#?([a-f0-9]{3})$/i);
  if (m) { const h = m[1]; return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  m = v.match(/^#?([a-f0-9]{6})$/i);
  if (m) return '#' + m[1].toLowerCase();
  return null;
}

function hexToRgb(hex) {
  const m = /^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

const baseHex = computed(() => normalizeHex(props.item.bgColor));

// Scrim: fade from the box's own color at the bottom to transparent on top.
const scrimStyle = computed(() => {
  if (isCustomBg.value) {
    return { background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, transparent 78%)' };
  }
  const hex = baseHex.value;
  if (!hex) {
    return { background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 45%, transparent 78%)' };
  }
  const { r, g, b } = hexToRgb(hex);
  return { background: `linear-gradient(to top, rgba(${r},${g},${b},0.95) 0%, rgba(${r},${g},${b},0.6) 45%, transparent 78%)` };
});

// If the box color is light we use dark text over the bottom band.
const isLightBg = computed(() => {
  if (isCustomBg.value) return false;
  const hex = baseHex.value;
  if (!hex) return false;
  const rgb = hexToRgb(hex);
  return rgb ? getLuminance(rgb.r, rgb.g, rgb.b) >= 0.5 : false;
});

const titleClass = computed(() => (isLightBg.value ? 'text-gray-900' : 'text-white'));
const subClass = computed(() => (isLightBg.value ? 'text-gray-800/70' : 'text-white/70'));
const mutedClass = computed(() => (isLightBg.value ? 'text-gray-400' : 'text-white/50'));

// The cover image: a custom background wins, otherwise the crawled preview.
const bgImageSrc = computed(() => {
  const custom = props.item.background_url;
  if (custom && /^https?:\/\//i.test(custom)) return custom;
  const p = props.item.preview?.image_url;
  return p && /^https?:\/\//i.test(p) ? p : null;
});

// Over a custom image we don't know its colors, so force a dark scrim.
const isCustomBg = computed(() => {
  const custom = props.item.background_url;
  return !!(custom && /^https?:\/\//i.test(custom));
});

// The text block mirrors the classic layout: the widget's own icon, title
// and @username. Only the description moves to the bottom, over the scrim.

const iconFailed = ref(false);

const isUrlIcon = computed(() => {
    return props.item.icon && (props.item.icon.startsWith('http') || props.item.icon.startsWith('data:'));
});

const iconInitial = computed(() => {
    if (props.item.title && props.item.title.length > 0) return props.item.title[0].toUpperCase();
    return null;
});

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

function onImageError() {
  emit('failed');
}

// Logos/favicons masquerading as og:image are tiny; stretched as a cover
// they look broken. Skip images smaller than 220px on either side.
function onImageLoad(e) {
  const w = e.currentTarget.naturalWidth;
  const h = e.currentTarget.naturalHeight;
  if (!w || !h || Math.min(w, h) < 220) emit('failed');
}
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <img
      :src="bgImageSrc"
      class="absolute inset-0 w-full h-full object-cover object-left-top"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="onImageError"
      @load="onImageLoad"
    />

    <!-- Scrim: box color at the bottom fading to transparent -->
    <div class="absolute inset-0" :style="scrimStyle"></div>

    <!-- Text block, anchored to the bottom, mirroring the classic layout -->
    <div class="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-1.5">
      <template v-if="item.icon">
        <img v-if="isUrlIcon && !iconFailed" :src="item.icon" class="w-10 h-10 rounded-lg object-contain" @error="iconFailed = true" />
        <div v-else-if="isUrlIcon && iconFailed && iconInitial" class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" :class="titleClass" :style="{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)' }">{{ iconInitial }}</div>
        <i v-else-if="!isUrlIcon" :class="[item.icon, 'text-4xl']"></i>
      </template>
      <div class="flex flex-col min-w-0">
        <span class="font-semibold leading-tight mb-1 truncate" :class="titleClass">
          {{ item.title || item.preview?.title }}
        </span>
        <span v-if="socialHandle" class="text-xs font-medium truncate" :class="mutedClass">{{ socialHandle }}</span>
        <p
          v-if="(item.description || item.preview?.description) && item.size !== '1x1'"
          class="text-xs mt-1.5 leading-relaxed line-clamp-2" :class="subClass"
        >
          {{ item.description || item.preview?.description }}
        </p>
      </div>
    </div>
  </div>
</template>