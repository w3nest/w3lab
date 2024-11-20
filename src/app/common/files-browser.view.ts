import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { BehaviorSubject, Observable } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import { Local, raiseHTTPErrors } from '@w3nest/http-clients'
import { AttributeView } from './utils-view'

/**
 * @category View
 */
export class FilesBrowserView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100 overflow-auto'

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {}

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable Constants
     */
    public readonly startingFolder: string

    /**
     * @group Immutable Constants
     */
    public readonly originFolderIndex: number

    /**
     * @group Observables
     */
    public readonly folderSelected$: BehaviorSubject<string>

    /**
     * @group Observables
     */
    public readonly items$: Observable<Local.System.QueryFolderContentResponse>

    constructor(params: {
        startingFolder: string
        originFolderIndex: number
        style?
    }) {
        Object.assign(this, params)
        const client = new Local.Client().api.system
        this.folderSelected$ = new BehaviorSubject<string>(this.startingFolder)
        this.items$ = this.folderSelected$.pipe(
            mergeMap((path) => client.queryFolderContent$({ path })),
            raiseHTTPErrors(),
        )
        this.children = [
            originLocationView(this.startingFolder, this.originFolderIndex),
            folderNavigationView(this.folderSelected$, this.originFolderIndex),
            {
                tag: 'div',
                class: 'my-4',
                children: {
                    policy: 'replace',
                    source$: this.items$,
                    vdomMap: ({
                        files,
                        folders,
                    }: Local.System.QueryFolderContentResponse) => {
                        const filesVDom = files.map((name) => fileView(name))
                        const foldersVDom = folders.map((name) =>
                            folderView(this.folderSelected$, name),
                        )
                        return [...foldersVDom, ...filesVDom]
                    },
                },
            },
        ]
    }
}

function originLocationView(
    startingFolder: string,
    originFolderIndex: number,
): VirtualDOM<'div'> {
    if (originFolderIndex == 0) {
        return { tag: 'div' }
    }
    return {
        tag: 'div',
        class: 'my-2',
        children: [
            new AttributeView({
                text: 'origin:',
                value: startingFolder
                    .split('/')
                    .slice(1, originFolderIndex)
                    .reduce((acc, e) => `${acc}/${e}`),
            }),
        ],
    }
}

function folderNavigationView(
    folderSelected$: BehaviorSubject<string>,
    originFolderIndex: number,
): VirtualDOM<'div'> {
    return {
        tag: 'div',
        class: 'd-flex',
        children: {
            policy: 'replace',
            source$: folderSelected$,
            vdomMap: (paths: string) =>
                paths
                    .split('/')
                    .slice(originFolderIndex)
                    .map((element) =>
                        pathElementView(folderSelected$, element),
                    ),
        },
    }
}

function pathElementView(
    folderSelected$: BehaviorSubject<string>,
    element: string,
): VirtualDOM<'div'> {
    const index = folderSelected$.getValue().split('/').indexOf(element)

    return {
        tag: 'div',
        class: 'px-2 fv-pointer fv-hover-bg-background-alt border rounded',
        innerText: element,
        onclick: () =>
            folderSelected$.next(
                folderSelected$
                    .getValue()
                    .split('/')
                    .slice(0, index + 1)
                    .join('/'),
            ),
    }
}

function fileView(name: string): VirtualDOM<'div'> {
    return {
        tag: 'div',
        class: 'd-flex  align-items-center fv-text-disabled',
        style: { userSelect: 'none' },
        children: [
            { tag: 'div', class: 'fas fa-file px-2' },
            { tag: 'div', innerText: name },
        ],
    }
}

function folderView(
    folderSelected$: BehaviorSubject<string>,
    name: string,
): VirtualDOM<'div'> {
    return {
        tag: 'div',
        class: 'fv-pointer d-flex align-items-center fv-hover-bg-background-alt',
        style: {
            userSelect: 'none',
        },
        ondblclick: () =>
            folderSelected$.next(`${folderSelected$.getValue()}/${name}`),
        children: [
            {
                tag: 'div',
                class: 'fas fa-folder px-2',
            },
            {
                tag: 'div',
                innerText: name,
            },
        ],
    }
}
