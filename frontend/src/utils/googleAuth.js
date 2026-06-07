let googleScriptPromise

const loadGoogleScript = () => {
    if (window.google?.accounts?.id) {
        return Promise.resolve()
    }

    if (!googleScriptPromise) {
        googleScriptPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')

            if (existingScript) {
                existingScript.addEventListener('load', resolve, { once: true })
                existingScript.addEventListener('error', () => reject(new Error('Could not load Google sign-in')), { once: true })
                return
            }

            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.defer = true
            script.onload = resolve
            script.onerror = () => reject(new Error('Could not load Google sign-in'))
            document.head.appendChild(script)
        })
    }

    return googleScriptPromise
}

export const requestGoogleCredential = async (clientId) => {
    if (!clientId) {
        throw new Error('Google sign-in needs VITE_GOOGLE_CLIENT_ID')
    }

    await loadGoogleScript()

    return new Promise((resolve, reject) => {
        let resolved = false
        const timer = window.setTimeout(() => {
            if (!resolved) {
                reject(new Error('Google sign-in was not completed'))
            }
        }, 90000)

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
                resolved = true
                window.clearTimeout(timer)

                if (response?.credential) {
                    resolve(response.credential)
                    return
                }

                reject(new Error('Google did not return a credential'))
            },
        })

        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                resolved = true
                window.clearTimeout(timer)
                reject(new Error('Google sign-in prompt is unavailable'))
            }
        })
    })
}
