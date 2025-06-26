import { delay } from 'rxjs/operators'

/**
 * This patch is used when mounting a local HD folder (during the redirect to the mounted folder).
 * In some circumstances, this error is raised:
 * ```
 * TypeError: Failed to execute 'fetch' on 'Window': Cannot construct a Request with a Request object that has already
 * been used.
 * ```
 * Somehow related to the `getChildren`, probably triggering the same request twice.
 * Even when the error is thrown, the redirect is actually executed correctly.
 */
export function patchRequestObjectAlreadyUsed() {
    return delay(100)
}
