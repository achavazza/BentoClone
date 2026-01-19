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
        // Try to match icon if possible, but mainly rely on title
    } else if (newVal) {
        // Reset defaults
         url.value = '';
         title.value = '';
         textContent.value = '';
         selectedIcon.value = null;
         bgColor.value = '#ffffff';
         activeTab.value = 'social';
    }
});

function selectSocial(opt) {
    selectedIcon.value = opt.icon;
    title.value = opt.name;
    // Auto-set background color if not editing custom one, or just set it
    if (!props.editMode || bgColor.value === '#ffffff') {
        bgColor.value = opt.bg || '#ffffff';
    }
}

function handleSubmit() {
    let widget = {
        type: activeTab.value,
        bgColor: bgColor.value 
    };

    if (activeTab.value === 'social') {
        widget.title = title.value || 'Link';
        widget.content = url.value;
        widget.icon = selectedIcon.value; // Pass the CSS Class String
    } else if (activeTab.value === 'text') {
        widget.content = textContent.value;
    } else if (activeTab.value === 'image') {
        widget.content = url.value;
    }

    if (props.editMode) {
        emit('edit', { ...props.existingWidget, ...widget });
    } else {
        widget.size = activeTab.value === 'image' ? '2x2' : (activeTab.value === 'text' ? '2x1' : '1x1');
        emit('add', widget);
    }
    
    emit('close');
}

function close() {
  emit('close');
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="font-bold text-lg">{{ editMode ? 'Edit Widget' : 'Add to Bento' }}</h3>
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6">
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

        <!-- Social Form -->
        <div v-if="activeTab === 'social'" class="space-y-4">
          <!-- Only show Social Grid in Add Mode or if explicitly editing legacy -->
          <div v-if="!editMode" class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
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
          
          <!-- URL Input (Always visible) -->
          <input v-model="url" type="url" placeholder="Paste URL here..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />

          <!-- Details (Only visible in Edit Mode) -->
          <div v-if="editMode" class="space-y-4 pt-4 border-t border-gray-100">
              <input v-model="title" type="text" placeholder="Title" class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
              
              <div>
                 <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Background Color</label>
                 <div class="flex gap-2">
                     <input type="color" v-model="bgColor" class="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                     <input type="text" v-model="bgColor" class="flex-1 p-2 bg-gray-50 rounded-xl text-sm" />
                 </div>
            </div>
          </div>
        </div>

        <!-- Text/Image Forms (Simplified) -->
        <div v-if="activeTab === 'text'" class="space-y-4">
          <textarea v-model="textContent" rows="4" placeholder="Write something..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none resize-none"></textarea>
        </div>

        <div v-if="activeTab === 'image'" class="space-y-4">
           <input v-model="url" type="url" placeholder="Image URL..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
        </div>

        <button @click="handleSubmit" class="w-full mt-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95">
          {{ editMode ? 'Save Changes' : 'Add Widget' }}
        </button>
      </div>
    </div>
  </div>
</template>
