import { defineStore } from 'pinia'
import { ref } from 'vue'

// Tiny global notification store: a single floating card that
// auto-dismisses. No dependencies.
export const useNotifyStore = defineStore('notify', () => {
    const current = ref(null) // { title, message, type }
    let timer = null

    function notify({ title = 'Aviso', message = '', type = 'error', timeout = 4500 } = {}) {
        current.value = { title, message, type }
        clearTimeout(timer)
        if (timeout) {
            timer = setTimeout(() => { current.value = null }, timeout)
        }
    }

    function error(title, message) {
        notify({ title, message, type: 'error' })
    }

    function success(title, message) {
        notify({ title, message, type: 'success', timeout: 3000 })
    }

    function dismiss() {
        clearTimeout(timer)
        current.value = null
    }

    return { current, notify, error, success, dismiss }
})
