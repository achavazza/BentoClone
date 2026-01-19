<script setup>
import { MapPin, Share2 } from 'lucide-vue-next';

defineProps({
  profile: {
    type: Object,
    required: true,
    default: () => ({
      name: 'User Name',
      handle: '@username',
      bio: 'Digital Creator & Developer. Building cool things with Vue.',
      location: 'San Francisco, CA',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    })
  },
  user: Object
});

defineEmits(['login', 'logout', 'share']);
</script>

<template>
  <div class="h-full flex flex-col items-center text-center p-8 sticky top-0">
    <div class="relative group mb-6">
      <div class="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-xl">
        <img :src="profile.avatar" alt="Profile" class="w-full h-full object-cover" />
      </div>
    </div>
    
    <h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-1">{{ profile.name }}</h1>
    <p class="text-gray-500 font-medium mb-4">{{ profile.handle }}</p>
    
    <p class="text-gray-600 text-lg leading-relaxed mb-6 max-w-sm">
      {{ profile.bio }}
    </p>
    
    <div class="flex items-center text-gray-500 text-sm font-medium mb-8">
      <MapPin class="w-4 h-4 mr-1.5" />
      {{ profile.location }}
    </div>
    
    <div class="mt-auto w-full">
        <!-- Main Actions -->
        <div class="flex gap-2 mb-6">
             <button @click="$emit('share')" class="flex-1 flex items-center justify-center px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-lg">
                <Share2 class="w-4 h-4 mr-2" />
                Share
            </button>
             
            <button 
              v-if="!user"
              @click="$emit('login')"
              class="px-6 py-3 bg-white text-black border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition-colors"
            >
              Log in
            </button>
            
            <button 
              v-else
              @click="$emit('logout')"
              class="px-6 py-3 bg-gray-100 text-red-500 rounded-full font-bold hover:bg-red-50 transition-colors"
            >
              Log out
            </button>
        </div>

        <!-- Minimalist Footer Links -->
        <div class="flex justify-center mt-4">
             <a href="#" class="text-xs font-medium text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                Create your own Bento
             </a>
        </div>
    </div>
  </div>
</template>
