<script setup>
import { AlertCircle, CheckCircle2, X } from 'lucide-vue-next';
import { useNotifyStore } from '../stores/notify';

const notify = useNotifyStore();
</script>

<template>
  <Transition name="notify">
    <div
      v-if="notify.current"
      class="fixed inset-x-0 bottom-4 sm:bottom-auto sm:top-4 z-[100] flex justify-center px-4 pointer-events-none"
    >
      <div class="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-black/5 p-4 flex items-start gap-3">
        <AlertCircle v-if="notify.current.type === 'error'" class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <CheckCircle2 v-else class="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-gray-900">{{ notify.current.title }}</p>
          <p v-if="notify.current.message" class="text-xs text-gray-500 mt-0.5 leading-relaxed">{{ notify.current.message }}</p>
        </div>
        <button @click="notify.dismiss()" class="p-1 -m-1 text-gray-400 hover:text-black transition-colors shrink-0">
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notify-enter-active,
.notify-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.notify-enter-from,
.notify-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
