<script setup>
import { ref } from 'vue';
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

const emit = defineEmits(['update:items', 'edit-item', 'add-item']);

const gridItems = computed({
  get: () => props.items,
  set: (val) => emit('update:items', val)
});

import { computed } from 'vue';
</script>

<template>
  <div class="h-full p-4 md:p-8 overflow-y-auto">
    <draggable 
      v-model="gridItems" 
      item-key="id"
      class="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px] md:auto-rows-[180px]"
      handle=".cursor-move"
      :disabled="!sorting"
      ghost-class="opacity-50"
      animation="300"
    >
      <template #item="{ element }">
        <BentoItem 
          v-if="element.type !== 'placeholder'"
          :item="element" 
          :editing="editing"
          :sorting="sorting"
          @edit="$emit('edit-item', $event)"
        />
      </template>
    </draggable>
  </div>
</template>
