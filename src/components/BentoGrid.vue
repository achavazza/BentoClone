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
  }
});

const emit = defineEmits(['update:items', 'delete-item', 'add-item']);

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
      class="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px]"
      handle=".cursor-move"
      :disabled="!editing"
      ghost-class="opacity-50"
      animation="200"
    >
      <template #item="{ element }">
        <BentoItem 
          :item="element" 
          :editing="editing"
          @delete="$emit('delete-item', $event)"
          @edit="$emit('edit-item', $event)"
          @click="element.type === 'placeholder' ? $emit('add-item') : null"
        />
      </template>
    </draggable>
  </div>
</template>
