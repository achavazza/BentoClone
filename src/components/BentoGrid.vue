<script setup>
import { ref, computed } from 'vue';
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
    case '1x1': return 'col-span-1 row-span-1';
    case '1x2': return 'col-span-1 row-span-2';
    case '2x1': return 'col-span-2 row-span-1';
    case '2x2': return 'col-span-2 row-span-2';
    default: return 'col-span-1 row-span-1';
  }
}
</script>

<template>
  <div class="p-4 md:p-8 flex justify-center pb-24 h-full">
    <draggable 
      v-model="gridItems" 
      item-key="id"
      class="grid grid-cols-[repeat(auto-fit,175px)] gap-10 auto-rows-[175px] w-fit max-w-full grid-auto-flow-dense justify-center"
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
