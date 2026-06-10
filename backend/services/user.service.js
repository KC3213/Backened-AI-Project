import userModel from '../models/user.model.js';

const avatarStyles = new Set([
    'avatar-blue',
    'avatar-green',
    'avatar-gold',
    'avatar-rose',
    'avatar-indigo',
    'avatar-slate',
])

const avatarStyleList = Array.from(avatarStyles)
const fallbackAvatarStyle = 'avatar-blue'

const legacyAvatarMap = {
    adventurer: 'avatar-blue',
    avataaars: 'avatar-green',
    bottts: 'avatar-gold',
    lorelei: 'avatar-rose',
    notionists: 'avatar-indigo',
    'pixel-art': 'avatar-slate',
}

const resolveAvatarStyle = (style) => {
    const localStyle = legacyAvatarMap[ style ] || style

    return avatarStyles.has(localStyle) ? localStyle : fallbackAvatarStyle
}

const pickAvatarStyle = (seed = '') => {
    const total = seed.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0)

    return avatarStyleList[ total % avatarStyleList.length ] || fallbackAvatarStyle
}

const buildAvatarUrl = ({ style }) => {
    const safeStyle = resolveAvatarStyle(style)

    return `/avatars/${safeStyle}.svg`
}

const buildAvatar = ({ style, seed }) => {
    const safeStyle = resolveAvatarStyle(style || pickAvatarStyle(seed))

    return {
        style: safeStyle,
        seed: seed || '',
        url: buildAvatarUrl({ style: safeStyle }),
    }
}

export const ensureLocalAvatar = async (user) => {
    if (!user) {
        return user
    }

    const avatar = buildAvatar({
        style: user.avatar?.style,
        seed: user.avatar?.seed || user.name || user.email,
    })

    if (
        user.avatar?.style !== avatar.style ||
        user.avatar?.seed !== avatar.seed ||
        user.avatar?.url !== avatar.url
    ) {
        user.avatar = avatar
        await user.save()
    }

    return user
}

export const createUser = async ({
    name, email, password, avatarStyle, avatarSeed
}) => {

    const trimmedName = name?.trim()

    if (!trimmedName || !email || !password) {
        throw new Error('Name, email and password are required');
    }

    const hashedPassword = await userModel.hashPassword(password);
    const avatar = buildAvatar({
        style: avatarStyle,
        seed: (avatarSeed || trimmedName || email).trim(),
    })

    const user = await userModel.create({
        name: trimmedName,
        email,
        password: hashedPassword,
        avatar,
        authProvider: 'local',
    });

    return user;

}

export const updateUserProfile = async ({
    userId, email, name, avatarStyle, avatarSeed
}) => {
    const query = userId ? { _id: userId } : { email }
    const user = await userModel.findOne(query)

    if (!user) {
        throw new Error('User not found')
    }

    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (trimmedName && (trimmedName.length < 2 || trimmedName.length > 50)) {
        throw new Error('Name must be 2 to 50 characters long')
    }

    if (trimmedName) {
        user.name = trimmedName
    }

    if (typeof avatarStyle === 'string' && avatarStyle.trim()) {
        user.avatar = buildAvatar({
            style: avatarStyle.trim(),
            seed: (avatarSeed || trimmedName || user.name || user.email).trim(),
        })
    } else {
        user.avatar = buildAvatar({
            style: user.avatar?.style,
            seed: user.avatar?.seed || trimmedName || user.name || user.email,
        })
    }

    await user.save()
    return user
}

export const findOrCreateGoogleUser = async ({ email, name, googleId }) => {
    if (!email) {
        throw new Error('Google account email is required')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const displayName = name?.trim() || normalizedEmail.split('@')[ 0 ]
    let user = await userModel.findOne({ email: normalizedEmail })

    if (user) {
        let shouldSave = false

        if (!user.name) {
            user.name = displayName
            shouldSave = true
        }

        if (!user.googleId && googleId) {
            user.googleId = googleId
            shouldSave = true
        }

        if (!user.avatar?.url?.startsWith('/avatars/')) {
            user.avatar = buildAvatar({
                style: user.avatar?.style,
                seed: displayName || normalizedEmail,
            })
            shouldSave = true
        }

        if (shouldSave) {
            await user.save()
        }

        return user
    }

    user = await userModel.create({
        name: displayName,
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatar: buildAvatar({
            seed: displayName || normalizedEmail,
        }),
    })

    return user
}

export const getAllUsers = async ({ userId }) => {
    const users = await userModel.find({
        _id: { $ne: userId }
    });
    return users;
}
