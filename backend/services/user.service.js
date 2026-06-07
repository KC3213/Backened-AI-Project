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
