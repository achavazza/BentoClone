import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { socialIcons } from '../lib/icons'

export const useProfileStore = defineStore('profile', () => {
    // 1. Auth State (Who is logged in?)
    const user = ref(null)

    // 2. Viewed Profile State (What are we looking at?)
    const profile = ref(null)
    const widgets = ref([])
    const toggleEditMode = ref(false)
    const isLoading = ref(false)

    // 3. Computed Permissions
    const isOwner = computed(() => {
        return user.value && profile.value && user.value.id === profile.value.id
    })

    // Social Icon Map
    // Social Icons are now handled via URLs in src/lib/icons.js

    // --- Actions ---

    // Initialize Auth (Global)
    async function initAuth() {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user || null

        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
            user.value = session?.user || null
            if (user.value) {
                // If we happen to be viewing our own profile, we might need to refresh permissions
                // But computed `isOwner` handles it reactively.
                checkAndCreateProfile(user.value)
            }
        })

        if (user.value) {
            checkAndCreateProfile(user.value)
        }
    }

    // Ensure profile exists in DB on login
    async function checkAndCreateProfile(authUser) {
        const { data } = await supabase.from('profiles').select('id').eq('id', authUser.id).single()
        if (!data) {
            // Create profile
            const username = authUser.email.split('@')[0] + Math.floor(Math.random() * 1000);
            await supabase.from('profiles').insert({
                id: authUser.id,
                username: username,
                full_name: authUser.user_metadata.full_name || 'Creator',
                avatar_url: authUser.user_metadata.avatar_url,
                bio: 'Welcome to my Bento!',
                location: 'Earth'
            })
        }
    }

    // Load Public Profile by Handle (username)
    async function loadProfileByUsername(username) {
        isLoading.value = true
        profile.value = null
        widgets.value = []

        try {
            // 1. Get Profile
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single()

            if (error || !profileData) {
                console.error("Profile not found")
                return false
            }

            profile.value = profileData

            // 2. Get Widgets
            const { data: widgetsData } = await supabase
                .from('widgets')
                .select('*')
                .eq('user_id', profileData.id)
                .order('position', { ascending: true })

            if (widgetsData) {
                widgets.value = widgetsData.map(w => {
                    // Start with specific icon if saved, else derive from Title
                    // For now, simpler: derive from Title mapping
                    // We need to match title to keys in socialIcons
                    let iconUrl = null

                    // Try exact match
                    if (socialIcons[w.title]) {
                        iconUrl = socialIcons[w.title]
                    } else {
                        // Try partial match
                        const key = Object.keys(socialIcons).find(k => w.title && w.title.includes(k))
                        if (key) iconUrl = socialIcons[key]
                    }

                    return { ...w, icon: iconUrl }
                });
            }
            return true

        } catch (e) {
            console.error(e)
            return false
        } finally {
            isLoading.value = false
        }
    }

    // CRUD Ops (Guarded by isOwner check implicitly via RLS, but explicit check good for UI)

    async function updateWidgets(newWidgets) {
        widgets.value = newWidgets
        if (!isOwner.value) return

        // Debounce
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
            const updates = newWidgets
                .filter(w => typeof w.id === 'number')
                .map((w, index) => ({ id: w.id, position: index }))

            if (updates.length > 0) {
                for (const update of updates) {
                    await supabase.from('widgets').update({ position: update.position }).eq('id', update.id)
                }
            }
        }, 1000)
    }

    let timeout = null

    async function addWidget(widget) {
        if (!isOwner.value) return

        const newWidget = {
            ...widget,
            position: widgets.value.length - 1, // Before placeholder
            user_id: user.value.id
        }

        // Optimistic
        const tempId = Date.now()
        // Insert before placeholder (last item)
        const lastIdx = widgets.value.length - 1
        widgets.value.splice(lastIdx, 0, { ...newWidget, id: tempId })

        // Save
        const { icon, ...dbWidget } = newWidget
        const { data, error } = await supabase.from('widgets').insert(dbWidget).select().single()

        if (data) {
            const idx = widgets.value.findIndex(w => w.id === tempId)
            if (idx !== -1) widgets.value[idx] = { ...widgets.value[idx], id: data.id }
        } else {
            console.error(error)
            // Rollback
            widgets.value = widgets.value.filter(w => w.id !== tempId)
        }
    }

    async function editWidget(updatedWidget) {
        if (!isOwner.value) return // Check ownership

        const index = widgets.value.findIndex(w => w.id === updatedWidget.id);
        if (index !== -1) {
            widgets.value[index] = { ...widgets.value[index], ...updatedWidget };

            if (typeof updatedWidget.id === 'number') {
                const { icon, ...dbWidget } = widgets.value[index];
                await supabase.from('widgets').update(dbWidget).eq('id', updatedWidget.id);
            }
        }
    }

    async function deleteWidget(id) {
        if (!isOwner.value) return
        widgets.value = widgets.value.filter(w => w.id !== id)
        await supabase.from('widgets').delete().eq('id', id)
    }

    async function checkHandleAvailability(username) {
        // Ignore current user's own handle
        if (profile.value && profile.value.username === username) return true

        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single()

        // If data exists, it's taken (unless it's us, handled above)
        return !data
    }

    async function updateHandle(username) {
        if (!user.value) return false

        const { error } = await supabase
            .from('profiles')
            .update({ username: username })
            .eq('id', user.value.id)

        if (!error) {
            // Update local profile state
            if (profile.value) profile.value.username = username
            return true
        }
        return false
    }

    async function updateProfile(updates) {
        if (!user.value) return

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.value.id)

        if (!error && profile.value) {
            profile.value = { ...profile.value, ...updates }
        }
    }

    async function uploadAvatar(file) {
        if (!user.value) return

        const fileExt = file.name.split('.').pop()
        const fileName = `${user.value.id}.${fileExt}`
        const filePath = `${fileName}`

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            console.error('Avatar upload failed', uploadError)
            return
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // Update Profile
        await updateProfile({ avatar_url: publicUrl })
    }

    async function signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        })
    }

    async function signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    }

    async function signUpWithEmail(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: email.split('@')[0]
                }
            }
        })
        if (error) throw error
        return data
    }

    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
        window.location.href = '/'
    }

    return {
        user,
        profile,
        widgets,
        isOwner,
        toggleEditMode,
        isLoading,
        initAuth,
        loadProfileByUsername,
        updateWidgets,
        addWidget,
        editWidget,
        deleteWidget,
        checkHandleAvailability,
        updateHandle,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        // Restored Actions
        updateProfile,
        uploadAvatar
    }
})
