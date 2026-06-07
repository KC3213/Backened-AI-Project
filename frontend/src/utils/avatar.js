export const avatarStyles = [
    { id: 'adventurer', label: 'Adventurer' },
    { id: 'avataaars', label: 'Classic' },
    { id: 'bottts', label: 'Bot' },
    { id: 'lorelei', label: 'Soft' },
    { id: 'notionists', label: 'Notion' },
    { id: 'pixel-art', label: 'Pixel' },
]

export const fallbackAvatarStyle = avatarStyles[ 0 ].id

export const getDisplayName = (user = {}) => {
    if (user?.name?.trim()) {
        return user.name.trim()
    }

    const email = user?.email || ''
    return email.split('@')[ 0 ] || 'User'
}

export const getInitials = (user = {}) => {
    const displayName = getDisplayName(user)
    const parts = displayName.split(/\s+/).filter(Boolean)

    if (parts.length > 1) {
        return `${parts[ 0 ][ 0 ]}${parts[ 1 ][ 0 ]}`.toUpperCase()
    }

    return displayName.slice(0, 2).toUpperCase() || 'U'
}

export const buildAvatarUrl = ({ style = fallbackAvatarStyle, seed = 'User' } = {}) => {
    const safeStyle = avatarStyles.some(option => option.id === style) ? style : fallbackAvatarStyle
    const safeSeed = encodeURIComponent(seed || 'User')

    return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${safeSeed}&radius=50&backgroundColor=f0efe9,eaf3de,faeeda,fcebeb`
}

export const getAvatarUrl = (user = {}) => {
    if (user?.avatar?.url) {
        return user.avatar.url
    }

    return buildAvatarUrl({
        style: user?.avatar?.style,
        seed: user?.avatar?.seed || getDisplayName(user) || user?.email,
    })
}
