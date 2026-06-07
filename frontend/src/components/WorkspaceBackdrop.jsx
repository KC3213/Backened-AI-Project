import React from 'react'

const WorkspaceBackdrop = () => {
    return (
        <div className='workspace-backdrop' aria-hidden='true'>
            <div className='workspace-rail workspace-rail-one'></div>
            <div className='workspace-rail workspace-rail-two'></div>
            <div className='workspace-rail workspace-rail-three'></div>
            <div className='workspace-float-card workspace-float-card-one'>
                <span className='workspace-card-dot bg-[#eaf3de]'></span>
                <span className='workspace-card-line w-20'></span>
                <span className='workspace-card-line w-12'></span>
            </div>
            <div className='workspace-float-card workspace-float-card-two'>
                <span className='workspace-card-line w-16'></span>
                <span className='workspace-card-meter'>
                    <span></span>
                </span>
            </div>
            <div className='workspace-float-card workspace-float-card-three'>
                <span className='workspace-card-dot bg-[#faeeda]'></span>
                <span className='workspace-card-line w-24'></span>
            </div>
        </div>
    )
}

export default WorkspaceBackdrop
