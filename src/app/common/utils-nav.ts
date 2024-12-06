import { AppState } from '../app-state'
import { combineLatest, Observable, timer } from 'rxjs'
import { filter, map, take, takeUntil } from 'rxjs/operators'
import { Views } from 'mkdocs-ts'
import { attr$ } from 'rx-vdom'

export function getProjectNav$({
    projectName,
    appState,
    timeout,
}: {
    projectName: string
    appState: AppState
    timeout?: number
}): Observable<string | undefined> {
    return combineLatest([
        appState.projectsState.projects$,
        appState.environment$,
    ]).pipe(
        map(([projects, env]) => {
            const project = projects.find(
                (p) => p.name.split('~')[0] === projectName,
            )
            if (project) {
                const finder = env.projects.finders.find((f) =>
                    project.path.startsWith(f.fromPath),
                )
                const maybeParent = projects.find(
                    (maybeParent) =>
                        project.path !== maybeParent.path &&
                        project.path.startsWith(maybeParent.path),
                )
                if (maybeParent) {
                    return `/projects/${window.btoa(finder.fromPath)}/${maybeParent.id}/${project.id}`
                }
                return `/projects/${window.btoa(finder.fromPath)}/${project.id}`
            }
            return undefined
        }),
        filter((nav) => nav !== undefined),
        takeUntil(timer(timeout || 0, -1)),
        take(1),
    )
}

export function splitCompanionAction(
    path: string,
    appState: AppState,
): Views.NavActionView {
    return new Views.NavActionView({
        content: {
            tag: 'i',
            class: attr$({
                source$: appState.companionPage$.pipe(
                    map((prefix) => path === prefix),
                ),
                vdomMap: (toggled) =>
                    toggled ? 'fas fa-times' : 'fas fa-columns',
            }),
        },
        action: () => {
            const selected = appState.companionPage$.value === path
            if (selected) {
                appState.companionPage$.next(undefined)
                return
            }
            appState.companionPage$.next(path)
        },
    })
}
