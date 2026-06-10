export const avatarStyles = [
    { id: 'avatar-blue', label: 'Blue', path: '/avatars/avatar-blue.svg' },
    { id: 'avatar-green', label: 'Green', path: '/avatars/avatar-green.svg' },
    { id: 'avatar-gold', label: 'Gold', path: '/avatars/avatar-gold.svg' },
    { id: 'avatar-rose', label: 'Rose', path: '/avatars/avatar-rose.svg' },
    { id: 'avatar-indigo', label: 'Indigo', path: '/avatars/avatar-indigo.svg' },
    { id: 'avatar-slate', label: 'Slate', path: '/avatars/avatar-slate.svg' },
]

export const fallbackAvatarStyle = avatarStyles[ 0 ].id

const legacyAvatarMap = {
    adventurer: 'avatar-blue',
    avataaars: 'avatar-green',
    bottts: 'avatar-gold',
    lorelei: 'avatar-rose',
    notionists: 'avatar-indigo',
    'pixel-art': 'avatar-slate',
}

export const resolveAvatarStyle = (style) => {
    const localStyle = legacyAvatarMap[ style ] || style

    return avatarStyles.some(option => option.id === localStyle)
        ? localStyle
        : fallbackAvatarStyle
}

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

export const buildAvatarUrl = ({ style = fallbackAvatarStyle } = {}) => {
    const safeStyle = resolveAvatarStyle(style)

    return avatarStyles.find(option => option.id === safeStyle)?.path || avatarStyles[ 0 ].path
}

export const getAvatarStyle = (user = {}) => {
    if (user?.avatar?.style) {
        return resolveAvatarStyle(user.avatar.style)
    }

    const styleFromUrl = user?.avatar?.url?.match(/\/avatars\/([^/.]+)\.svg$/)?.[ 1 ]

    return resolveAvatarStyle(styleFromUrl)
}

export const getAvatarUrl = (user = {}) => {
    return buildAvatarUrl({
        style: getAvatarStyle(user),
    })
}
