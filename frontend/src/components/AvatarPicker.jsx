import React from 'react'
import { avatarStyles, buildAvatarUrl } from '../utils/avatar'

const AvatarPicker = ({ selectedStyle, onSelect }) => {
    return (
        <div>
            <div className='mb-2 flex items-center justify-between gap-3'>
                <label className='block text-[12px] font-medium uppercase tracking-[0.04em] text-[#5f5e5a]'>Avatar</label>
                <span className='text-[11px] font-medium text-[#888780]'>Local avatars</span>
            </div>
            <div className='grid grid-cols-3 gap-2'>
                {avatarStyles.map(option => {
                    const isSelected = selectedStyle === option.id

                    return (
                        <button
                            type='button'
                            key={option.id}
                            onClick={() => onSelect(option.id)}
                            className={`rounded-[12px] border-[0.5px] p-2 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm ${isSelected ? 'border-[#2c2c2a] bg-white shadow-sm' : 'border-[#e8e7e0] bg-[#f8f8f5]'}`}
                        >
                            <img
                                src={buildAvatarUrl({ style: option.id })}
                                alt=''
                                className='mx-auto h-10 w-10 rounded-full border-[0.5px] border-[#d3d1c7] bg-white'
                            />
                            <span className='mt-1 block truncate text-[10px] font-semibold text-[#5f5e5a]'>{option.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default AvatarPicker
