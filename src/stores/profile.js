import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Instagram, Github, Linkedin, Twitter } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'

export const useProfileStore = defineStore('profile', () => {
    const profile = ref({
        name: 'Alex Developer',
        handle: '@alexdev',
        bio: 'Fullscreen creative developer. Lover of Vue, design systems, and dark mode.',
        location: 'New York, NY',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    })

    // Mock data for widgets
    const widgets = ref([
        { id: 1, type: 'social', title: 'Instagram', icon: Instagram, size: '1x1', content: 'https://instagram.com' },
        { id: 2, type: 'social', title: 'GitHub', icon: Github, size: '1x1', content: 'https://github.com' },
        { id: 3, type: 'text', content: 'Check out my latest blog post about Vue 3!', size: '2x1' }, // 2 wide, 1 high
        { id: 4, type: 'image', content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop', size: '2x2' },
        { id: 5, type: 'social', title: 'LinkedIn', icon: Linkedin, size: '1x1', content: 'https://linkedin.com' },
        { id: 6, type: 'placeholder', size: '1x1' } // Special placeholder for adding
    ])

    const user = ref(null)

    // Initialize Auth
    async function initAuth() {
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user || null

        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user || null
            if (user.value) loadData()
        })

        if (user.value) loadData()
    }

    async function loadData() {
        if (!user.value) return

        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.value.id)
            .single()

        if (profileData) {
            profile.value = {
                name: profileData.full_name || 'User',
                handle: profileData.username || '@user',
                bio: profileData.bio || '',
                location: profileData.location || '',
                avatar: profileData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            }
        }

        // Fetch Widgets
        const { data: widgetsData } = await supabase
            .from('widgets')
            .select('*')
            .eq('user_id', user.value.id)
            .order('position', { ascending: true })

        if (widgetsData && widgetsData.length > 0) {
            // Map widgets and restore icons if possible (requires mapping map)
            // For now, we assume simple types
            widgets.value = widgetsData.map(w => {
                let icon = null;
                // Simple mapping for demo
                if (w.title === 'Instagram') icon = Instagram;
                if (w.title === 'GitHub') icon = Github;
                if (w.title === 'LinkedIn') icon = Linkedin;

                return { ...w, icon }
            })
            // Add placeholder if not present? Or assume user adds it manually?
            // Let's add placeholder at the end for UI
            widgets.value.push({ id: 'placeholder', type: 'placeholder', size: '1x1' })
        }
    }

    const toggleEditMode = ref(false)

    // Debounce function for updates
    let timeout = null

    async function updateWidgets(newWidgets) {
        widgets.value = newWidgets

        if (!user.value) return

        // Debounce database updates to avoid spamming
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
            const updates = newWidgets
                .filter(w => typeof w.id === 'number') // Only update real existing widgets
                .map((w, index) => ({
                    id: w.id,
                    position: index
                }))

            if (updates.length > 0) {
                for (const update of updates) {
                    await supabase.from('widgets').update({ position: update.position }).eq('id', update.id)
                }
            }
        }, 1000)
    }


    async function deleteWidget(id) {
        widgets.value = widgets.value.filter(w => w.id !== id)

        if (user.value) {
            await supabase.from('widgets').delete().eq('id', id)
        }
    }

    async function editWidget(updatedWidget) {
        const index = widgets.value.findIndex(w => w.id === updatedWidget.id);
        if (index !== -1) {
            widgets.value[index] = { ...widgets.value[index], ...updatedWidget };

            if (user.value && typeof updatedWidget.id === 'number') {
                const { icon, ...dbWidget } = widgets.value[index];
                await supabase.from('widgets').update(dbWidget).eq('id', updatedWidget.id);
            }
        }
    }

    async function addWidget(widget) {
        // Prepare new widget object
        const newWidget = {
            ...widget,
            position: widgets.value.length, // Put at end initially
            user_id: user.value?.id
        }

        // Optimistic UI update
        const tempId = Date.now()
        widgets.value.splice(widgets.value.length - 1, 0, { ...newWidget, id: tempId }) // Insert before placeholder

        if (user.value) {
            // Remove icon component before sending to DB as it's not serializable
            const { icon, ...dbWidget } = newWidget

            const { data, error } = await supabase
                .from('widgets')
                .insert(dbWidget)
                .select()
                .single()

            if (data) {
                // Replace temp ID with real ID and restore icon
                const index = widgets.value.findIndex(w => w.id === tempId)
                if (index !== -1) {
                    widgets.value[index] = { ...widgets.value[index], id: data.id }
                }
            } else if (error) {
                console.error('Error adding widget:', error)
                // Revert optimistic update?
            }
        }
    }

    async function signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) console.error('Login error:', error)
    }

    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
        // maintain the profile view but in read-only mode, or clear it if you want strict privacy
        // For bento clone: usually you can still see the profile.
    }

    return {
        user,
        profile,
        widgets,
        toggleEditMode,
        initAuth,
        loadData,
        updateWidgets,
        deleteWidget,
        addWidget,
        editWidget,
        signInWithGoogle,
        signOut
    }
})
