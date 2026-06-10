export const avatarStyles = [
    { id: 'chameleon_1838761', label: 'Chameleon', path: '/avatars/chameleon_1838761.svg' },
    { id: 'ecosystem_6968177', label: 'Ecosystem', path: '/avatars/ecosystem_6968177.svg' },
    { id: 'elephant_713996', label: 'Elephant', path: '/avatars/elephant_713996.svg' },
    { id: 'europasaurus_8352478', label: 'Dino', path: '/avatars/europasaurus_8352478.svg' },
    { id: 'giraffe_713999', label: 'Giraffe', path: '/avatars/giraffe_713999.svg' },
    { id: 'hamster_5389252', label: 'Hamster', path: '/avatars/hamster_5389252.svg' },
    { id: 'owl_5414952', label: 'Owl', path: '/avatars/owl_5414952.svg' },
    { id: 'penguin_1892824', label: 'Penguin', path: '/avatars/penguin_1892824.svg' },
    { id: 'seal_456030', label: 'Seal', path: '/avatars/seal_456030.svg' },
    { id: 'whale_1864513', label: 'Whale', path: '/avatars/whale_1864513.svg' },
]

export const fallbackAvatarStyle = avatarStyles[ 0 ].id

const legacyAvatarMap = {
    adventurer: 'chameleon_1838761',
    avataaars: 'giraffe_713999',
    bottts: 'elephant_713996',
    lorelei: 'penguin_1892824',
    notionists: 'owl_5414952',
    'pixel-art': 'hamster_5389252',
    'avatar-blue': 'chameleon_1838761',
    'avatar-green': 'ecosystem_6968177',
    'avatar-gold': 'elephant_713996',
    'avatar-rose': 'penguin_1892824',
    'avatar-indigo': 'owl_5414952',
    'avatar-slate': 'whale_1864513',
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
