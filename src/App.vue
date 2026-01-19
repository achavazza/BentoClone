<script setup>
import { ref, onMounted } from 'vue'
import { useProfileStore } from './stores/profile'
import ProfileSidebar from './components/ProfileSidebar.vue'
import BentoGrid from './components/BentoGrid.vue'
import AddWidgetModal from './components/AddWidgetModal.vue'
import ShareModal from './components/ShareModal.vue'
import { Edit2, Check, Plus } from 'lucide-vue-next'
import { supabase } from './lib/supabase'

const store = useProfileStore()
const showAddModal = ref(false)
const showShareModal = ref(false)
const isEditingWidget = ref(false)
const widgetToEdit = ref(null)
const currentUrl = window.location.href

onMounted(() => {
  store.initAuth()

  // Check for QR source
  const params = new URLSearchParams(window.location.search)
  if (params.get('source') === 'qr') {
    // Send event to Supabase
    supabase.from('visits').insert({ source: 'qr' })
      .then(res => console.log('Tracked QR visit', res))
  }
})

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
    if (!store.user) {
        alert("Please sign in to edit your profile.")
        return
    }
    store.toggleEditMode = !store.toggleEditMode
}
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row bg-[#F5F5F7]">
    <!-- Mobile Header / Sidebar on Desktop -->
    <aside class="w-full md:w-1/3 lg:w-[350px] md:h-screen sticky top-0 bg-white/50 backdrop-blur-xl border-r border-gray-100 z-10">
      <ProfileSidebar 
        :profile="store.profile" 
        :user="store.user"
        @login="store.signInWithGoogle"
        @logout="store.signOut"
        @share="showShareModal = true"
      />
    </aside>

    <!-- Main Content -->
    <main class="flex-1 h-full md:h-screen relative">
      <!-- Edit Toggle -->
      <div v-if="store.user" class="absolute top-4 right-4 z-50 flex gap-2">
        <button 
          @click="toggleEdit"
          class="p-3 rounded-full shadow-lg transition-all"
          :class="store.toggleEditMode ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100'"
        >
          <Check v-if="store.toggleEditMode" class="w-5 h-5" />
          <Edit2 v-else class="w-5 h-5" />
        </button>
      </div>

      <BentoGrid 
        :items="store.widgets" 
        :editing="store.toggleEditMode"
        @update:items="store.updateWidgets"
        @delete-item="store.deleteWidget"
        @edit-item="openEditModal"
        @add-item="openAddModal" 
      />

      <!-- Floating Add Button (only when logged in) -->
      <button 
        v-if="store.user"
        @click="openAddModal"
        class="fixed bottom-8 right-8 z-50 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
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
    />
    <ShareModal :isOpen="showShareModal" :url="currentUrl + '?source=qr'" @close="showShareModal = false" />
  </div>
</template>
