import { ReplaySubject } from 'rxjs'
import { Backend } from '../../environment/notifications'
import { Local } from '@w3nest/http-clients'

type BackendResponse = Local.System.BackendResponse
export class State {
    /**
     * All install events.
     */
    public readonly response$ = new ReplaySubject<BackendResponse>(100)

    /**
     * Start install events for all backends.
     */
    public readonly stdOut$ = new ReplaySubject<Backend & { text: string }>(
        1000,
    )

    constructor() {
        new Local.Client().api.system.webSocket
            .startBackendStdOut$()
            .subscribe((m) => {
                this.stdOut$.next({
                    name: m.attributes.name,
                    version: m.attributes.version,
                    text: m.text,
                })
            })
        new Local.Client().api.system.webSocket
            .backendResponse$()
            .subscribe((m) => {
                this.response$.next(m.data)
            })
    }
}
