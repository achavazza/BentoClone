<script setup>
import { computed, ref } from 'vue';
import { MapPin, Users, Share2, Camera, Settings } from 'lucide-vue-next';

const props = defineProps({
  profile: {
    type: Object,
    required: true,
    default: () => ({
      full_name: 'User Name',
      username: 'username',
      bio: 'Digital Creator & Developer.',
      location: 'San Francisco, CA',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      id: null
    })
  },
  user: Object,
  visitorStats: {
    type: Object,
    default: () => ({ total: 0, today: 0 })
  }
});

const emit = defineEmits(['login', 'logout', 'share', 'update', 'upload-avatar', 'open-settings', 'open-analytics']);

const isOwner = computed(() => props.user && props.profile && props.user.id === props.profile.id);

const fileInput = ref(null);

function triggerUpload() {
    if (!isOwner.value) return;
    fileInput.value.click();
}

function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) emit('upload-avatar', file);
}

function updateField(field, event) {
    const value = event.target.innerText;
    if (value !== props.profile[field]) {
        emit('update', { [field]: value });
    }
}
</script>

<template>
  <div class="h-full flex flex-col items-center md:items-start p-8 sticky top-0 overflow-y-auto">
    <!-- Avatar -->
    <div class="relative group mb-6">
      <div class="w-48 h-48 rounded-full overflow-hidden bg-gray-100 relative border-1 border-gray-100/50">
        <img 
          :src="profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`" 
          alt="Profile" 
          class="w-full h-full object-cover transition-opacity duration-300" 
          :class="{'group-hover:opacity-75': isOwner}" 
        />
        
        <!-- Upload Overlay -->
        <div v-if="isOwner" 
             @click="triggerUpload"
             class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-medium">
             <Camera class="w-8 h-8 opacity-80" />
        </div>
      </div>
      <input type="file" ref="fileInput" class="hidden" accept="image/jpeg,image/png" @change="handleFileChange" />
    </div>
    
    <h1 
        class="text-3xl font-bold tracking-tight text-gray-900 mb-1 outline-none rounded transition-all border border-transparent"
        :class="{'hover:border-gray-200 focus:border-gray-300 focus:bg-white cursor-text': isOwner}"
        :contenteditable="isOwner"
        @blur="updateField('full_name', $event)"
        spellcheck="false"
    >
      {{ profile.full_name || 'Your Name' }}
    </h1>
    <p class="text-gray-500 font-medium mb-4 flex  items-center gap-2">
      @{{ profile.username }}
      <button v-if="isOwner" @click="$emit('open-settings')" class="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
        <Settings class="w-4 h-4" />
      </button>
    </p>
    
    <!-- Bio (Editable) -->
    <p 
        class="text-gray-600 text-lg leading-relaxed mb-6 max-w-sm outline-none rounded transition-all border border-transparent whitespace-pre-wrap"
        :class="{'hover:border-gray-200 focus:border-gray-300 focus:bg-white cursor-text': isOwner}"
        :contenteditable="isOwner"
        @blur="updateField('bio', $event)"
        spellcheck="false"
    >
      {{ profile.bio }}
    </p>
    
    <!-- Location (Editable) -->
    <div class="flex items-center  text-gray-500 text-sm font-medium mb-8">
      <div class="p-1  hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
        <MapPin class="w-4 h-4 flex-shrink-0" />
      </div>
      <span 
        class="outline-none px-1 rounded transition-all border border-transparent"
         :class="{'hover:border-gray-200 focus:border-gray-300 focus:bg-white cursor-text': isOwner}"
        :contenteditable="isOwner"
        @blur="updateField('location', $event)"
      >
        {{ profile.location }}
      </span>
    </div>
    
    <div class="mt-auto w-full fixed bottom-0 py-4 md:py-0 bg-white md:static md:bottom-auto md:bg-transparent">
       <!-- Minimalist Footer Links -->
        
        <!-- Main Actions -->
        <div class="flex gap-2 justify-center md:justify-start flex-wrap">
            <button 
                v-if="isOwner" 
                @click="$emit('open-analytics')" 
                class="text-xs font-bold text-gray-500 p-2 rounded-md hover:bg-gray-100/50 hover:text-black transition-colors flex items-center gap-1"
            >
                <Users class="w-4 h-4 mr-1" />
                {{ visitorStats.today }} Today
            </button>

            <button @click="$emit('share')" class="text-xs font-bold text-gray-500 p-2 rounded-md hover:bg-gray-100/50 hover:text-black transition-colors flex items-center gap-1">
                <Share2 class="w-4 h-4 mr-1" />
                Share
            </button>

            <button 
              v-if="user"
              @click="$emit('logout')"
              class="text-xs font-bold text-gray-500 p-2 rounded-md hover:bg-gray-100/50 hover:text-black transition-colors flex items-center gap-1"
            >
              Sign out
            </button>
            
            <div v-if="!user" class="flex items-center gap-2">
                <div class="mx-1 border-l border-gray-200 h-4"></div>
                <button @click="$emit('login')" class="text-xs font-bold text-black border-2 border-black/5 px-4 py-2 rounded-xl hover:bg-black hover:text-white transition-all">
                    Login
                </button>
            </div>
        </div>

       
    </div>
  </div>
</template>
