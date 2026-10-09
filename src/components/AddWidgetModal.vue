<script setup>
import { ref, computed, watch } from 'vue';
import { X, Upload, Loader2, AlertCircle, ImageIcon } from 'lucide-vue-next';
import { socialIcons } from '../lib/icons';
import { useProfileStore } from '../stores/profile';
import { useNotifyStore } from '../stores/notify';

const props = defineProps({
  isOpen: Boolean,
  editMode: Boolean,
  existingWidget: Object
});

const emit = defineEmits(['close', 'add', 'edit', 'delete']);

const store = useProfileStore();
const notify = useNotifyStore();
const activeTab = ref('social');
const url = ref('');
const title = ref('');
const textContent = ref('');
const selectedIcon = ref(null);
const bgColor = ref('#ffffff');
const description = ref('');
const customFavicon = ref('');
const faviconOpen = ref(false);
const faviconDraft = ref('');
const autoFaviconFailed = ref(false);
const showPreview = ref(true);
const customBackground = ref('');
const isUploading = ref(false);
const uploadError = ref('');
const urlError = ref('');

function getAutoFavicon(inputUrl) {
    if (!inputUrl || !inputUrl.startsWith('http')) return null;
    try {
        const parsed = new URL(inputUrl);
        if (parsed.hostname) {
            return `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`;
        }
    } catch (e) {}
    return null;
}

const faviconPreview = computed(() => {
    if (customFavicon.value) return customFavicon.value;
    if (selectedIcon.value && (selectedIcon.value.startsWith('http') || selectedIcon.value.startsWith('data:'))) return selectedIcon.value;
    if (url.value && activeTab.value === 'social' && !autoFaviconFailed.value) return getAutoFavicon(url.value);
    return null;
});

function openFaviconEditor() {
    faviconOpen.value = true;
    faviconDraft.value = customFavicon.value
        || (faviconPreview.value && /^https?:/i.test(faviconPreview.value) ? faviconPreview.value : '');
}

function acceptFavicon() {
    customFavicon.value = faviconDraft.value.trim();
    faviconOpen.value = false;
}

function clearFavicon() {
    customFavicon.value = '';
    faviconOpen.value = false;
}

const socialOptions = [
  { name: 'Instagram', icon: socialIcons['Instagram'], bg: '#FCE7F3' },
  { name: 'GitHub', icon: socialIcons['GitHub'], bg: '#F3F4F6' },
  { name: 'LinkedIn', icon: socialIcons['LinkedIn'], bg: '#DBEAFE' },
  { name: 'YouTube', icon: socialIcons['YouTube'], bg: '#FEE2E2' },
  { name: 'Twitter (X)', icon: socialIcons['Twitter (X)'], bg: '#F3F4F6' },
  { name: 'TikTok', icon: socialIcons['TikTok'], bg: '#F3F4F6' },
  { name: 'Vimeo', icon: socialIcons['Vimeo'], bg: '#E0F2FE' },
  { name: 'Behance', icon: socialIcons['Behance'], bg: '#E0F2FE' },
];

const size = ref('1x1');

const widgetCount = computed(() => store.widgets.filter(w => w.type !== 'placeholder' && typeof w.id === 'number').length);
const atLimit = computed(() => !props.editMode && widgetCount.value >= store.MAX_WIDGETS);

// Initialize form when opening in edit mode
watch(() => props.isOpen, (newVal) => {
    if (newVal && props.editMode && props.existingWidget) {
        // Pre-fill
        const w = props.existingWidget;
        activeTab.value = w.type;
        url.value = w.content || '';
        title.value = w.title || '';
        textContent.value = w.content || '';
        description.value = w.description || '';
        customFavicon.value = '';
        bgColor.value = w.bgColor || '#ffffff';
        size.value = w.size || '1x1';
        selectedIcon.value = w.icon || null;
        showPreview.value = w.show_preview !== false;
        customBackground.value = w.background_url || '';
        faviconOpen.value = false;
        faviconDraft.value = '';
        bgPreviewError.value = false;
        uploadError.value = '';
    } else if (newVal) {
        // Reset defaults
         url.value = '';
         title.value = '';
         textContent.value = '';
         description.value = '';
         customFavicon.value = '';
         selectedIcon.value = null;
         bgColor.value = '#ffffff';
         activeTab.value = 'social';
         size.value = '1x1';
         showPreview.value = true;
         customBackground.value = '';
         faviconOpen.value = false;
         faviconDraft.value = '';
         uploadError.value = '';
    }
});

watch(url, () => {
    autoFaviconFailed.value = false;
});

// Which image the "imagen de fondo" will use: custom URL or the cached preview.
const bgPreviewSrc = computed(() => {
    if (customBackground.value && /^https?:\/\//i.test(customBackground.value)) return customBackground.value;
    const p = props.existingWidget?.preview?.image_url;
    return p && /^https?:\/\//i.test(p) ? p : null;
});
const bgPreviewError = ref(false);
watch(customBackground, () => { bgPreviewError.value = false; });

function selectSocial(opt) {
    selectedIcon.value = opt.icon;
    title.value = opt.name;
    bgColor.value = opt.bg;
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    isUploading.value = true;
    uploadError.value = '';
    
    try {
        const publicUrl = await store.uploadWidgetImage(file);
        if (publicUrl) {
            url.value = publicUrl;
        } else {
            uploadError.value = 'No se pudo subir la imagen.';
            notify.error('No se pudo subir la imagen', uploadError.value);
        }
    } catch (e) {
        uploadError.value = e.message || 'No se pudo subir la imagen.';
        notify.error('No se pudo subir la imagen', e.message);
    } finally {
        isUploading.value = false;
    }
}

function handleSubmit() {
    if (isUploading.value) return;

    urlError.value = '';

    if ((activeTab.value === 'social' || activeTab.value === 'image') && !/^https?:\/\//i.test(url.value)) {
        urlError.value = 'Please enter a valid URL starting with http:// or https://';
        return;
    }

    let widget = {
        type: activeTab.value,
        bgColor: bgColor.value,
        size: size.value,
        show_preview: showPreview.value
    };

    widget.description = description.value || '';

    if (activeTab.value === 'social') {
        widget.title = title.value || 'Link';
        widget.content = url.value;
        widget.icon = customFavicon.value || selectedIcon.value || getAutoFavicon(url.value);
        widget.background_url = customBackground.value || null;
    } else if (activeTab.value === 'text') {
        widget.title = title.value;
        widget.content = textContent.value;
    } else if (activeTab.value === 'image') {
        widget.title = title.value;
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
                <div v-else-if="activeTab === 'image'" class="space-y-4">
                    <div v-if="url" class="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 group">
                        <img :src="url" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label class="cursor-pointer bg-white text-black px-4 py-2 rounded-xl font-bold text-sm">
                                Change Image
                                <input type="file" @change="handleFileUpload" accept="image/jpeg,image/png" class="hidden" />
                            </label>
                        </div>
                    </div>
                    <label v-else class="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-black/20 transition-colors cursor-pointer">
                        <div v-if="isUploading" class="flex flex-col items-center gap-2">
                            <Loader2 class="w-8 h-8 animate-spin text-gray-400" />
                            <span class="text-xs font-bold text-gray-400">Uploading...</span>
                        </div>
                        <template v-else>
                            <div class="p-3 bg-gray-50 rounded-full">
                                <Upload class="w-6 h-6 text-gray-400" />
                            </div>
                            <div class="text-center">
                                <span class="block text-sm font-bold text-gray-900">Upload Image</span>
                                <span class="block text-xs text-gray-400">JPG/PNG, Max 2MB</span>
                            </div>
                        </template>
                        <input type="file" @change="handleFileUpload" accept="image/jpeg,image/png" class="hidden" :disabled="isUploading" />
                    </label>

                    <div v-if="uploadError" class="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl">
                        <AlertCircle class="w-4 h-4 shrink-0" />
                        <span class="text-xs font-bold">{{ uploadError }}</span>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="h-px bg-gray-100 flex-1"></div>
                        <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">or</span>
                        <div class="h-px bg-gray-100 flex-1"></div>
                    </div>

                    <input v-model="url" type="url" placeholder="Paste image URL..." class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-medium" />
                </div>
                <div v-else>
                    <div class="flex items-center gap-2">
                        <input v-model="url" type="url" placeholder="Link URL..." class="flex-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-medium" />

                        <!-- Favicon: click to change it -->
                        <button
                            type="button"
                            @click="openFaviconEditor"
                            class="relative w-12 h-12 shrink-0 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                            :title="faviconPreview || 'Sin favicon — clic para cambiar'"
                        >
                            <img v-if="faviconPreview" :src="faviconPreview" class="w-full h-full object-contain p-1.5" alt="" referrerpolicy="no-referrer" @error="autoFaviconFailed = true" />
                            <ImageIcon v-else class="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <!-- Collapsed favicon editor -->
                    <div v-if="faviconOpen" class="mt-3 p-3 bg-gray-50 rounded-2xl space-y-2">
                        <div class="flex items-center gap-2">
                            <input v-model="faviconDraft" type="url" placeholder="Custom favicon URL..." class="flex-1 p-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium" @keyup.enter="acceptFavicon" />
                            <button type="button" @click="acceptFavicon" class="shrink-0 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors">OK</button>
                            <button type="button" @click="faviconOpen = false" class="shrink-0 p-2.5 rounded-xl hover:bg-gray-200 text-gray-400 transition-colors" aria-label="Cerrar">
                                <X class="w-4 h-4" />
                            </button>
                        </div>
                        <button v-if="customFavicon" type="button" @click="clearFavicon" class="text-xs font-bold text-gray-400 hover:text-gray-600">Quitar favicon personalizado</button>
                    </div>

                    <!-- Background preview toggle -->
                    <div class="mt-3 p-4 bg-gray-50 rounded-2xl space-y-3">
                        <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <span class="block text-sm font-bold text-gray-900">Imagen de fondo</span>
                                <span class="block text-[11px] text-gray-400 font-medium leading-tight">Vista previa del enlace sobre el color de la caja. Se completa sola con el fetch periódico.</span>
                            </div>
                            <button
                                type="button"
                                @click="showPreview = !showPreview"
                                class="w-11 h-6 rounded-full transition-colors shrink-0 relative"
                                :class="showPreview ? 'bg-black' : 'bg-gray-300'"
                                aria-label="Toggle background preview"
                            >
                                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="showPreview ? 'left-5' : 'left-0.5'"></span>
                            </button>
                        </div>

                        <template v-if="showPreview">
                            <div v-if="bgPreviewSrc" class="relative rounded-2xl overflow-hidden aspect-video bg-white border border-gray-200">
                                <img :src="bgPreviewSrc" class="w-full h-full object-cover" alt="" referrerpolicy="no-referrer" @error="bgPreviewError = true" />
                                <div v-if="bgPreviewError" class="absolute inset-0 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">No se pudo cargar la imagen</div>
                            </div>
                            <div v-else class="rounded-2xl bg-white border border-dashed border-gray-200 py-3 px-4 text-center text-xs font-bold text-gray-400">
                                Sin imagen todavía: se genera sola con el fetch periódico del enlace.
                            </div>

                            <input v-model="customBackground" type="url" placeholder="URL de imagen personalizada (opcional) sobreescribe la preview..." class="w-full p-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 outline-none text-sm font-medium" />
                        </template>
                    </div>
                </div>

                <!-- Extended Details: Title -> Description -> Size + Background -->
                <div v-if="editMode || activeTab !== 'social'" class="space-y-6 pt-6 border-t border-gray-100">
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Custom Title</label>
                        <input v-model="title" type="text" placeholder="e.g. My Portfolio" class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-bold" />
                    </div>

                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Description</label>
                        <textarea v-model="description" rows="2" placeholder="A short description..." class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none resize-none font-medium text-sm"></textarea>
                    </div>

                    <div class="flex items-end gap-4">
                        <!-- Box Size (dropdown) -->
                        <div class="flex-1">
                            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Box Size</label>
                            <select v-model="size" class="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black/5 outline-none font-bold cursor-pointer">
                                <option value="1x1">1×1 — Square</option>
                                <option value="2x1">2×1 — Wide</option>
                                <option value="1x2">1×2 — Tall</option>
                                <option value="2x2">2×2 — Large</option>
                            </select>
                        </div>

                        <!-- Background -->
                        <div class="flex-1">
                            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Background</label>
                            <div class="flex gap-3 items-center p-1 bg-gray-50 rounded-2xl">
                                 <div class="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                                     <input type="color" v-model="bgColor" class="absolute -inset-2 w-[150%] h-[150%] cursor-pointer border-none bg-transparent" />
                                 </div>
                                 <input type="text" v-model="bgColor" class="w-full bg-transparent border-none focus:ring-0 text-sm font-mono font-bold uppercase" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-3 pt-4 pb-2">
                <p v-if="urlError" class="text-red-500 text-xs font-bold">{{ urlError }}</p>
                <p v-if="atLimit" class="text-red-500 text-xs font-bold">Límite alcanzado: máximo {{ store.MAX_WIDGETS }} widgets por perfil.</p>
                <button @click="handleSubmit" :disabled="isUploading || atLimit" class="w-full py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span v-if="isUploading" class="flex items-center justify-center gap-2">
                        <Loader2 class="w-5 h-5 animate-spin" />
                        Uploading...
                    </span>
                    <span v-else>{{ editMode ? 'Save Changes' : 'Add Widget' }}</span>
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
