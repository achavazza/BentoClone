<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import draggable from 'vuedraggable';
import BentoItem from './BentoItem.vue';

const props = defineProps({
  items: {
    type: Array,
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

const emit = defineEmits(['update:items', 'edit-item', 'add-item', 'click-item']);

const gridItems = computed({
  get: () => props.items,
  set: (val) => emit('update:items', val)
});

function getSpanClasses(size) {
  switch (size) {
    case '1x2': return 'col-span-1 row-span-2';
    case '2x1': return 'col-span-2 row-span-1';
    case '2x2': return 'col-span-2 row-span-2';
    default: return 'col-span-1 row-span-1';
  }
}

// --- Reflow: top-left first-fit packing on the existing CSS grid ---
const SPANS = {
  '1x1': { w: 1, h: 1 },
  '2x1': { w: 2, h: 1 },
  '1x2': { w: 1, h: 2 },
  '2x2': { w: 2, h: 2 }
};

const containerEl = ref(null);
const cols = ref(2);
const cell = ref(null); // square cell size in px; null = use CSS defaults until measured

function measureCols() {
  const el = containerEl.value;
  if (!el) return;
  const style = getComputedStyle(el);
  const avail = el.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

  if (window.matchMedia('(min-width: 768px)').matches) {
    // At least 2 columns: blocks are up to 2 cells wide.
    cols.value = Math.max(2, Math.floor((avail + 40) / 215));
    const fitted = (avail - (cols.value - 1) * 40) / cols.value;
    cell.value = fitted >= 174.5 ? 175 : Math.max(1, Math.min(175, fitted));
  } else {
    cols.value = 2;
    const fitted = (avail - 12) / 2;
    cell.value = fitted >= 174.5 ? 175 : Math.max(1, Math.min(175, fitted));
  }
}

// Explicit tracks: sizing never depends on the browser's auto-fit/flex
// interplay, so cells are always exact squares of `cell` px.
const gridStyle = computed(() => {
  if (cell.value == null) return {};
  return {
    gridTemplateColumns: `repeat(${cols.value}, ${cell.value}px)`,
    gridAutoRows: `${cell.value}px`
  };
});

function fits(occupied, c, r, w, h) {
  for (let dc = 0; dc < w; dc++) {
    for (let dr = 0; dr < h; dr++) {
      if (occupied.has(`${c + dc}:${r + dr}`)) return false;
    }
  }
  return true;
}

function occupy(occupied, c, r, w, h) {
  for (let dc = 0; dc < w; dc++) {
    for (let dr = 0; dr < h; dr++) {
      occupied.add(`${c + dc}:${r + dr}`);
    }
  }
}

const placements = computed(() => {
  const map = {};
  const n = cols.value;
  if (!n) return map;

  const occupied = new Set();

  for (const item of props.items) {
    if (item.type === 'placeholder') continue;
    const span = SPANS[item.size] || SPANS['1x1'];
    const w = Math.min(span.w, n);
    const h = span.h;

    // First-fit: topmost row first, leftmost column on ties.
    // A free row always exists below, so this always terminates.
    outer: for (let r = 0; ; r++) {
      for (let c = 0; c + w <= n; c++) {
        if (fits(occupied, c, r, w, h)) {
          occupy(occupied, c, r, w, h);
          map[item.id] = { c, r, w, h };
          break outer;
        }
      }
    }
  }
  return map;
});

function placementStyle(element) {
  const p = placements.value[element.id];
  if (!p) return {};
  return {
    gridColumn: `${p.c + 1} / span ${p.w}`,
    gridRow: `${p.r + 1} / span ${p.h}`
  };
}

let resizeObserver = null;

onMounted(() => {
  measureCols();
  if (containerEl.value) {
    resizeObserver = new ResizeObserver(() => measureCols());
    resizeObserver.observe(containerEl.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<template>
  <div ref="containerEl" class="p-4 md:p-8 flex justify-center pb-24 min-h-full">
    <draggable 
      v-model="gridItems" 
      item-key="id"
      class="grid grid-cols-2 md:grid-cols-[repeat(auto-fit,175px)] gap-3 md:gap-10 auto-rows-[165px] md:auto-rows-[175px] w-full md:w-fit max-w-full flex-none grid-auto-flow-dense justify-center"
      :style="gridStyle"
      handle=".cursor-move"
      :disabled="!sorting"
      ghost-class="ghost"
      :animation="400"
      v-auto-animate
    >
      <template #item="{ element }">
        <div 
          v-if="element.type !== 'placeholder'"
          class="h-full w-full"
          :class="getSpanClasses(element.size)"
          :style="placementStyle(element)"
        >
          <BentoItem 
            :item="element" 
            :editing="editing"
            :sorting="sorting"
            @edit="$emit('edit-item', $event)"
            @click="$emit('click-item', $event)"
          />
        </div>
      </template>
    </draggable>
  </div>
</template>
