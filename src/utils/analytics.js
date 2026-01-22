import { UAParser } from 'ua-parser-js';
import { supabase } from '../lib/supabase';

export const trackEvent = async ({ profile_id, event_type, widget_id = null, widget_type = null, target_url = null }) => {
    if (!profile_id) return;

    try {
        // --- Optimización: Evitar duplicados (Debounce de 1 hora) ---
        const storageKey = `bento_track_${profile_id}_${event_type}_${widget_id || 'v'}`;
        const lastTracked = localStorage.getItem(storageKey);
        const now = Date.now();

        if (lastTracked && (now - parseInt(lastTracked)) < (60 * 60 * 1000)) {
            // Ya registrado en la última hora, ignoramos
            return;
        }

        const parser = new UAParser();
        const result = parser.getResult();

        // --- Detección de Parámetros de Origen (QR) ---
        const params = new URLSearchParams(window.location.search);
        const source = params.get('source') || params.get('utm_source');
        const referrerValue = source === 'qr' ? 'QR Scan' : (document.referrer || 'direct');

        const eventData = {
            profile_id,
            event_type,
            widget_id,
            widget_type,
            target_url,
            browser: result.browser.name || 'Unknown',
            os: result.os.name || 'Unknown',
            device: result.device.type || 'desktop',
            referrer: referrerValue,
            page_path: window.location.pathname,
        };

        const { error } = await supabase.from('analytics').insert(eventData);

        if (!error) {
            // Guardamos marca de tiempo local
            localStorage.setItem(storageKey, now.toString());
        } else {
            console.error('Error logging analytics:', error);
        }
    } catch (e) {
        console.error('Failed to log analytics:', e);
    }
};
