export const getErrorMessage = (error, fallback) => {
    const payload = error.response?.data

    if (typeof payload === 'string') {
        return payload
    }

    if (Array.isArray(payload?.errors)) {
        return payload.errors[ 0 ]?.msg || fallback
    }

    return payload?.errors || payload?.error || fallback
}
