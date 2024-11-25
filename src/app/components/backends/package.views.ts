import { parseMd, Router } from 'mkdocs-ts'
import { PackageView } from '../js-wasm/package.views'
import {
    AnyVirtualDOM,
    ChildrenLike,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    Observable,
    Subject,
    switchMap,
} from 'rxjs'
import { filter, map, shareReplay, take, tap } from 'rxjs/operators'
import { AppState } from '../../app-state'
import { styleShellStdOut } from '../../common'
import { ContextMessage, Local, onHTTPErrors,
    AssetsGateway } from '@w3nest/http-clients'

/**
 * @category View
 */
export class BackendView extends PackageView {
    constructor(params: {
        appState: AppState
        router: Router
        packageId: string
    }) {
        super({ ...params, appState: params.appState })
        this.children.push(
            parseMd({
                src: `
## Install Manifest

<installManifest></installManifest>      
                `,
                router: params.router,
                views: {
                    installManifest: () => {
                        return new InstallManifestView({
                            packageId: this.packageId,
                            appState: params.appState,
                            selectedVersion$: this.selectedVersion$,
                        })
                    },
                },
            }),
        )
    }
}

class InstallManifestView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void

    constructor({
        packageId,
        selectedVersion$,
        appState,
    }: {
        packageId: string
        appState: AppState
        selectedVersion$: Observable<string>
    }) {
        const name = window.atob(packageId)
        const savedManifest$ = new Subject<string | undefined>()
        const displayCurrentInstall$ = new BehaviorSubject(true)
        const getSavedManifest = () =>
            selectedVersion$
                .pipe(
                    switchMap((version) =>
                        new AssetsGateway.Client().webpm.getResource$({
                            libraryId: packageId,
                            version,
                            restOfPath: '/install.manifest.txt',
                        }),
                    ),
                    take(1),
                    onHTTPErrors(() => undefined),
                )
                .subscribe((manifest) => {
                    savedManifest$.next(manifest)
                })
        getSavedManifest()
        const startInstall$ = selectedVersion$.pipe(
            switchMap((version) =>
                appState.notificationsState.backendEvents.installing$.pipe(
                    map((backends) =>
                        backends.find(
                            (m) => m.name == name && m.version == version,
                        ),
                    ),
                    filter((backend) => backend !== undefined),
                    distinctUntilChanged(
                        (prev, curr) => prev.installId === curr.installId,
                    ),
                    tap(() => displayCurrentInstall$.next(true)),
                ),
            ),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        const endInstall$ = combineLatest([
            selectedVersion$,
            startInstall$,
        ]).pipe(
            switchMap(([version, { installId }]) =>
                appState.notificationsState.backendEvents.endInstall$.pipe(
                    filter(
                        (m) =>
                            m.name === name &&
                            m.version === version &&
                            m.installId === installId,
                    ),
                    //take(1),
                ),
            ),
            shareReplay({ bufferSize: 1, refCount: true }),
        )

        const stdOutput$ = combineLatest([
            selectedVersion$,
            startInstall$,
        ]).pipe(
            switchMap(([version, { installId }]) => {
                return appState.notificationsState.backendEvents.installStdOut$.pipe(
                    filter(
                        (m) =>
                            m.name === name &&
                            m.version === version &&
                            m.installId === installId,
                    ),
                    map((m) => [m]),
                )
            }),
        )
        this.connectedCallback = (elem: RxHTMLElement<'div'>) => {
            elem.ownSubscriptions(
                endInstall$.subscribe(() => {
                    getSavedManifest()
                }),
            )
        }
        const stdOutVDom: AnyVirtualDOM = {
            ...styleShellStdOut,
            children: {
                policy: 'append',
                source$: stdOutput$,
                vdomMap: (m: ContextMessage<unknown>) => ({
                    tag: 'span',
                    innerText: m.text,
                }),
            },
        }
        const manifestVDOM = (manifest: string): AnyVirtualDOM => ({
            tag: 'div',
            children: [
                new UninstallButton({
                    selectedVersion$,
                    backend: name,
                    savedManifest$,
                    displayCurrentInstall$,
                }),
                {
                    ...styleShellStdOut,
                    innerText: manifest,
                },
            ],
        })
        this.children = [
            {
                source$: savedManifest$,
                vdomMap: (manifest: string) => {
                    return manifest
                        ? manifestVDOM(manifest)
                        : {
                              tag: 'div',
                              class: {
                                  source$: displayCurrentInstall$,
                                  vdomMap: (d) => (d ? '' : 'd-none'),
                              },
                              children: [
                                  {
                                      source$: startInstall$,
                                      vdomMap: () => stdOutVDom,
                                  },
                              ],
                          }
                },
            },
        ]
    }
}

class UninstallButton implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'd-flex align-items-center justify-content-center border rounded p-1 fv-pointer my-1 text-danger'

    public readonly style = {
        width: 'fit-content',
        fontWeight: 'bolder' as const,
    }
    public readonly children: ChildrenLike
    constructor({
        selectedVersion$,
        backend,
        savedManifest$,
        displayCurrentInstall$,
    }: {
        selectedVersion$: Observable<string>
        backend: string
        savedManifest$: Subject<string | undefined>
        displayCurrentInstall$: Subject<boolean>
    }) {
        this.children = [
            {
                tag: 'i',
                class: 'fas fa-ban me-1',
            },
            {
                tag: 'div',
                innerText: 'Uninstall',
                onclick: () => {
                    selectedVersion$
                        .pipe(
                            take(1),
                            switchMap((version) =>
                                new Local.Client().api.system.uninstallBackend$(
                                    { name: backend, version },
                                ),
                            ),
                        )
                        .subscribe(() => {
                            savedManifest$.next(undefined)
                            displayCurrentInstall$.next(false)
                        })
                },
            },
        ]
    }
}
