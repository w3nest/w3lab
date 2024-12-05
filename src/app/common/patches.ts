import { delay } from 'rxjs/operators'
import { AnyVirtualDOM } from 'rx-vdom'
import { AppState } from '../app-state'
import { Router } from 'mkdocs-ts'

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

interface CodeMirrorChange {
    origin: string
}
export interface CodeMirrorEditor {
    getValue: () => string
    on: (
        event: string,
        cb: (
            args: { getValue: () => string },
            changes: CodeMirrorChange[],
        ) => void,
    ) => void
    refresh: () => void
    addLineClass: (line: number, kind: string, classes: string) => void
}

export type CodeMirror = (
    element: HTMLElement,
    config: Record<string, unknown>,
) => CodeMirrorEditor

export function getAppState(router: Router): AppState {
    return router['appState'] as unknown as AppState
}
