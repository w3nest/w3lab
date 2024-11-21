import { AppState } from '../app-state'
import { combineLatest, Observable, timer } from 'rxjs'
import { filter, map, take, takeUntil } from 'rxjs/operators'

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
                return `/projects/${window.btoa(finder.fromPath)}/${project.id}`
            }
            return undefined
        }),
        filter((nav) => nav !== undefined),
        takeUntil(timer(timeout || 0, -1)),
        take(1),
    )
}
