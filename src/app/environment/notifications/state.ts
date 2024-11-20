import { BehaviorSubject, merge, ReplaySubject } from 'rxjs'
import { Local } from '@w3nest/http-clients'
import { filter } from 'rxjs/operators'

export type BackendInstallEvent = Local.System.InstallBackendEvent

export type Error = {
    kind: 'BackendInstall' | 'AssetDownload'
    message: string
}

export type Backend = {
    name: string
    version: string
}

export type BackendInstallFlow = Backend & { installId: string }

export class BackendEvents {
    /**
     * All install events.
     */
    public readonly install$ = new ReplaySubject<BackendInstallEvent>(100)

    /**
     * Start install events for all backends.
     */
    public readonly startInstall$ = this.install$.pipe(
        filter(({ event }) => event === 'started'),
    )
    /**
     * End install events for all backends.
     */
    public readonly endInstall$ = this.install$.pipe(
        filter(({ event }) => event !== 'started'),
    )

    /**
     * Std outputs of backend's `install.sh` script for all backends.
     */
    public readonly installStdOut$ = new ReplaySubject<
        BackendInstallFlow & { text: string }
    >(1000)

    /**
     * The backends under installation at a particular point in time.
     */
    public readonly installing$ = new BehaviorSubject<BackendInstallFlow[]>([])

    /**
     * Emit each time a backend failed to install.
     */
    public readonly failedInstall$ = new ReplaySubject<BackendInstallFlow>()

    constructor() {
        new Local.Client().api.system.webSocket
            .installBackendEvent$()
            .subscribe((m) => {
                this.install$.next(m.data)
            })

        new Local.Client().api.system.webSocket
            .installBackendStdOut$()
            .subscribe((m) => {
                this.installStdOut$.next({
                    installId: m.attributes.installId,
                    name: m.attributes.name,
                    version: m.attributes.version,
                    text: m.text,
                })
            })

        merge(this.startInstall$, this.endInstall$).subscribe(
            ({ installId, name, version, event }) => {
                const currentInstalls = this.installing$.value
                if (
                    event === 'started' &&
                    this.installing$.value.find(
                        (d) =>
                            d.name == name &&
                            d.version == version &&
                            d.installId == installId,
                    ) == undefined
                ) {
                    this.installing$.next([
                        ...currentInstalls,
                        { name, version, installId },
                    ])
                    return
                }
                const remaining = currentInstalls.filter(
                    (d) => d.name !== name && d.version !== version,
                )
                if (remaining.length !== this.installing$.value.length) {
                    this.installing$.next(remaining)
                }
            },
        )
        this.endInstall$
            .pipe(filter(({ event }) => event === 'failed'))
            .subscribe((failed) => this.failedInstall$.next(failed))
    }
}

export type AssetDownloadEvent = Local.System.DownloadEvent & {
    contextId: string
}

export class AssetEvents {
    /**
     * All download events.
     */
    public readonly download$ = new ReplaySubject<AssetDownloadEvent>(100)

    /**
     * Start download events for all assets.
     */
    public readonly enqueuedDownload$ = this.download$.pipe(
        filter(({ type }) => type === 'enqueued'),
    )
    /**
     * End download events for all assets.
     */
    public readonly endDownload$ = this.download$.pipe(
        filter(({ type }) => type === 'succeeded' || type === 'failed'),
    )

    /**
     * The assets currently downloading (started but not yet done).
     */
    public readonly downloading$ = new BehaviorSubject<
        Local.System.DownloadEvent[]
    >([])

    /**
     * Emit each time an asset failed to download.
     */
    public readonly failedDownload$ =
        new ReplaySubject<Local.System.DownloadEvent>()

    private enqueuedRawIds: string[] = []

    constructor() {
        new Local.Client().api.system.webSocket
            .downloadEvent$()
            .subscribe(({ data, contextId }) => {
                if (
                    data.type === 'enqueued' &&
                    this.enqueuedRawIds.includes(data.rawId)
                ) {
                    return
                }
                if (data.type === 'enqueued') {
                    this.enqueuedRawIds.push(data.rawId)
                }
                this.download$.next({ ...data, contextId: contextId })
            })

        this.download$.subscribe(({ type, rawId, kind }) => {
            const currents = this.downloading$.value
            if (
                type === 'started' &&
                this.downloading$.value.find((d) => d.rawId == rawId) ==
                    undefined
            ) {
                this.downloading$.next([...currents, { rawId, type, kind }])
                return
            }
            if (type === 'succeeded' || type === 'failed') {
                const remaining = currents.filter((d) => d.rawId !== rawId)
                if (remaining.length !== this.downloading$.value.length) {
                    this.downloading$.next(remaining)
                }
            }
        })
        this.endDownload$
            .pipe(filter(({ type }) => type === 'failed'))
            .subscribe((failed) => this.failedDownload$.next(failed))
    }
}

export class State {
    public readonly assetEvents = new AssetEvents()
    public readonly backendEvents = new BackendEvents()

    public readonly errors = new BehaviorSubject<Error[]>([])
    constructor() {
        this.backendEvents.failedInstall$.subscribe(({ name, version }) => {
            const newError = {
                kind: 'BackendInstall' as const,
                message: `${name}#${version} failed to install.`,
            }
            this.errors.next([...this.errors.value, newError])
        })
        this.assetEvents.failedDownload$.subscribe(({ rawId, kind }) => {
            const newError = {
                kind: 'AssetDownload' as const,
                message: `${kind}#${rawId} failed to install.`,
            }
            this.errors.next([...this.errors.value, newError])
        })
    }
}
