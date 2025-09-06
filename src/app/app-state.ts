import { BehaviorSubject, distinctUntilChanged, from, Observable } from 'rxjs'
import { install } from '@w3nest/webpm-client'
import { filter, map, mergeMap, shareReplay, take, tap } from 'rxjs/operators'
import * as Home from './home'
import * as Projects from './projects'
import * as WebPM from './components'
import * as Backends from './environment/backends'
import * as EsmServers from './environment/esm-servers'
import * as Environment from './environment'
import * as Notification from './environment/notifications'
import * as Explorer from './explorer'
import * as Plugins from './plugins'
import * as Doc from './doc'
import { Local, Accounts, raiseHTTPErrors } from '@w3nest/http-clients'
import {
    Navigation,
    DefaultLayout,
    segment,
    UrlTarget,
    Router,
} from 'mkdocs-ts'
import * as Mounted from './mounted'
import pkgJson from '../../package.json'
import { encodeHdPath } from './mounted'
import { Patches } from './common'
import { editHomeAction, HomeView } from './home/views'
import { createRootContext } from './config.context'
import { AliasKeys as W3NestDocAliases } from '@w3nest/doc/how-to'

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
    public readonly navigation: Navigation<
        DefaultLayout.NavLayout,
        DefaultLayout.NavHeader
    >
    /**
     * @group Immutable Constants
     */
    public readonly router: Router<
        DefaultLayout.NavLayout,
        DefaultLayout.NavHeader,
        W3NestDocAliases
    >

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
    public readonly cdnState: WebPM.State

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

    public readonly companionPage$ = new BehaviorSubject<string[]>([])

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
            esm: [`d3#${pkgJson.webpm.dependencies.d3} as d3`],
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
        this.environment$
            .pipe(
                map(({ pathsBook }) => pathsBook),
                distinctUntilChanged(
                    (a, b) => JSON.stringify(a) === JSON.stringify(b),
                ),
            )
            .subscribe((paths) => {
                this.mountedHdPaths$.next([
                    { path: paths.config, type: 'file' },
                    { path: paths.databases, type: 'folder' },
                    { path: paths.system, type: 'folder' },
                ])
            })
        this.connectedLocal$ = Local.Client.ws.connected$

        this.homeState = new Home.State({ appState: this })
        this.projectsState = new Projects.State({ appState: this })
        this.cdnState = new WebPM.State({ appState: this })
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
            '/environment',
            '/webpm',
            '/projects',
            '/explorer',
            '/mounted',
            '/plugins',
            '/doc',
        ])
        const ctx = createRootContext({
            threadName: 'App',
            labels: [],
        })

        this.router = new Router(
            {
                navigation: this.navigation,
                pathAliases: {
                    'w3nest-api': '@nav/doc/server-api/w3nest',
                    'w3nest-client-api': '@nav/doc/server-api/w3nest-client',
                    'w3nest-install': '@nav/doc/how-to/install',
                    'w3nest-start': '@nav/doc/how-to/start',
                    'w3nest-publish': '@nav/doc/how-to/publish',
                    'w3nest-ci': '@nav/doc/how-to/ci',
                },
                redirects: [(target) => this.getRedirects(target)],
                userStore: this,
            },
            ctx,
        )
    }

    mountHdPath(path: string, type: 'file' | 'folder') {
        const values = this.mountedHdPaths$.value
        const redirectNav =
            type === 'folder'
                ? `/mounted/${encodeHdPath(path)}`
                : `/mounted/file_${encodeHdPath(path)}`
        if (!values.map((p) => p.path).includes(path)) {
            this.mountedHdPaths$.next([...values, { path, type }])
            const nodeMounted = this.router.explorerState.getNode('/mounted')
            this.router.explorerState.selectNodeAndExpand(nodeMounted)
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
                    this.router.fireNavigateTo({
                        path: redirectNav,
                    })
                })
            return
        }
        this.router.fireNavigateTo({
            path: redirectNav,
        })
    }

    unmountHdPath(path: string) {
        const paths = this.mountedHdPaths$.value.filter((d) => d.path !== path)
        this.mountedHdPaths$.next(paths)
    }

    private getNav(): Navigation<
        DefaultLayout.NavLayout,
        DefaultLayout.NavHeader
    > {
        return {
            name: 'w3Lab',
            header: {
                wrapperClass: `${DefaultLayout.NavHeaderView.DefaultWrapperClass} border-bottom p-1`,
                icon: {
                    tag: 'img',
                    src: '../assets/favicon.svg',
                    style: {
                        height: '30px',
                    },
                },
                actions: [editHomeAction(this.homeState)],
            },
            layout: {
                content: () => new HomeView({ state: this.homeState }),
            },
            routes: {
                [segment('/environment')]: Environment.navigation(this),
                [segment('/webpm')]: WebPM.navigation(this),
                [segment('/projects')]: Projects.navigation(this),
                [segment('/explorer')]: Explorer.navigation({
                    session$: this.session$,
                }),
                [segment('/mounted')]: Mounted.navigation(this),
                [segment('/plugins')]: Plugins.navigation(this),
                [segment('/doc')]: Doc.navigation(this),
            },
        }
    }

    getRedirects(target: UrlTarget) {
        let to = target.path
        if (target.path.startsWith('/api/youwol')) {
            to = target.path.replace('/api/youwol', '/doc/api/youwol')
        }
        if (target.path.startsWith('/api/yw_utils')) {
            to = target.path.replace('/api/yw_utils', '/doc/api/yw_utils')
        }
        return Promise.resolve({ ...target, path: to })
    }
}
