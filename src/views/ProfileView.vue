<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProfileStore } from '../stores/profile'
import ProfileSidebar from '../components/ProfileSidebar.vue'
import BentoGrid from '../components/BentoGrid.vue'
import AddWidgetModal from '../components/AddWidgetModal.vue'
import ShareModal from '../components/ShareModal.vue'
import { Edit2, Check, Plus, Loader2 } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'

const route = useRoute()
const store = useProfileStore()
const showAddModal = ref(false)
const showShareModal = ref(false)
const isEditingWidget = ref(false)
const widgetToEdit = ref(null)
const currentUrl = window.location.href

// Logic to load profile key off route params
onMounted(async () => {
  store.initAuth() // Check global auth
  loadProfile()
})

watch(() => route.params.username, () => {
    loadProfile()
})

async function loadProfile() {
    const success = await store.loadProfileByUsername(route.params.username)
    if (!success) {
        // Handle 404
        // router.push('/') or show error state
    }
}

// Check for QR source tracking (global visit)
onMounted(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('source') === 'qr') {
        supabase.from('visits').insert({ source: 'qr' })
        .then(res => console.log('Tracked QR visit', res))
    }
})

// Modal Handlers
function handleAddWidget(widget) {
    store.addWidget(widget)
    showAddModal.value = false
}

function handleEditWidget(widget) {
    store.editWidget(widget)
    showAddModal.value = false
    isEditingWidget.value = false
    widgetToEdit.value = null
}

function openAddModal() {
    isEditingWidget.value = false
    widgetToEdit.value = null
    showAddModal.value = true
}

function openEditModal(widget) {
    isEditingWidget.value = true
    widgetToEdit.value = widget
    showAddModal.value = true
}

function toggleEdit() {
    store.toggleEditMode = !store.toggleEditMode
}
</script>

<template>
  <div v-if="store.isLoading || !store.profile" class="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
      <div class="flex flex-col items-center gap-4">
          <Loader2 class="w-8 h-8 animate-spin text-gray-400" />
          <p class="text-gray-400 font-medium tracking-tight">Loading Bento...</p>
      </div>
  </div>

  <div v-else class="min-h-screen flex flex-col md:flex-row bg-[#F5F5F7]">
    <!-- Mobile Header / Sidebar on Desktop -->
    <aside class="w-full md:w-1/3 lg:w-[350px] md:h-screen sticky top-0 bg-white/50 backdrop-blur-xl border-r border-gray-100 z-10 transition-all duration-300">
      <ProfileSidebar 
        :profile="store.profile" 
        :user="store.user"
        @login="store.signInWithGoogle"
        @logout="store.signOut"
        @share="showShareModal = true"
        @update="store.updateProfile"
        @upload-avatar="store.uploadAvatar"
      />
    </aside>

    <!-- Main Content -->
    <main class="flex-1 h-full md:h-screen relative overflow-hidden">
      <!-- Edit Toggle (Only for Owner) -->
      <div v-if="store.isOwner" class="absolute top-4 right-4 z-50 flex gap-2">
        <button 
          @click="toggleEdit"
          class="p-3 rounded-full shadow-lg transition-all border border-gray-100/50"
          :class="store.toggleEditMode ? 'bg-black text-white ring-4 ring-black/10' : 'bg-white text-gray-700 hover:bg-gray-100 active:scale-95'"
        >
          <Check v-if="store.toggleEditMode" class="w-5 h-5" />
          <Edit2 v-else class="w-5 h-5" />
        </button>
      </div>

      <BentoGrid 
        :items="store.widgets" 
        :editing="store.isOwner"
        :sorting="store.toggleEditMode && store.isOwner"
        @update:items="store.updateWidgets"
        @edit-item="openEditModal"
        @add-item="openAddModal" 
      />

      <!-- Floating Add Button (Only for Owner) -->
      <button 
        v-if="store.isOwner"
        @click="openAddModal"
        class="fixed bottom-8 right-8 z-50 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-110 hover:rotate-90 transition-all duration-300 active:scale-95"
      >
        <Plus class="w-6 h-6" />
      </button>
    </main>

    <!-- Modals -->
    <AddWidgetModal 
        :isOpen="showAddModal" 
        :editMode="isEditingWidget"
        :existingWidget="widgetToEdit"
        @close="showAddModal = false" 
        @add="handleAddWidget" 
        @edit="handleEditWidget"
        @delete="store.deleteWidget"
    />
    <ShareModal :isOpen="showShareModal" :url="currentUrl" @close="showShareModal = false" />
  </div>
</template>
