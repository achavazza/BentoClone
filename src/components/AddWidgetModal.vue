<script setup>
import { ref, watch, computed } from 'vue';
import { X, Instagram, Github, Linkedin, Youtube, Twitter, MessageSquare, Image, Music, Video } from 'lucide-vue-next';

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
  { name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  { name: 'GitHub', icon: Github, color: 'text-gray-900' },
  { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { name: 'YouTube', icon: Youtube, color: 'text-red-600' },
  { name: 'Twitter (X)', icon: Twitter, color: 'text-black' },
  { name: 'TikTok', icon: Music, color: 'text-black' }, // Using Music as placeholder
  { name: 'Vimeo', icon: Video, color: 'text-blue-400' },
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
         // Find icon if possible, or keep as is (icon saving logic needs refinement in real app)
         // For now reset icon selection visually but keep logic simple
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

function handleSubmit() {
    let widget = {
        type: activeTab.value,
        bgColor: bgColor.value
    };

    if (activeTab.value === 'social') {
        widget.title = title.value || 'Link';
        widget.content = url.value;
        widget.icon = selectedIcon.value; // In edit mode, if not changed, might be lost?
        // Note: Icon persistence is tricky with component refs. 
        // Real app should store string identifier for icon.
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
        <!-- Tabs (only if not editing, or allow changing type?) -->
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

        <!-- Common Fields -->
        <div class="mb-4">
             <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Background Color</label>
             <div class="flex gap-2">
                 <input type="color" v-model="bgColor" class="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                 <input type="text" v-model="bgColor" class="flex-1 p-2 bg-gray-50 rounded-xl text-sm" />
             </div>
        </div>

        <!-- Social Form -->
        <div v-if="activeTab === 'social'" class="space-y-4">
          <div class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            <button 
              v-for="opt in socialOptions" 
              :key="opt.name"
              @click="selectedIcon = opt.icon; title = opt.name"
              class="flex flex-col items-center p-2 rounded-xl border-2 transition-all"
              :class="selectedIcon === opt.icon ? 'border-black bg-gray-50' : 'border-transparent hover:bg-gray-50'"
            >
              <component :is="opt.icon" :class="['w-5 h-5 mb-1', opt.color]" />
              <span class="text-[10px] font-medium text-center leading-tight">{{ opt.name }}</span>
            </button>
          </div>
          
          <input v-model="title" type="text" placeholder="Title (e.g. My Instagram)" class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
          <input v-model="url" type="url" placeholder="Paste URL here..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
        </div>

        <!-- Text Form -->
        <div v-if="activeTab === 'text'" class="space-y-4">
          <textarea v-model="textContent" rows="4" placeholder="Write something..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none resize-none"></textarea>
        </div>

        <!-- Image Form -->
        <div v-if="activeTab === 'image'" class="space-y-4">
           <input v-model="url" type="url" placeholder="Image URL..." class="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/10 outline-none" />
           <p class="text-xs text-center text-gray-400">Ideally use a direct link (Unsplash, etc)</p>
        </div>

        <button @click="handleSubmit" class="w-full mt-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95">
          {{ editMode ? 'Save Changes' : 'Add Widget' }}
        </button>
      </div>
    </div>
  </div>
</template>
