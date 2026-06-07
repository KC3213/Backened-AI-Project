import React, { useEffect, useRef, useState } from 'react'

const getSkyMode = () => {
    if (typeof window === 'undefined') {
        return 'day'
    }

    const queryMode = new URLSearchParams(window.location.search).get('sky')
    if (queryMode === 'day' || queryMode === 'night') {
        return queryMode
    }

    const savedMode = window.localStorage?.getItem('workspace-sky-mode')
    if (savedMode === 'day' || savedMode === 'night') {
        return savedMode
    }

    const hour = new Date().getHours()
    return hour >= 6 && hour < 18 ? 'day' : 'night'
}

const WorkspaceBackdrop = () => {
    const backdropRef = useRef(null)
    const [ skyMode, setSkyMode ] = useState(getSkyMode)

    useEffect(() => {
        const updateSkyMode = () => setSkyMode(getSkyMode())
        updateSkyMode()

        const timer = window.setInterval(updateSkyMode, 60000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        const backdrop = backdropRef.current
        if (!backdrop) {
            return undefined
        }

        let frameId = 0
        let pointerX = 0.5
        let pointerY = 0.5

        const renderPointerPosition = () => {
            frameId = 0
            const xShift = (pointerX - 0.5) * 34
            const yShift = (pointerY - 0.5) * 24

            backdrop.style.setProperty('--sky-x', `${xShift.toFixed(2)}px`)
            backdrop.style.setProperty('--sky-y', `${yShift.toFixed(2)}px`)
            backdrop.style.setProperty('--sky-soft-x', `${(xShift * -0.45).toFixed(2)}px`)
            backdrop.style.setProperty('--sky-soft-y', `${(yShift * -0.45).toFixed(2)}px`)
            backdrop.style.setProperty('--sky-sweep-x', `${(xShift * 0.25).toFixed(2)}px`)
            backdrop.style.setProperty('--sky-sweep-y', `${(yShift * 0.25).toFixed(2)}px`)
            backdrop.style.setProperty('--star-mid-x', `${(xShift * -0.72).toFixed(2)}px`)
            backdrop.style.setProperty('--star-mid-y', `${(yShift * -0.72).toFixed(2)}px`)
            backdrop.style.setProperty('--star-near-x', `${(xShift * 1.2).toFixed(2)}px`)
            backdrop.style.setProperty('--star-near-y', `${(yShift * 1.2).toFixed(2)}px`)
            backdrop.style.setProperty('--orbit-x', `${(xShift * 0.42).toFixed(2)}px`)
            backdrop.style.setProperty('--orbit-y', `${(yShift * 0.42).toFixed(2)}px`)
            backdrop.style.setProperty('--cursor-x', `${(pointerX * 100).toFixed(2)}%`)
            backdrop.style.setProperty('--cursor-y', `${(pointerY * 100).toFixed(2)}%`)
        }

        const handlePointerMove = (event) => {
            pointerX = Math.min(Math.max(event.clientX / window.innerWidth, 0), 1)
            pointerY = Math.min(Math.max(event.clientY / window.innerHeight, 0), 1)

            if (!frameId) {
                frameId = window.requestAnimationFrame(renderPointerPosition)
            }
        }

        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        window.addEventListener('mousemove', handlePointerMove, { passive: true })

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('mousemove', handlePointerMove)
            if (frameId) {
                window.cancelAnimationFrame(frameId)
            }
        }
    }, [])

    return (
        <div ref={backdropRef} className={`workspace-backdrop workspace-backdrop-${skyMode}`} aria-hidden='true'>
            <div className='workspace-star-field workspace-stars-far'></div>
            <div className='workspace-star-field workspace-stars-mid'></div>
            <div className='workspace-star-field workspace-stars-near'></div>

            <span className='workspace-comet workspace-comet-one'></span>
            <span className='workspace-comet workspace-comet-two'></span>
            <span className='workspace-comet workspace-comet-three'></span>

            <div className='workspace-celestial-layer'>
                <span className='workspace-sun'></span>
                <span className='workspace-moon'></span>
            </div>
        </div>
    )
}

export default WorkspaceBackdrop
