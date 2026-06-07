import React, { useEffect, useState } from 'react'
import { getAvatarUrl, getInitials } from '../utils/avatar'

const sizeClasses = {
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
    xl: 'h-14 w-14 text-base',
}

const UserAvatar = ({ user, size = 'md', className = '' }) => {
    const [ hasImageError, setHasImageError ] = useState(false)
    const avatarUrl = getAvatarUrl(user)
    const sizeClass = sizeClasses[ size ] || sizeClasses.md

    useEffect(() => {
        setHasImageError(false)
    }, [ avatarUrl ])

    if (!avatarUrl || hasImageError) {
        return (
            <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[#2c2c2a] font-semibold text-[#f0efe9] ${className}`}>
                {getInitials(user)}
            </div>
        )
    }

    return (
        <img
            src={avatarUrl}
            alt=''
            className={`${sizeClass} shrink-0 rounded-full border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] object-cover ${className}`}
            onError={() => setHasImageError(true)}
            referrerPolicy='no-referrer'
        />
    )
}

export default UserAvatar
