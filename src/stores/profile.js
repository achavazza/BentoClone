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
            // Sanitized auto-handle: lowercase [a-z0-9_], min 3 / max 15 chars.
            const base = (authUser.email || 'user')
                .split('@')[0]
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '')
                .slice(0, 11)
            const root = base.length >= 3 ? base : 'user'

            // Retry on unique-handle collisions.
            for (let attempt = 0; attempt < 5; attempt++) {
                const suffix = Math.floor(1000 + Math.random() * 9000)
                const username = `${root}${suffix}`.slice(0, 15)
                const { error } = await supabase.from('profiles').insert({
                    id: authUser.id,
                    username: username,
                    full_name: (authUser.user_metadata.full_name || 'Creator').slice(0, 60),
                    avatar_url: googleAvatar,
                    bio: 'Welcome to my Bento!',
                    location: 'Earth'
                })
                if (!error) break
                if (!/duplicate|unique/i.test(error.message)) {
                    console.error('Profile creation failed', error)
                    break
                }
            }
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

            // 2. Get Widgets (with cached link previews when available).
            // box_previews may not exist yet on a fresh project, so fall
            // back to a plain select if the embed fails.
            let { data: widgetsData, error: widgetsError } = await supabase
                .from('widgets')
                .select('*, box_previews(*)')
                .eq('user_id', profileData.id)
                .order('position', { ascending: true })
                .limit(200)

            if (widgetsError) {
                const fallback = await supabase
                    .from('widgets')
                    .select('*')
                    .eq('user_id', profileData.id)
                    .order('position', { ascending: true })
                    .limit(200)
                widgetsData = fallback.data
            }

            if (widgetsData) {
                widgets.value = widgetsData.map(w => {
                    // box_previews is the joined PostgREST resource (array or
                    // object for our unique FK); never keep it on the widget.
                    const { box_previews, ...rest } = w
                    return {
                        ...rest,
                        preview: Array.isArray(box_previews) ? (box_previews[0] || null) : (box_previews || null),
                        icon: getWidgetIcon(rest)
                    }
                })
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

    const MAX_WIDGETS = 30

    // Remove a user-content storage file referenced by a widget (ignores
    // external URLs). Only the owner's own folder is ever touched.
    async function removeStorageFile(url) {
        if (!user.value || !url) return
        const m = url.match(/\/object\/(?:public|sign|authenticated)\/user-content\/(.+?)(?:\?|$)/)
        if (!m) return
        const path = decodeURIComponent(m[1])
        if (!path.startsWith(`${user.value.id}/`)) return
        await supabase.storage.from('user-content').remove([path])
    }

    function countWidgets() {
        return widgets.value.filter(w => w.type !== 'placeholder' && typeof w.id === 'number').length
    }

    async function addWidget(widget) {
        if (!isOwner.value) return

        // Friendly guard (the DB trigger is the real, unbypassable limit).
        if (countWidgets() >= MAX_WIDGETS) {
            console.warn(`Widget limit reached (max ${MAX_WIDGETS})`)
            return
        }

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
            const previous = widgets.value[index]
            const merged = { ...previous, ...updatedWidget };

            // Invalidate the cached preview when the link itself changed.
            if (merged.content && merged.content !== previous.content) {
                merged.preview = null
            }

            widgets.value[index] = { ...merged, icon: getWidgetIcon(merged) };

            // If the image changed, remove the old file to avoid orphans.
            if (updatedWidget.content && updatedWidget.content !== previous.content) {
                await removeStorageFile(previous.content)
            }

            if (typeof updatedWidget.id === 'number') {
                // State carries client-only helpers (preview/box_previews)
                // that are not real columns and would make the UPDATE fail.
                const payload = { ...widgets.value[index] }
                delete payload.preview
                delete payload.box_previews
                const { error } = await supabase.from('widgets').update(payload).eq('id', updatedWidget.id)
                if (error) console.error('Edit widget failed', error)
            }
        }
    }

    async function deleteWidget(id) {
        if (!isOwner.value) return
        const target = widgets.value.find(w => w.id === id)
        widgets.value = widgets.value.filter(w => w.id !== id)
        await supabase.from('widgets').delete().eq('id', id)
        if (target) await removeStorageFile(target.content)
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

        if (file.size > 2 * 1024 * 1024) {
            throw new Error('The image is larger than 2MB.')
        }

        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid format: only JPG or PNG.')
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
            throw new Error(uploadError.message || 'Could not upload the image.')
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('user-content')
            .getPublicUrl(filePath)

        return publicUrl
    }

    async function uploadAvatar(file) {
        if (!user.value) return

        if (file.size > 2 * 1024 * 1024) {
            throw new Error('The image is larger than 2MB.')
        }

        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid format: only JPG or PNG.')
        }

        const fileExt = file.name.split('.').pop()
        const filePath = `${user.value.id}/avatar/current.${fileExt}`

        // Remove previous avatar file(s) so changing extension (jpg->png)
        // doesn't leave orphans behind.
        const { data: existing } = await supabase.storage
            .from('user-content')
            .list(`${user.value.id}/avatar`)
        if (existing?.length) {
            await supabase.storage
                .from('user-content')
                .remove(existing.map(f => `${user.value.id}/avatar/${f.name}`))
        }

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('user-content')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            console.error('Avatar upload failed', uploadError)
            throw new Error(uploadError.message || 'No se pudo subir el avatar.')
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
            .limit(1000)

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
        // Fix: Hybrid approach for Local "Today" stats vs UTC "Total" stats
        const now = new Date();
        const localMidnight = new Date(now);
        localMidnight.setHours(0, 0, 0, 0);

        const utcNow = new Date();
        const utcMidnight = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));

        // Fetch overlap of data (whichever is earlier) to serve both needs
        const queryDate = localMidnight < utcMidnight ? localMidnight.toISOString() : utcMidnight.toISOString();

        // 1. Get historical aggregated stats (all time up to yesterday UTC)
        const { data: historicalData } = await supabase
            .from('daily_stats')
            .select('visit_count, click_count')
            .eq('profile_id', profileId)
            .limit(1000)

        // 2. Get recent raw logs
        const { data: recentLogs } = await supabase
            .from('analytics')
            .select('*')
            .eq('profile_id', profileId)
            .gte('created_at', queryDate)
            .order('created_at', { ascending: false })
            .limit(5000)

        // 3. Get latest 1000 for "Recent Activity" list
        const { data: allLogs } = await supabase
            .from('analytics')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(1000)

        // Aggregate historical entries (UTC)
        const historical = {
            visits: historicalData?.reduce((s, r) => s + (r.visit_count || 0), 0) || 0,
            clicks: historicalData?.reduce((s, r) => s + (r.click_count || 0), 0) || 0
        }

        // Separate Logs for Logic
        const utcLogs = recentLogs?.filter(l => new Date(l.created_at) >= utcMidnight) || [];
        const localLogs = recentLogs?.filter(l => new Date(l.created_at) >= localMidnight) || [];

        // Aggregate Today's entries (Using Local Time for UI)
        const todayStats = {
            visits: localLogs.filter(e => e.event_type === 'visit').length,
            clicks: localLogs.filter(e => e.event_type === 'click').length,
            unique: new Set(localLogs.filter(e => e.event_type === 'visit' && e.visitor_id).map(e => e.visitor_id)).size
        }

        // Aggregate Current UTC (for Totals)
        const currentUtcStats = {
            visits: utcLogs.filter(e => e.event_type === 'visit').length,
            clicks: utcLogs.filter(e => e.event_type === 'click').length,
        }

        // Prepare full stats object
        const stats = {
            totalVisits: historical.visits + currentUtcStats.visits,
            totalClicks: historical.clicks + currentUtcStats.clicks,
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
            return 'https://icons.duckduckgo.com/ip3/notion.com.ico';
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

        // 4. Favicon captured by the preview crawler (the site's own icon).
        if (w.preview?.favicon_url && /^https?:\/\//i.test(w.preview.favicon_url)) {
            return w.preview.favicon_url
        }

        // 5. Generic Favicon
        if (w.content && /^https?:\/\//i.test(w.content)) {
            try {
                const url = new URL(w.content);
                return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`;
            } catch (e) {
                return null;
            }
        }

        return null;
    }

    async function deleteAccount() {
        if (!user.value || !profile.value) return { success: false, error: 'Not logged in' }

        try {
            const userId = user.value.id

            // 1. Delete Storage Files (using a list and delete approach)
            // Note: We need to list all files in the user's directory first
            const { data: files } = await supabase.storage.from('user-content').list(userId, { recursive: true })
            if (files && files.length > 0) {
                const pathsToDelete = files.map(f => `${userId}/${f.name}`)
                // Also need to handle subdirectories if recursive list didn't flatten them (Supabase list isn't natively deep-recursive in all versions)
                // For this project, we know the structure: userId/avatar/ and userId/widgets/
                const { data: avatarFiles } = await supabase.storage.from('user-content').list(`${userId}/avatar`)
                const { data: widgetFiles } = await supabase.storage.from('user-content').list(`${userId}/widgets`)

                const allPaths = []
                avatarFiles?.forEach(f => allPaths.push(`${userId}/avatar/${f.name}`))
                widgetFiles?.forEach(f => allPaths.push(`${userId}/widgets/${f.name}`))

                if (allPaths.length > 0) {
                    await supabase.storage.from('user-content').remove(allPaths)
                }
            }

            // 2. Delete Database Records
            // Order matters if there are foreign keys, but usually Supabase uses CASCADE if set.
            // If not, we do it manually.
            await supabase.from('widgets').delete().eq('user_id', userId)
            await supabase.from('analytics').delete().eq('profile_id', userId)
            await supabase.from('daily_stats').delete().eq('profile_id', userId)

            // Finally delete the profile
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId)

            if (profileError) throw profileError

            // 3. Sign Out
            await signOut()

            return { success: true }
        } catch (error) {
            console.error('Error deleting account:', error)
            return { success: false, error: error.message }
        }
    }

    return {
        user,
        profile,
        widgets,
        isOwner,
        toggleEditMode,
        isLoading,
        MAX_WIDGETS,
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
        fetchAnalyticsData,
        deleteAccount
    }
})
