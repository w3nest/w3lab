import { AppState } from '../app-state'
import { BehaviorSubject, Observable } from 'rxjs'

import { Local } from '@w3nest/http-clients'
import { map, shareReplay } from 'rxjs/operators'

type ComponentsRouter = Local.Components.ComponentsRouter

/**
 * @category Event
 */
export class PackageEvents {
    /**
     * @group Immutable Constants
     */
    public readonly client: ComponentsRouter

    /**
     * @group Immutable DOM Constants
     */
    public readonly packageId: string

    /**
     * @group Observables
     */
    public readonly info$: Observable<Local.Components.CdnPackage>

    constructor(params: { packageId: string; client: ComponentsRouter }) {
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
    public readonly cdnClient = new Local.Client().api.components

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
    public readonly status$: Observable<Local.Components.CdnStatusResponse>
    /**
     * @group Observables
     */
    public readonly rootPackages$: Observable<
        Local.Components.CdnPackageLight[]
    >

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
        this.rootPackages$ = this.status$.pipe(
            map(({ packages }) =>
                packages.filter((p) => p.versions.slice(-1)[0].parent === null),
            ),
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

    getNav(item: Local.Components.CdnPackageLight) {
        return `/webpm/${item.versions.slice(-1)[0].kind}/${window.btoa(item.name)}`
    }
}
