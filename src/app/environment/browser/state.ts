import { AppState } from '../../app-state'
import { merge, Observable, Subject } from 'rxjs'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { mergeMap, shareReplay } from 'rxjs/operators'

export class State {
    public readonly status$: Observable<Local.Routers.Environment.BrowserCacheStatusResponse>
    private refresh$ = new Subject<unknown>()
    constructor({ appState }: { appState: AppState }) {
        this.status$ = merge(appState.environment$, this.refresh$).pipe(
            mergeMap(() => {
                return new Local.Client().api.environment.getBrowserCacheStatus$()
            }),
            raiseHTTPErrors(),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
    }

    sync() {
        this.refresh$.next(undefined)
    }
    clear() {
        new Local.Client().api.environment
            .clearBrowserCache({ body: { file: true, memory: true } })
            .subscribe(() => this.refresh$.next(undefined))
    }
}
