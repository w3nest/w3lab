import { AppState } from '../app-state'
import { combineLatest, Observable, timer } from 'rxjs'
import { filter, map, take, takeUntil } from 'rxjs/operators'
import { Router, DefaultLayout } from 'mkdocs-ts'
import { AnyVirtualDOM, attr$ } from 'rx-vdom'

export function getProjectNav$({
    projectName,
    version,
    appState,
    timeout,
}: {
    projectName: string
    version?: string
    appState: AppState
    timeout?: number
}): Observable<string | undefined> {
    return combineLatest([
        appState.projectsState.projects$,
        appState.environment$,
    ]).pipe(
        map(([projects]) => {
            const versions = projects
                .filter((p) => p.name === projectName)
                .sort((p0, p1) => p0.version.localeCompare(p1.version))
            let project = versions[0]
            if (version) {
                project = versions.find((p) => p.version === version)
            }
            if (project) {
                return appState.projectsState.getNav(project.id)
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
): DefaultLayout.NavActionView {
    return new DefaultLayout.NavActionView({
        content: {
            tag: 'i',
            class: attr$({
                source$: appState.companionPage$.pipe(
                    map((paths) => paths.includes(path)),
                ),
                vdomMap: (toggled) =>
                    toggled ? 'fas fa-times' : 'fas fa-columns',
            }),
        },
        action: () => {
            const selected = appState.companionPage$.value.includes(path)
            if (selected) {
                appState.companionPage$.next([])
                return
            }
            appState.companionPage$.next([path])
        },
    })
}

export function defaultLayout(
    content: ({
        router,
    }: {
        router: Router
    }) => AnyVirtualDOM | Promise<AnyVirtualDOM>,
) {
    return {
        content,
    }
}
