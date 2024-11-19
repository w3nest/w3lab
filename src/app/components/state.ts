import { AppState } from '../app-state'
import { BehaviorSubject, Observable } from 'rxjs'

import { Local } from '@w3nest/http-clients'
import { map, shareReplay } from 'rxjs/operators'

type LocalCdnRouter = Local.Routers.LocalCdn.LocalCdnRouter

/**
 * @category Event
 */
export class PackageEvents {
    /**
     * @group Immutable Constants
     */
    public readonly client: LocalCdnRouter

    /**
     * @group Immutable DOM Constants
     */
    public readonly packageId: string

    /**
     * @group Observables
     */
    public readonly info$: Observable<Local.Routers.LocalCdn.CdnPackage>

    constructor(params: { packageId: string; client: LocalCdnRouter }) {
        Object.assign(this, params)
        this.info$ = this.client.webSocket
            .package$({
                packageId: this.packageId,
            })
            .pipe(
                map((wsMessage) => wsMessage.data),
                shareReplay(1),
            )

        this.client.getPackage$({ packageId: this.packageId }).subscribe()
    }
}

/**
 * @category State
 */
export class State {
    /**
     * @group Immutable Constants
     */
    public readonly cdnClient = new Local.Client().admin.localCdn

    /**
     * @group States
     */
    public readonly appState: AppState

    /**
     * @group Events
     */
    public readonly packagesEvent: { [k: string]: PackageEvents } = {}

    /**
     * @group Observables
     */
    public readonly status$: Observable<Local.Routers.LocalCdn.CdnStatusResponse>

    /**
     * @group Observables
     */
    public readonly openPackages$ = new BehaviorSubject<string[]>([])

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)

        this.status$ = this.cdnClient.webSocket.status$().pipe(
            map((message) => message.data),
            shareReplay(1),
        )
    }

    openPackage(packageId: string) {
        if (!this.packagesEvent[packageId]) {
            this.packagesEvent[packageId] = new PackageEvents({
                packageId,
                client: this.cdnClient,
            })
        }

        const openPackages = this.openPackages$.getValue()

        if (!openPackages.includes(packageId)) {
            this.openPackages$.next([...openPackages, packageId])
        }
    }

    refreshPackages() {
        this.cdnClient.getStatus$().subscribe()
    }
}
