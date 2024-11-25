import {
    autoUpdate,
    computePosition,
    flip,
    ReferenceElement,
} from '@floating-ui/dom'
import { ChildrenLike, render, RxHTMLElement, VirtualDOM } from 'rx-vdom'
import { ExplorerNode } from './nodes'
import { Action, getActions$ } from './actions.factory'
import { ExplorerState } from './explorer.state'

export class ContextMenuHandler implements VirtualDOM<'i'> {
    public readonly tag = 'i'
    public readonly class =
        'mx-2 fas fa-ellipsis-h fv-hover-text-focus fv-pointer ctx-menu-handler'
    public readonly onclick: (ev: MouseEvent) => void

    constructor({
        node,
        explorerState,
        withClass,
    }: {
        node: ExplorerNode
        explorerState: ExplorerState
        withClass?: string
    }) {
        this.class += ` ${withClass}`
        this.onclick = (ev: MouseEvent) => {
            const contextMenu = new ContextMenuView({
                node,
                explorerState,
                fromElement: ev.target as ReferenceElement,
            })
            const ctxMenuDiv: HTMLDivElement = render(contextMenu)
            ev.preventDefault()
            ev.stopPropagation()
            document.querySelectorAll('.ctx-menu').forEach((c) => c.remove())
            document.body.appendChild(ctxMenuDiv)
        }
    }
}

export class ContextMenuView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'ctx-menu'
    public readonly style = {
        position: 'absolute' as const,
        top: 0 as const,
        left: 0 as const,
        width: '100vw',
        height: '100vh',
    }
    public readonly children: ChildrenLike

    connectedCallback: (element: RxHTMLElement<'div'>) => void
    constructor({
        node,
        explorerState,
        fromElement,
    }: {
        node: ExplorerNode
        explorerState: ExplorerState
        fromElement: ReferenceElement
    }) {
        this.connectedCallback = (element) => {
            const refElement = fromElement

            const cleanup = autoUpdate(refElement, element, () => {
                element.onclick = () => {
                    element.remove()
                    cleanup()
                }

                const elem: HTMLElement =
                    element.firstChild as unknown as HTMLElement
                // we should use event 'focusout'
                // https://stackoverflow.com/questions/152975/how-do-i-detect-a-click-outside-an-element/3028037#3028037
                // https://web.dev/learn/html/focus#:~:text=Interactive%20elements%2C%20including%20form%20controls,meaning%20they%20are%20not%20interactive.
                computePosition(refElement, elem, {
                    placement: 'bottom',
                    middleware: [flip()],
                }).then(({ x, y }) => {
                    Object.assign(elem.style, {
                        left: `${x}px`,
                        top: `${y}px`,
                    })
                })
            })
        }
        this.children = [
            {
                tag: 'div',
                class: 'bg-dark',
                style: {
                    width: 'max-content',
                    position: 'absolute' as const,
                    top: 0 as const,
                    left: 0 as const,
                    padding: '5px',
                    borderRadius: '4px',
                    fontSize: ' 90%',
                    zIndex: 10,
                },
                children: {
                    policy: 'replace',
                    source$: getActions$(explorerState, node),
                    vdomMap: (actions: Action[]) => {
                        return actions.map(
                            (action: Action) =>
                                new ContexMenuItemView({ action }),
                        )
                    },
                    untilFirst: [
                        {
                            tag: 'div',
                            class: 'fas fa-spinner fa-spin text-light',
                        },
                    ],
                },
            },
        ]
    }
}

export class ContexMenuItemView implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class =
        'd-flex align-items-center w-100 mkdocs-text-5 mkdocs-bg-5 mkdocs-hover-text-0 mkdocs-hover-bg-0'
    public readonly children: ChildrenLike
    public readonly style = {
        fontSize: '0.8rem',
    }
    public readonly onclick: (ev: MouseEvent) => void
    constructor({ action }: { action: Action }) {
        this.children = [
            {
                tag: 'div',
                style: { width: '30px' },
                children: [action.icon],
            },
            {
                tag: 'i',
                class: 'mx-2',
            },
            {
                tag: 'div',
                innerText: action.name,
            },
        ]
        this.onclick = () => action.exe()
    }
}
