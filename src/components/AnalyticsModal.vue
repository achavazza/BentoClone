<script setup>
import { X, Users, MousePointer2, Globe, Monitor, Smartphone } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  stats: {
    type: Object,
    default: () => ({
      totalVisits: 0,
      totalClicks: 0,
      uniqueVisitors: 0,
      browsers: {},
      os: {},
      referrers: {},
      countries: {},
      clicksByWidget: {}
    })
  }
});

defineEmits(['close']);

const formatCount = (count) => {
    return new Intl.NumberFormat().format(count);
};

// Helper to get top items from an object
const getTopItems = (obj, limit = 5) => {
    return Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" @click.self="$emit('close')">
    <div class="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
        <div class="flex items-center gap-3">
            <h3 class="font-black text-2xl tracking-tight">Your Analytics</h3>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 font-bold">
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-8 overflow-y-auto custom-scrollbar space-y-8">
        
        <!-- Key Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 flex flex-col gap-1 transition-all hover:shadow-lg hover:shadow-blue-500/5">
                <div class="flex items-center gap-2 text-blue-600 mb-2">
                    <Users class="w-5 h-5" />
                    <span class="font-bold text-sm uppercase tracking-wider">Unique Visitors</span>
                </div>
                <span class="text-4xl font-black text-gray-900">{{ formatCount(stats.uniqueVisitors) }}</span>
            </div>
            
            <div class="bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50 flex flex-col gap-1 transition-all hover:shadow-lg hover:shadow-gray-500/5">
                <div class="flex items-center gap-2 text-gray-600 mb-2">
                    <Monitor class="w-5 h-5" />
                    <span class="font-bold text-sm uppercase tracking-wider">Total Pageviews</span>
                </div>
                <span class="text-4xl font-black text-gray-900">{{ formatCount(stats.totalVisits) }}</span>
            </div>
            
            <div class="bg-purple-50/50 p-6 rounded-3xl border border-purple-100/50 flex flex-col gap-1 transition-all hover:shadow-lg hover:shadow-purple-500/5">
                <div class="flex items-center gap-2 text-purple-600 mb-2">
                    <MousePointer2 class="w-5 h-5" />
                    <span class="font-bold text-sm uppercase tracking-wider">Total Click-throughs</span>
                </div>
                <span class="text-4xl font-black text-gray-900">{{ formatCount(stats.totalClicks) }}</span>
            </div>
        </div>

        <!-- Breakdown Sections -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Top Referrers -->
            <div class="space-y-4">
                <div class="flex items-center gap-2 text-gray-900">
                    <Globe class="w-5 h-5" />
                    <h4 class="font-black text-lg">Top Referrers</h4>
                </div>
                <div class="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <div v-for="[name, count] in getTopItems(stats.referrers)" :key="name" class="flex justify-between items-center text-sm">
                        <span class="font-semibold text-gray-600 truncate max-w-[150px]">{{ name }}</span>
                        <span class="bg-white px-2 py-1 rounded-lg font-bold text-gray-900 shadow-sm">{{ count }}</span>
                    </div>
                    <div v-if="Object.keys(stats.referrers).length === 0" class="text-gray-400 text-sm italic py-2">
                        No data yet
                    </div>
                </div>
            </div>

            <!-- Top Countries -->
            <div class="space-y-4">
                <div class="flex items-center gap-2 text-gray-900">
                    <Globe class="w-5 h-5" />
                    <h4 class="font-black text-lg">Top Countries</h4>
                </div>
                <div class="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <div v-for="[name, count] in getTopItems(stats.countries)" :key="name" class="flex justify-between items-center text-sm">
                        <span class="font-semibold text-gray-600 truncate max-w-[150px]">{{ name }}</span>
                        <span class="bg-white px-2 py-1 rounded-lg font-bold text-gray-900 shadow-sm">{{ count }}</span>
                    </div>
                    <div v-if="Object.keys(stats.countries).length === 0" class="text-gray-400 text-sm italic py-2">
                        No geographic data yet
                    </div>
                </div>
            </div>
        </div>

        <!-- Most Clicked Links -->
        <div class="space-y-4">
            <div class="flex items-center gap-2 text-gray-900">
                <MousePointer2 class="w-5 h-5" />
                <h4 class="font-black text-lg">Most Clicked Links</h4>
            </div>
            <div class="bg-gray-50 rounded-2xl p-6">
                <div v-if="Object.keys(stats.clicksByWidget).length === 0" class="text-gray-400 text-sm italic text-center py-4">
                    No clicks tracked yet
                </div>
                <div v-else class="space-y-4">
                    <div v-for="[name, count] in getTopItems(stats.clicksByWidget, 10)" :key="name" class="flex flex-col gap-2">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-sm text-gray-800 truncate pr-4">{{ name }}</span>
                            <span class="text-xs font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-md">{{ count }} clicks</span>
                        </div>
                        <!-- Progress bar visualization -->
                        <div class="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                                class="bg-purple-500 h-full rounded-full transition-all duration-1000" 
                                :style="{ width: `${(count / stats.totalClicks) * 100}%` }"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Devices & Browsers (Optional/Extra) -->
         <div class="space-y-4">
            <div class="flex items-center gap-2 text-gray-900">
                <Smartphone class="w-5 h-5" />
                <h4 class="font-black text-lg">Browser Distribution</h4>
            </div>
            <div class="flex flex-wrap gap-2">
                <div v-for="[name, count] in getTopItems(stats.browsers)" :key="name" class="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <span class="text-xs font-bold text-gray-500">{{ name }}</span>
                    <span class="text-sm font-black text-black">{{ count }}</span>
                </div>
                 <div v-if="Object.keys(stats.browsers).length === 0" class="text-gray-400 text-sm italic py-2">
                    No data yet
                </div>
            </div>
        </div>

      </div>
      
      <!-- Footer -->
      <div class="px-8 py-6 border-t border-gray-100 flex justify-center bg-gray-50/30">
        <p class="text-gray-400 text-xs font-medium">Analytics are updated in real-time.</p>
      </div>

    </div>
  </div>
</template>
