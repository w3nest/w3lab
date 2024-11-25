import { delay } from 'rxjs/operators'
import { AnyVirtualDOM } from 'rx-vdom'

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

/**
 * This datastructure should be moved somewhere else.
 */
export interface ApplicationInfo {
    cdnPackage: string
    displayName: string
    graphics?: {
        background?: AnyVirtualDOM
        fileIcon?: AnyVirtualDOM
        appIcon?: AnyVirtualDOM
    }
}
