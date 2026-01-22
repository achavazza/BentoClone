import { UAParser } from 'ua-parser-js';
import { supabase } from '../lib/supabase';

/**
 * Enhanced Analytics Provider
 * Captures unique visitors, country (via free API), and technical details.
 */
export const trackEvent = async ({ profile_id, event_type, widget_id = null, widget_type = null, target_url = null }) => {
    if (!profile_id) return;

    try {
        // 1. Manejo de ID de Visitante Único (LocalStorage)
        let visitor_id = localStorage.getItem('bento_visitor_id');
        if (!visitor_id) {
            visitor_id = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
            localStorage.setItem('bento_visitor_id', visitor_id);
        }

        // 2. Optimización: Debounce de 1 hora
        const storageKey = `bento_track_${profile_id}_${event_type}_${widget_id || 'v'}`;
        const lastTracked = localStorage.getItem(storageKey);
        const now = Date.now();

        if (lastTracked && (now - parseInt(lastTracked)) < (60 * 60 * 1000)) {
            return; // Ya registrado recientemente
        }

        // 3. Obtener Geolocalización (API Gratuita)
        let country = 'Unknown';
        try {
            const geoResponse = await fetch('https://ipapi.co/json/');
            if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                country = geoData.country_name || 'Unknown';
            }
        } catch (geoError) {
            // Falla de red o bloqueo de adblocker: manejado silenciosamente
        }

        // 4. Procesar UA y Referrer
        const parser = new UAParser();
        const result = parser.getResult();

        const params = new URLSearchParams(window.location.search);
        const source = params.get('source') || params.get('utm_source');
        const referrerValue = source === 'qr' ? 'QR Scan' : (document.referrer || 'direct');

        // 5. Preparar Datos
        const eventData = {
            profile_id,
            event_type,
            visitor_id,
            country,
            widget_id,
            widget_type,
            target_url,
            browser: result.browser.name || 'Unknown',
            os: result.os.name || 'Unknown',
            device: result.device.type || 'desktop',
            referrer: referrerValue,
            page_path: window.location.pathname
        };

        // 6. Insertar en Supabase
        const { error } = await supabase.from('analytics').insert(eventData);

        if (!error) {
            localStorage.setItem(storageKey, now.toString());
        }
    } catch (e) {
        console.error('Analytics tracking failed:', e);
    }
};
