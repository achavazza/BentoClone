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
  <div class="h-full p-4 md:p-8 overflow-y-auto flex justify-center pb-24">
    <draggable 
      v-model="gridItems" 
      item-key="id"
      class="grid grid-cols-[repeat(auto-fill,minmax(250px,250px))] gap-6 auto-rows-[250px] w-full max-w-[1100px] grid-auto-flow-dense"
      handle=".cursor-move"
      :disabled="!sorting"
      ghost-class="opacity-0"
      animation="400"
      tag="transition-group"
      :component-data="{
        tag: 'div',
        type: 'transition-group',
        name: 'flip-list'
      }"
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
