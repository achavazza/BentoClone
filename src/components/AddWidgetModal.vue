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

// ... (selectSocial kept same)

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

function handleDelete() {
    if (confirm('Are you sure you want to delete this widget?')) {
        emit('delete', props.existingWidget.id);
        emit('close');
    }
}

// ...
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 focus-within:ring-0">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="font-bold text-lg">{{ editMode ? 'Edit Widget' : 'Add to Bento' }}</h3>
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <!-- Tabs -->
        <div v-if="!editMode" class="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
          <button 
            v-for="tab in ['social', 'text', 'image']" 
            :key="tab"
            @click="activeTab = tab"
            class="flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all"
            :class="activeTab === tab ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'"
          >
            {{ tab }}
          </button>
        </div>

        <!-- Forms -->
        <div class="space-y-6">
            <!-- Social Grid -->
            <div v-if="activeTab === 'social' && !editMode" class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                <button 
                v-for="opt in socialOptions" 
                :key="opt.name"
                @click="selectSocial(opt)"
                class="flex flex-col items-center p-2 rounded-xl border-2 transition-all hover:bg-gray-50"
                :class="selectedIcon === opt.icon ? 'border-black bg-gray-50' : 'border-transparent'"
                >
                <i :class="[opt.icon, 'text-2xl mb-1']" ></i>
                <span class="text-[10px] font-medium text-center leading-tight">{{ opt.name }}</span>
                </button>
            </div>

            <!-- Inputs Base -->
            <div class="space-y-4">
                <div v-if="activeTab === 'text'">
                    <textarea v-model="textContent" rows="4" placeholder="Write something..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none resize-none"></textarea>
                </div>
                <div v-else>
                    <input v-model="url" type="url" :placeholder="activeTab === 'image' ? 'Image URL...' : 'Link URL...'" class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
                </div>

                <!-- Extended Details -->
                <div v-if="editMode || activeTab !== 'social'" class="space-y-4 pt-4 border-t border-gray-100">
                    <input v-model="title" type="text" placeholder="Custom Title (optional)" class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
                    
                    <!-- Size Selector -->
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Box Size</label>
                        <div class="grid grid-cols-4 gap-2">
                            <button 
                                v-for="s in ['1x1', '2x1', '1x2', '2x2']" 
                                :key="s" 
                                @click="size = s"
                                class="py-2 text-xs font-bold rounded-lg border-2 transition-all"
                                :class="size === s ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'"
                            >
                                {{ s }}
                            </button>
                        </div>
                    </div>

                    <!-- Background Color -->
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Background Color</label>
                        <div class="flex gap-2">
                            <input type="color" v-model="bgColor" class="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                            <input type="text" v-model="bgColor" class="flex-1 p-2 bg-gray-50 rounded-xl text-sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-4">
                <button @click="handleSubmit" class="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-lg shadow-black/10">
                    {{ editMode ? 'Save Changes' : 'Add Widget' }}
                </button>
                
                <button 
                    v-if="editMode" 
                    @click="handleDelete" 
                    class="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors"
                >
                    Delete Widget
                </button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
