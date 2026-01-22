import { UAParser } from 'ua-parser-js';
import { supabase } from '../lib/supabase';

export const trackEvent = async ({ profile_id, event_type, widget_id = null, widget_type = null, target_url = null }) => {
    try {
        const parser = new UAParser();
        const result = parser.getResult();

        const eventData = {
            profile_id,
            event_type,
            widget_id,
            widget_type,
            target_url,
            browser: `${result.browser.name} ${result.browser.version}`,
            os: `${result.os.name} ${result.os.version}`,
            device: result.device.type || 'desktop',
            referrer: document.referrer || 'direct',
            page_path: window.location.pathname,
        };

        const { error } = await supabase.from('analytics').insert(eventData);

        if (error) {
            console.error('Error logging analytics:', error);
        }
    } catch (e) {
        console.error('Failed to log analytics:', e);
    }
};
