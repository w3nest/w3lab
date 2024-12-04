import {
    BehaviorSubject,
    distinctUntilChanged,
    firstValueFrom,
    forkJoin,
    from,
    Observable,
} from 'rxjs'
import { install } from '@w3nest/webpm-client'
import { filter, map, mergeMap, shareReplay, take, tap } from 'rxjs/operators'
import * as Home from './home'
import * as Projects from './projects'
import * as Components from './components'
import * as Backends from './environment/backends'
import * as EsmServers from './environment/esm-servers'
import * as Environment from './environment'
import * as Notification from './environment/notifications'
import * as Explorer from './explorer'
import * as Doc from './doc'
import * as Plugins from './plugins'
import { Local, Accounts, raiseHTTPErrors } from '@w3nest/http-clients'
import { MdWidgets, Navigation, Router, Views } from 'mkdocs-ts'
import * as Mounted from './mounted'
import { setup } from '../auto-generated'
import { encodeHdPath } from './mounted'
import { Patches } from './common'
import { editHomeAction, HomeView } from './home/views'

Local.Client.ws = new Local.WsRouter({
    autoReconnect: true,
    autoReconnectDelay: 1000,
})

export type MountedPath = {
    path: string
    type: 'file' | 'folder'
}

/**
 * @category State
 */
export class AppState {
    /**
     * @group Immutable Constants
     */
    public readonly navigation: Navigation
    /**
     * @group Immutable Constants
     */
    public readonly router: Router

    public readonly bookmarks$: BehaviorSubject<string[]>
    /**
     * @group Observables
     */
    public readonly confChanged$: Observable<string>
    /**
     * @group Immutable Constants
     */
    public readonly environmentClient = new Local.Client().api.environment

    /**
     * @group Observables
     */
    public readonly environment$: Observable<Local.Environment.EnvironmentStatusResponse>

    /**
     * @group Observables
     */
    public readonly session$: Observable<Accounts.SessionDetails>

    /**
     * @group State
     */
    public readonly homeState: Home.State

    /**
     * @group State
     */
    public readonly projectsState: Projects.State

    /**
     * @group State
     */
    public readonly cdnState: Components.State

    /**
     * @group State
     */
    public readonly backendsState = new Backends.State()

    /**
     * @group State
     */
    public readonly esmServersState: EsmServers.State

    /**
     * @group State
     */
    public readonly environmentState: Environment.State

    /**
     * @group State
     */
    public readonly pluginsState = new Plugins.State()

    /**
     * @group State
     */
    public readonly notificationsState = new Notification.State()

    /**
     * @group Observables
     */
    public readonly connectedLocal$: Observable<boolean>

    public readonly mountedHdPaths$ = new BehaviorSubject<MountedPath[]>([])

    public readonly companionPage$ = new BehaviorSubject<string | undefined>(
        undefined,
    )

    install(id: 'd3') {
        if (this._installed[id]) {
            return this._installed[id]
        }
        this._installed[id] = from(install(this.dynamicInstallBodies[id])).pipe(
            shareReplay(1),
        )
        return this._installed[id]
    }
    private dynamicInstallBodies = {
        d3: {
            esm: [`d3#${setup.runTimeDependencies.externals.d3} as d3`],
        },
    }
    private _installed: { [k: string]: Observable<WindowOrWorkerGlobalScope> } =
        {}

    constructor() {
        Local.Client.startWs$()
            .pipe(take(1))
            .subscribe(() => {
                console.log('Web sockets connected')
            })
        this.environment$ = this.environmentClient.webSocket.status$().pipe(
            map(({ data }) => data),
            shareReplay(1),
        )
        this.connectedLocal$ = Local.Client.ws.connected$

        this.homeState = new Home.State({ appState: this })
        this.projectsState = new Projects.State({ appState: this })
        this.cdnState = new Components.State({ appState: this })
        this.esmServersState = new EsmServers.State({ appState: this })
        this.environmentState = new Environment.State({ appState: this })

        this.projectsState.projects$.subscribe(() => {})
        this.confChanged$ = this.environment$.pipe(
            map((env) => env.pathsBook.config),
            distinctUntilChanged(),
            tap((path) => console.log('Configuration changed', path)),
        )
        this.connectedLocal$.subscribe((connected) => {
            if (connected) {
                this.environmentClient.getStatus$().subscribe()
                this.cdnState.refreshPackages()
                this.projectsState.refreshProjects()
            }
        })

        this.session$ = this.environment$.pipe(
            map((env) => env.currentConnection),
            distinctUntilChanged(
                (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
            ),
            mergeMap(() => new Accounts.AccountsClient().getSessionDetails$()),
            raiseHTTPErrors(),
            shareReplay(1),
        )
        this.navigation = this.getNav()
        this.bookmarks$ = new BehaviorSubject([
            '/',
            '/environment',
            '/components',
            '/projects',
            '/explorer',
            '/mounted',
            '/plugins',
            '/doc',
        ])
        this.router = new Router({
            navigation: this.navigation,
            basePath: `/apps/${setup.name}/${setup.version}`,
            redirects: (target) => this.getRedirects(target),
        })
        // A workaround for now, it simplifies e.g. defining MD widgets where only the router is known
        this.router['appState'] = this
    }

    mountHdPath(path: string, type: 'file' | 'folder') {
        const values = this.mountedHdPaths$.value
        const redirectNav =
            type === 'folder'
                ? `/mounted/${encodeHdPath(path)}`
                : `/mounted/file_${encodeHdPath(path)}`
        if (!values.map((p) => p.path).includes(path)) {
            this.mountedHdPaths$.next([...values, { path, type }])
            this.router.explorerState.root$
                .pipe(
                    filter(
                        () =>
                            this.router.explorerState.getNode(redirectNav) !==
                            undefined,
                    ),
                    take(1),
                    Patches.patchRequestObjectAlreadyUsed(),
                )
                .subscribe(() => {
                    this.router.navigateTo({
                        path: redirectNav,
                    })
                })
            return
        }
        this.router.navigateTo({
            path: redirectNav,
        })
    }

    private getNav(): Navigation {
        return {
            name: 'W3Lab',
            decoration: {
                icon: {
                    tag: 'img',
                    src: '../assets/logo.svg',
                    style: {
                        height: '30px',
                    },
                },
                actions: [editHomeAction(this.homeState)],
            },
            tableOfContent: Views.tocView,
            html: () => new HomeView({ state: this.homeState }),
            '/environment': Environment.navigation(this),
            '/components': Components.navigation(this),
            '/projects': Projects.navigation(this),
            '/explorer': Explorer.navigation({
                session$: this.session$,
            }),
            '/mounted': Mounted.navigation(this),
            '/plugins': Plugins.navigation(this),
            '/doc': Doc.navigation(this),
        }
    }

    async getRedirects(target: string) {
        let to = target
        if (target.startsWith('/doc')) {
            // Documentation features examples using code snippets in python.
            // We await installing the dependencies such that the snippets are displayed right away,
            // and navigation to a given part of the page actually land at the right place.
            // If not done, the code snippet views update after the navigation is done, translating the location of the
            // elements and result in discrepancy with the expected location.
            await firstValueFrom(
                forkJoin(
                    ['python', 'html', 'javascript'].map(
                        (l: MdWidgets.CodeLanguage) =>
                            MdWidgets.CodeSnippetView.fetchCmDependencies$(l),
                    ),
                ),
            )
        }
        if (target.startsWith('/api/youwol')) {
            to = target.replace('/api/youwol', '/doc/api/youwol')
        }
        if (target.startsWith('/api/yw_utils')) {
            to = target.replace('/api/yw_utils', '/doc/api/yw_utils')
        }
        return to
    }
}
