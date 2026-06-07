import userModel from '../models/user.model.js';

const avatarStyles = new Set([
    'adventurer',
    'avataaars',
    'bottts',
    'lorelei',
    'notionists',
    'pixel-art',
])

const fallbackAvatarStyle = 'adventurer'

const buildAvatarUrl = ({ style, seed }) => {
    const safeStyle = avatarStyles.has(style) ? style : fallbackAvatarStyle
    const safeSeed = encodeURIComponent(seed || 'User')

    return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${safeSeed}&radius=50&backgroundColor=f0efe9,eaf3de,faeeda,fcebeb`
}

export const createUser = async ({
    name, email, password, avatarStyle, avatarSeed
}) => {

    const trimmedName = name?.trim()

    if (!trimmedName || !email || !password) {
        throw new Error('Name, email and password are required');
    }

    const hashedPassword = await userModel.hashPassword(password);
    const avatar = {
        style: avatarStyles.has(avatarStyle) ? avatarStyle : fallbackAvatarStyle,
        seed: (avatarSeed || trimmedName || email).trim(),
    }

    avatar.url = buildAvatarUrl(avatar)

    const user = await userModel.create({
        name: trimmedName,
        email,
        password: hashedPassword,
        avatar,
    });

    return user;

}

export const getAllUsers = async ({ userId }) => {
    const users = await userModel.find({
        _id: { $ne: userId }
    });
    return users;
}
