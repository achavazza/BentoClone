<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProfileStore } from '../stores/profile'
import ProfileSidebar from '../components/ProfileSidebar.vue'
import BentoGrid from '../components/BentoGrid.vue'
import AddWidgetModal from '../components/AddWidgetModal.vue'
import ShareModal from '../components/ShareModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import TextDetailModal from '../components/TextDetailModal.vue'
import AnalyticsModal from '../components/AnalyticsModal.vue'
import AuthModal from '../components/AuthModal.vue'
import { Edit2, Check, Plus, Loader2, Users } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../utils/analytics'

const route = useRoute()
const store = useProfileStore()
const showAddModal = ref(false)
const showShareModal = ref(false)
const showSettingsModal = ref(false)
const showTextModal = ref(false)
const showAnalyticsModal = ref(false)
const showAuthModal = ref(false)
const isEditingWidget = ref(false)
const widgetToEdit = ref(null)
const selectedTextWidget = ref(null)
const totalVisitors = ref(0)
const analyticsStats = ref(null)
const currentUrl = window.location.href

async function openAnalytics() {
    if (!store.profile) return
    const stats = await store.fetchAnalyticsData(store.profile.id)
    analyticsStats.value = stats
    showAnalyticsModal.value = true
}

// Logic to load profile key off route params
onMounted(async () => {
  await store.initAuth() // Wait for auth to be ready
  loadProfile()
})

watch(() => route.params.username, () => {
    loadProfile()
})

async function loadProfile() {
    const success = await store.loadProfileByUsername(route.params.username)
    if (success && store.profile) {
        updateFavicon(store.profile.avatar_url)
        if (!store.isOwner) {
            // Track visit if not the owner
            trackEvent({
                profile_id: store.profile.id,
                event_type: 'visit'
            })
        } else {
            // Fetch stats if owner
            totalVisitors.value = await store.fetchTotalVisits(store.profile.id)
        }
    }
    if (!success) {
        // Handle 404
        // router.push('/') or show error state
    }
}

function updateFavicon(url) {
    if (!url) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = url
}

// Watch for avatar changes to update favicon in real-time
watch(() => store.profile?.avatar_url, (newUrl) => {
    if (newUrl) updateFavicon(newUrl)
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

function handleItemClick(item) {
    if (store.toggleEditMode) return; // Don't open if editing

    // Track click for everyone (including owner if you want, but usually better to exclude)
    if (!store.isOwner) {
        trackEvent({
            profile_id: store.profile.id,
            event_type: 'click',
            widget_id: item.id,
            widget_type: item.type,
            target_url: item.content
        })
    }

    if (item.type === 'text' || item.type === 'image') {
        selectedTextWidget.value = item;
        showTextModal.value = true;
    }
}

function toggleEdit() {
    store.toggleEditMode = !store.toggleEditMode
}
</script>

<template>
  <div v-if="store.isLoading || !store.profile" class="min-h-screen flex items-center justify-center bg-white">
      <div class="flex flex-col items-center gap-4">
          <Loader2 class="w-8 h-8 animate-spin text-gray-400" />
          <p class="text-gray-400 font-medium tracking-tight">Loading Bento...</p>
      </div>
  </div>

  <div v-else class="min-h-screen md:h-screen flex flex-col md:flex-row bg-white w-full
            overflow-visible md:overflow-hidden">
    <!-- Sidebar on Desktop, Header on Mobile -->
    <aside class="w-full md:w-[400px] shrink-0 bg-white z-20
              static md:fixed md:top-0 md:left-0 md:h-screen">
      <ProfileSidebar 
        :profile="store.profile" 
        :user="store.user"
        :visitorCount="totalVisitors"
        @login="showAuthModal = true"
        @logout="store.signOut"
        @share="showShareModal = true"
        @open-settings="showSettingsModal = true"
        @open-analytics="openAnalytics"
        @update="store.updateProfile"
        @upload-avatar="store.uploadAvatar"
      />
    </aside>

    <!-- Main Content -->
    <main class="flex-1 bg-transparent
             overflow-visible md:overflow-y-auto
             md:ml-[400px] md:h-screen">
      <!-- Edit Toggle (Only for Owner) -->
     

      <BentoGrid 
        :items="store.widgets" 
        :editing="store.isOwner"
        :sorting="store.toggleEditMode && store.isOwner"
        @update:items="store.updateWidgets"
        @edit-item="openEditModal"
        @add-item="openAddModal" 
        @click-item="handleItemClick"
      />

      <!-- Floating Add Button (Only for Owner) -->
      
       <div v-if="store.isOwner" class="fixed bottom-20 md:bottom-8 right-8 z-50 z-50 flex gap-2">
        <button 
          @click="toggleEdit"
          class="p-4 rounded-full shadow-2xl transition-all border border-gray-100/50"
          :class="store.toggleEditMode ? 'bg-black text-white ring-4 ring-black/10' : 'bg-white text-gray-700 hover:bg-gray-100 active:scale-95'"
        >
          <Check v-if="store.toggleEditMode" class="w-5 h-5" />
          <Edit2 v-else class="w-5 h-5" />
        </button>
        <button 
          v-if="store.isOwner"
          @click="openAddModal"
          class="p-4 bg-black text-white rounded-full shadow-2xl hover:scale-110 hover:rotate-90 transition-all duration-300 active:scale-95"
          >
        <Plus class="w-6 h-6" />
      </button>
      </div> 
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
    <SettingsModal :isOpen="showSettingsModal" :currentHandle="store.profile.username" @close="showSettingsModal = false" />
    <TextDetailModal 
        v-if="selectedTextWidget"
        :isOpen="showTextModal" 
        :title="selectedTextWidget.title" 
        :content="selectedTextWidget.content" 
        :type="selectedTextWidget.type"
        @close="showTextModal = false" 
    />
    <AnalyticsModal 
        v-if="analyticsStats"
        :isOpen="showAnalyticsModal"
        :stats="analyticsStats"
        @close="showAnalyticsModal = false"
    />
    <AuthModal :isOpen="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>
