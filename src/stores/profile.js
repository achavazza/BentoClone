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
        const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()

        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture

        if (!existingProfile) {
            // Create profile
            const username = authUser.email.split('@')[0] + Math.floor(Math.random() * 1000);
            await supabase.from('profiles').insert({
                id: authUser.id,
                username: username,
                full_name: authUser.user_metadata.full_name || 'Creator',
                avatar_url: googleAvatar,
                bio: 'Welcome to my Bento!',
                location: 'Earth'
            })
        } else if (!existingProfile.avatar_url && googleAvatar) {
            // Sync Google avatar to existing profile if it doesn't have one
            await updateProfile({ avatar_url: googleAvatar })
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
                widgets.value = widgetsData.map(w => ({ ...w, icon: getWidgetIcon(w) }));
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
        const widgetWithIcon = { ...newWidget, id: tempId, icon: getWidgetIcon(newWidget) }

        // Insert before placeholder (last item)
        const lastIdx = widgets.value.length - 1
        widgets.value.splice(lastIdx, 0, widgetWithIcon)

        // Save
        const { data, error } = await supabase.from('widgets').insert(newWidget).select().single()

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
            const merged = { ...widgets.value[index], ...updatedWidget };
            widgets.value[index] = { ...merged, icon: getWidgetIcon(merged) };

            if (typeof updatedWidget.id === 'number') {
                await supabase.from('widgets').update(widgets.value[index]).eq('id', updatedWidget.id);
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
        if (!user.value || !profile.value) return { success: false, error: 'Not logged in' }

        // 1. Rate Limit Check (24h)
        if (profile.value.handle_updated_at) {
            const lastUpdate = new Date(profile.value.handle_updated_at).getTime()
            const now = new Date().getTime()
            const diffHours = (now - lastUpdate) / (1000 * 60 * 60)
            if (diffHours < 24) {
                const remaining = Math.ceil(24 - diffHours)
                return { success: false, error: `You can change your handle again in ${remaining} hours.` }
            }
        }

        // 2. Uniqueness Check
        const isAvailable = await checkHandleAvailability(username)
        if (!isAvailable) return { success: false, error: 'This handle is already taken.' }

        // 3. Update Sync
        const { error } = await supabase
            .from('profiles')
            .update({
                username: username,
                handle_updated_at: new Date().toISOString()
            })
            .eq('id', user.value.id)

        if (!error) {
            profile.value.username = username
            profile.value.handle_updated_at = new Date().toISOString()
            return { success: true }
        }
        return { success: false, error: error.message }
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

    async function uploadWidgetImage(file) {
        if (!user.value) return null

        // 2MB Limit matches Supabase policy
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('La imagen es demasiado grande (máximo 2MB)')
        }

        // Allowed Types
        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Formato no válido. Solo se permiten JPG y PNG.')
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${user.value.id}/widgets/${fileName}`

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('user-content')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            console.error('Widget image upload failed', uploadError)
            return null
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('user-content')
            .getPublicUrl(filePath)

        return publicUrl
    }

    async function uploadAvatar(file) {
        if (!user.value) return

        // 2MB Limit matches Supabase policy
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('La imagen es demasiado grande (máximo 2MB)')
        }

        // Allowed Types
        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Formato no válido. Solo se permiten JPG y PNG.')
        }

        const fileExt = file.name.split('.').pop()
        const filePath = `${user.value.id}/avatar/current.${fileExt}`

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('user-content')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            console.error('Avatar upload failed', uploadError)
            return
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('user-content')
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
        try {
            await supabase.auth.signOut()
        } catch (e) {
            console.error('Supabase signOut error', e)
        }

        // Manual cleanup to be 100% sure
        user.value = null
        profile.value = null
        widgets.value = []
        toggleEditMode.value = false

        // Clear Supabase local storage keys manually as a safety measure
        Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
                localStorage.removeItem(key)
            }
        })

        // Use hard reload to ensure all listeners and states are fully purged
        // Stay on the current page after logout
        window.location.reload()
    }

    async function fetchTotalVisits(profileId) {
        // 1. Get historical sum from daily_stats
        const { data: historical, error: hError } = await supabase
            .from('daily_stats')
            .select('visit_count')
            .eq('profile_id', profileId)

        const historicalCount = historical?.reduce((sum, row) => sum + (row.visit_count || 0), 0) || 0

        // 2. Get current raw logs from analytics (those not yet rolled up today)
        const { count: currentCount, error: cError } = await supabase
            .from('analytics')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profileId)
            .eq('event_type', 'visit')
            .gte('created_at', new Date().toISOString().split('T')[0]) // Only today's

        return historicalCount + (currentCount || 0)
    }

    async function fetchAnalyticsData(profileId) {
        const today = new Date().toISOString().split('T')[0]

        // 1. Get historical aggregated stats (all time up to yesterday)
        const { data: historicalData } = await supabase
            .from('daily_stats')
            .select('visit_count, click_count')
            .eq('profile_id', profileId)

        // 2. Get today's logs (real-time)
        const { data: todayLogs } = await supabase
            .from('analytics')
            .select('*')
            .eq('profile_id', profileId)
            .gte('created_at', today)

        // 3. Get recent logs (all time, latest 1000 for details)
        const { data: allLogs } = await supabase
            .from('analytics')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(1000)

        // Aggregate historical entries
        const historical = {
            visits: historicalData?.reduce((s, r) => s + (r.visit_count || 0), 0) || 0,
            clicks: historicalData?.reduce((s, r) => s + (r.click_count || 0), 0) || 0
        }

        // Aggregate today's entries from logs
        const todayStats = {
            visits: todayLogs?.filter(e => e.event_type === 'visit').length || 0,
            clicks: todayLogs?.filter(e => e.event_type === 'click').length || 0,
            unique: new Set(todayLogs?.filter(e => e.event_type === 'visit' && e.visitor_id).map(e => e.visitor_id)).size
        }

        // Prepare full stats object
        const stats = {
            totalVisits: historical.visits + todayStats.visits,
            totalClicks: historical.clicks + todayStats.clicks,
            uniqueVisitors: 0, // Will be set below
            today: todayStats,
            recent: allLogs?.slice(0, 15).map(e => {
                let activity = 'Visit';
                if (e.event_type === 'click') {
                    const widget = widgets.value.find(w => w.id === e.widget_id);
                    let widgetName = 'Unknown Link';
                    if (widget) {
                        widgetName = widget.title || (widget.content ? new URL(widget.content).hostname : 'Link');
                    } else if (e.widget_type === 'social' && e.target_url) {
                        try { widgetName = new URL(e.target_url).hostname; } catch (err) { widgetName = 'Link'; }
                    }
                    activity = `Clicked: ${widgetName}`;
                }
                return { ...e, activity };
            }) || [],
            browsers: {},
            os: {},
            referrers: {},
            countries: {},
            clicksByWidget: {}
        }

        const uniqueVids = new Set()

        allLogs?.forEach(e => {
            if (e.visitor_id) uniqueVids.add(e.visitor_id)

            const browserName = e.browser || 'Unknown'
            const osName = e.os || 'Unknown'
            const referrerName = e.referrer || 'Direct'
            const countryName = e.country || 'Unknown'

            stats.browsers[browserName] = (stats.browsers[browserName] || 0) + 1
            stats.os[osName] = (stats.os[osName] || 0) + 1
            stats.referrers[referrerName] = (stats.referrers[referrerName] || 0) + 1
            stats.countries[countryName] = (stats.countries[countryName] || 0) + 1

            if (e.event_type === 'click' && e.widget_id) {
                const widget = widgets.value.find(w => w.id === e.widget_id);
                let widgetName = 'Unknown Widget';
                if (widget) {
                    widgetName = widget.title || (widget.content ? new URL(widget.content).hostname : 'Link');
                } else if (e.widget_type === 'social' && e.target_url) {
                    try { widgetName = new URL(e.target_url).hostname; } catch (err) { widgetName = 'Link'; }
                }
                stats.clicksByWidget[widgetName] = (stats.clicksByWidget[widgetName] || 0) + 1
            }
        })

        stats.uniqueVisitors = uniqueVids.size

        return stats
    }

    function getWidgetIcon(w) {
        // 1. High Priority: Manual icon from database
        if (w.icon) return w.icon;

        // 2. Special Rule: Notion (google favicon service fails on notion.site)
        if (w.content && (w.content.includes('notion.site') || w.content.includes('notion.so'))) {
            return 'https://www.google.com/s2/favicons?domain=notion.com&sz=64';
        }

        if (w.type !== 'social' && w.type !== 'image') return null;

        // 3. Known Social Icons
        // Try title first
        if (socialIcons[w.title]) return socialIcons[w.title];

        // Try content (URL)
        const knownSocialKey = Object.keys(socialIcons).find(k => {
            const domain = k.toLowerCase().replace(' (x)', '');
            return w.content?.toLowerCase().includes(domain);
        });
        if (knownSocialKey) return socialIcons[knownSocialKey];

        // 4. Generic Favicon
        if (w.content && w.content.startsWith('http')) {
            try {
                const url = new URL(w.content);
                return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
            } catch (e) {
                return null;
            }
        }

        return null;
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
        uploadAvatar,
        uploadWidgetImage,
        fetchTotalVisits,
        fetchAnalyticsData
    }
})
