<script setup>
import { ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { socialIcons } from '../lib/icons';

const props = defineProps({
  isOpen: Boolean,
  editMode: Boolean,
  existingWidget: Object
});

const emit = defineEmits(['close', 'add', 'edit']);

const activeTab = ref('social');
const url = ref('');
const title = ref('');
const textContent = ref('');
const selectedIcon = ref(null);
const bgColor = ref('#ffffff');

const socialOptions = [
  { name: 'Instagram', icon: socialIcons['Instagram'], bg: '#FCE7F3' },
  { name: 'GitHub', icon: socialIcons['GitHub'], bg: '#F3F4F6' },
  { name: 'LinkedIn', icon: socialIcons['LinkedIn'], bg: '#DBEAFE' },
  { name: 'YouTube', icon: socialIcons['YouTube'], bg: '#FEE2E2' },
  { name: 'Twitter (X)', icon: socialIcons['Twitter (X)'], bg: '#F3F4F6' },
  { name: 'TikTok', icon: socialIcons['TikTok'], bg: '#F3F4F6' },
  { name: 'Vimeo', icon: socialIcons['Vimeo'], bg: '#E0F2FE' },
];

const size = ref('1x1');

// Initialize form when opening in edit mode
watch(() => props.isOpen, (newVal) => {
    if (newVal && props.editMode && props.existingWidget) {
        // Pre-fill
        const w = props.existingWidget;
        activeTab.value = w.type;
        url.value = w.content || '';
        title.value = w.title || '';
        textContent.value = w.content || '';
        bgColor.value = w.bgColor || '#ffffff';
        size.value = w.size || '1x1';
        selectedIcon.value = w.icon || null;
    } else if (newVal) {
        // Reset defaults
         url.value = '';
         title.value = '';
         textContent.value = '';
         selectedIcon.value = null;
         bgColor.value = '#ffffff';
         activeTab.value = 'social';
         size.value = '1x1';
    }
});

function selectSocial(opt) {
    selectedIcon.value = opt.icon;
    title.value = opt.name;
    bgColor.value = opt.bg;
}

function handleSubmit() {
    let widget = {
        type: activeTab.value,
        bgColor: bgColor.value,
        size: size.value
    };

    if (activeTab.value === 'social') {
        widget.title = title.value || 'Link';
        widget.content = url.value;
        widget.icon = selectedIcon.value;
    } else if (activeTab.value === 'text') {
        widget.content = textContent.value;
    } else if (activeTab.value === 'image') {
        widget.content = url.value;
    }

    if (props.editMode) {
        emit('edit', { ...props.existingWidget, ...widget });
    } else {
        emit('add', widget);
    }
    
    emit('close');
}

function close() {
  emit('close');
}

function handleDelete() {
    if (confirm('Are you sure you want to delete this widget?')) {
        emit('delete', props.existingWidget.id);
        emit('close');
    }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 focus-within:ring-0">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="font-bold text-lg">{{ editMode ? 'Edit Widget' : 'Add to Bento' }}</h3>
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <!-- Tabs -->
        <div v-if="!editMode" class="flex gap-2 mb-6 p-1 bg-gray-100/80 rounded-2xl">
          <button 
            v-for="tab in ['social', 'text', 'image']" 
            :key="tab"
            @click="activeTab = tab"
            class="flex-1 py-2 text-sm font-bold rounded-xl capitalize transition-all"
            :class="activeTab === tab ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'"
          >
            {{ tab }}
          </button>
        </div>

        <!-- Forms -->
        <div class="space-y-6">
            <!-- Social Grid -->
            <div v-if="activeTab === 'social' && !editMode" class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                <button 
                v-for="opt in socialOptions" 
                :key="opt.name"
                @click="selectSocial(opt)"
                class="flex flex-col items-center p-3 rounded-2xl border-2 transition-all hover:bg-gray-50 group"
                :class="selectedIcon === opt.icon ? 'border-black bg-gray-50' : 'border-gray-50'"
                >
                <i :class="[opt.icon, 'text-2xl mb-1 group-hover:scale-110 transition-transform']" ></i>
                <span class="text-[10px] font-bold text-center leading-tight">{{ opt.name }}</span>
                </button>
            </div>

            <!-- Inputs Base -->
            <div class="space-y-4">
                <div v-if="activeTab === 'text'">
                    <textarea v-model="textContent" rows="4" placeholder="Write something..." class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none resize-none font-medium"></textarea>
                </div>
                <div v-else>
                    <input v-model="url" type="url" :placeholder="activeTab === 'image' ? 'Image URL...' : 'Link URL...'" class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-medium" />
                </div>

                <!-- Extended Details -->
                <div v-if="editMode || activeTab !== 'social'" class="space-y-6 pt-6 border-t border-gray-100">
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Custom Title</label>
                        <input v-model="title" type="text" placeholder="e.g. My Portfolio" class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-bold" />
                    </div>
                    
                    <!-- Size Selector -->
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Box Size</label>
                        <div class="grid grid-cols-4 gap-3">
                            <button 
                                v-for="s in [
                                    { label: '1x1', val: '1x1', dots: 1, cols: 1 },
                                    { label: '2x1', val: '2x1', dots: 2, cols: 2 },
                                    { label: '1x2', val: '1x2', dots: 2, cols: 1 },
                                    { label: '2x2', val: '2x2', dots: 4, cols: 2 }
                                ]" 
                                :key="s.val" 
                                @click="size = s.val"
                                class="aspect-square flex flex-col items-center justify-center gap-2 rounded-2xl border-2 transition-all"
                                :class="size === s.val ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'"
                            >
                                <!-- Visual Representation -->
                                <div class="grid gap-0.5" :class="s.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'">
                                    <div v-for="i in s.dots" :key="i" class="w-1.5 h-1.5 rounded-sm" :class="size === s.val ? 'bg-white' : 'bg-gray-400'"></div>
                                </div>
                                <span class="text-[10px] font-black">{{ s.label }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Background Color -->
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Decoration</label>
                        <div class="flex gap-3 items-center p-1 bg-gray-50 rounded-2xl">
                             <div class="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                                 <input type="color" v-model="bgColor" class="absolute -inset-2 w-[150%] h-[150%] cursor-pointer border-none bg-transparent" />
                             </div>
                             <input type="text" v-model="bgColor" class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono font-bold uppercase" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-3 pt-4 pb-2">
                <button @click="handleSubmit" class="w-full py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl shadow-black/10">
                    {{ editMode ? 'Save Changes' : 'Add Widget' }}
                </button>
                
                <button 
                    v-if="editMode" 
                    @click="handleDelete" 
                    class="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors text-sm"
                >
                    Delete Widget
                </button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
