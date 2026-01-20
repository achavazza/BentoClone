export const socialIcons = {
    'Instagram': 'ci ci-instagram ci-2x',
    'GitHub': 'ci ci-github ci-2x',
    'LinkedIn': 'ci ci-linkedin ci-2x',
    'YouTube': 'ci ci-youtube ci-2x',
    'Twitter (X)': 'ci ci-twitter ci-2x',
    'TikTok': 'ci ci-tiktok ci-2x', // Fallback, might check if exists
    'Vimeo': 'ci ci-vimeo ci-2x',
    'Spotify': 'ci ci-spotify ci-2x',
    'Apple Music': 'ci ci-apple-music ci-2x',
    'Pinterest': 'ci ci-pinterest ci-2x',
    'Facebook': 'ci ci-facebook ci-2x',
    'Discord': 'ci ci-discord ci-2x',
    'Reddit': 'ci ci-reddit ci-2x',
    'Threads': 'ci ci-threads ci-2x', // Might not exist in this library version
    'Twitch': 'ci ci-twitch ci-2x',
    'Behance': 'ci ci-behance ci-2x'
}

export function getSocialIconClass(name) {
    return socialIcons[name] || null
}
