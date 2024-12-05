import { ReplaySubject } from 'rxjs'
import { AppState } from '../../app-state'
import { filter, mergeMap, tap } from 'rxjs/operators'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'

export class State {
    public readonly stdOuts$: { [k: string]: ReplaySubject<{ text: string }> } =
        {}

    public readonly dispatchLogs$: {
        [k: string]: ReplaySubject<Local.System.LogResponse>
    } = {}

    public readonly appState: AppState
    public readonly maxStdOutCount = 500
    public readonly maxLogCount = 100

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)
        const ws = new Local.Client().api.environment.webSocket
        ws.esmServerStdOut$().subscribe((message) => {
            const uid = message.attributes.proxyUid
            if (uid) {
                this.getStdOut$(uid).next(message)
            }
        })
        const traceIds = new Set<string>()
        ws.esmServerDispatchLog$()
            .pipe(
                filter((d) => {
                    return !traceIds.has(d.attributes.traceId)
                }),
                tap((d) => {
                    traceIds.add(d.attributes.traceId)
                }),
                mergeMap((d) => {
                    return new Local.Client().api.system.queryLogs$({
                        parentId: d.parentContextId,
                    })
                }),
                raiseHTTPErrors(),
            )
            .subscribe((d) => {
                const started = d.logs.find((l) =>
                    l.labels.includes('Label.STARTED'),
                )
                const uid = started.attributes.proxyUid
                if (uid) {
                    this.getDispatchLogs$(uid).next(started)
                }
            })

        this.appState.environment$.subscribe((env) => {
            Object.keys(this.stdOuts$).forEach((uid) => {
                if (!env.proxiedEsmServers[uid]) {
                    this.stdOuts$[uid].complete()
                    delete this.stdOuts$[uid]
                }
            })
        })
    }

    getStdOut$(uid: string) {
        if (!this.stdOuts$[uid]) {
            this.stdOuts$[uid] = new ReplaySubject(this.maxStdOutCount)
        }
        return this.stdOuts$[uid]
    }
    getDispatchLogs$(uid: string) {
        if (!this.dispatchLogs$[uid]) {
            this.dispatchLogs$[uid] = new ReplaySubject(this.maxLogCount)
        }
        return this.dispatchLogs$[uid]
    }
}
