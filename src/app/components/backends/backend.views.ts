import {
    AnyVirtualDOM,
    append$,
    attr$,
    child$,
    ChildrenLike,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { BehaviorSubject, distinctUntilChanged, Subject, switchMap } from 'rxjs'
import { filter, map, shareReplay, take, tap } from 'rxjs/operators'
import { AppState } from '../../app-state'
import { styleShellStdOut } from '../../common'
import { Local, onHTTPErrors, AssetsGateway } from '@w3nest/http-clients'

export class InstallManifestView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void

    constructor({
        packageId,
        version,
        appState,
    }: {
        packageId: string
        appState: AppState
        version: string
    }) {
        const name = window.atob(packageId)
        const savedManifest$ = new Subject<string | undefined>()
        const displayCurrentInstall$ = new BehaviorSubject(true)
        const getSavedManifest = () =>
            new AssetsGateway.Client().webpm
                .getResource$({
                    libraryId: packageId,
                    version,
                    restOfPath: '/install.manifest.txt',
                })
                .pipe(
                    take(1),
                    onHTTPErrors(() => undefined),
                )
                .subscribe((manifest: string) => {
                    savedManifest$.next(manifest)
                })
        getSavedManifest()
        const startInstall$ =
            appState.notificationsState.backendEvents.installing$.pipe(
                map((backends) =>
                    backends.find(
                        (m) => m.name === name && m.version === version,
                    ),
                ),
                filter((backend) => backend !== undefined),
                distinctUntilChanged(
                    (prev, curr) => prev.installId === curr.installId,
                ),
                tap(() => displayCurrentInstall$.next(true)),
                shareReplay({ bufferSize: 1, refCount: true }),
            )
        const endInstall$ = startInstall$.pipe(
            switchMap(({ installId }) =>
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

        const stdOutput$ = startInstall$.pipe(
            switchMap(({ installId }) => {
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
            children: append$({
                policy: 'append',
                source$: stdOutput$,
                vdomMap: (m) => ({
                    tag: 'span',
                    innerText: m.text,
                }),
            }),
        }
        const manifestVDOM = (manifest: string): AnyVirtualDOM => ({
            tag: 'div',
            children: [
                new UninstallButton({
                    version,
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
            child$({
                source$: savedManifest$,
                vdomMap: (manifest) => {
                    return manifest
                        ? manifestVDOM(manifest)
                        : {
                              tag: 'div',
                              class: attr$({
                                  source$: displayCurrentInstall$,
                                  vdomMap: (d) => {
                                      if (d) {
                                          return ''
                                      }
                                      return 'd-none'
                                  },
                              }),
                              children: [
                                  child$({
                                      source$: startInstall$,
                                      vdomMap: () => stdOutVDom,
                                  }),
                              ],
                          }
                },
            }),
        ]
    }
}

class UninstallButton implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'd-flex align-items-center justify-content-center border rounded p-1 w3lab-pointer my-1 text-danger'

    public readonly style = {
        width: 'fit-content',
        fontWeight: 'bolder' as const,
    }
    public readonly children: ChildrenLike
    constructor({
        version,
        backend,
        savedManifest$,
        displayCurrentInstall$,
    }: {
        version: string
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
                    new Local.Client().api.system
                        .uninstallBackend$({ name: backend, version })
                        .subscribe(() => {
                            savedManifest$.next(undefined)
                            displayCurrentInstall$.next(false)
                        })
                },
            },
        ]
    }
}
