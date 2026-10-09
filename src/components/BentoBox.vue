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
const labelClass = computed(() => (isLightBg.value ? 'text-gray-700' : 'text-white'));

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

    <!-- Text block, anchored to the bottom -->
    <div class="absolute inset-x-0 bottom-0 p-4 md:p-5 flex flex-col gap-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <img
          v-if="faviconSrc && faviconSrc !== bgImageSrc"
          :src="faviconSrc"
          class="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span class="text-[10px] font-semibold uppercase tracking-wide truncate" :class="labelClass">
          {{ platformLabel }}
        </span>
      </div>
      <span class="font-semibold leading-tight line-clamp-2" :class="titleClass">
        {{ item.title || item.preview?.title }}
      </span>
      <p
        v-if="(item.description || item.preview?.description) && item.size !== '2x1'"
        class="text-xs leading-relaxed line-clamp-2" :class="subClass"
      >
        {{ item.description || item.preview?.description }}
      </p>
    </div>
  </div>
</template>