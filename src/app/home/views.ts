import { ChildrenLike, VirtualDOM, AnyVirtualDOM, child$, attr$ } from 'rx-vdom'

import { MdWidgets } from 'mkdocs-ts'
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    from,
    Observable,
    of,
} from 'rxjs'
import { Content, Language, State } from './state'
import { switchMap } from 'rxjs/operators'
import { buttonsFactory, internalDocLink } from '../common/buttons'

type HomePageMode = 'view' | 'edit'

export const editHomeAction = (state: State): VirtualDOM<'i'> => ({
    tag: 'i' as const,
    class: 'flex-grow-1',
    style: {
        padding: '0px',
    },
    children: [
        child$({
            source$: state.mode$,
            vdomMap: (mode) =>
                mode === 'view'
                    ? {
                          ...buttonsFactory.HomeEdit,
                          onclick: () => state.toggleMode(),
                      }
                    : {
                          ...buttonsFactory.HomeView,
                          onclick: () => state.toggleMode(),
                      },
        }),
    ],
})

export class HomeView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    private readonly state: State

    constructor(params: { state: State }) {
        Object.assign(this, params)

        const source$ = combineLatest([
            this.state.content$,
            this.state.mode$,
        ]).pipe(
            debounceTime(100),
            switchMap(([content, mode]) => {
                return mode == 'view'
                    ? from(this.state.generateView(content))
                    : of(new EditorView({ state: this.state, content }))
            }),
        )
        this.children = [
            child$({
                source$,
                vdomMap: (vdom) => vdom,
            }),
        ]
    }
}

class EditorView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly selectedMode$ = new BehaviorSubject<Language>('md')

    constructor({ state, content }: { state: State; content: Content }) {
        const sepV: AnyVirtualDOM = {
            tag: 'div',
            class: 'my-2 border w-100',
        }
        const sepH: AnyVirtualDOM = {
            tag: 'i',
            class: 'mx-2',
        }
        this.children = [
            this.banner(),
            sepH,
            internalDocLink({
                nav: '/doc/how-to/custom-home',
                router: state.appState.router,
            }),
            sepV,
            child$({
                source$: this.selectedMode$,
                vdomMap: (mode) => {
                    const languages: Record<Language, MdWidgets.CodeLanguage> =
                        {
                            md: 'markdown',
                            js: 'javascript',
                            css: 'css',
                        }
                    const editor = new MdWidgets.CodeSnippetView({
                        language: languages[mode],
                        content: content[mode],
                        cmConfig: {
                            readOnly: false,
                            extraKeys: {
                                'Ctrl-Enter': () => state.toggleMode(),
                            },
                        },
                    })
                    return {
                        tag: 'div',
                        children: [editor],
                        connectedCallback: (elem) => {
                            const updateSub = editor.content$.subscribe((c) => {
                                state.updateContent(mode, c)
                            })
                            elem.ownSubscriptions(updateSub)
                        },
                    }
                },
            }),
        ]
    }

    private banner(): AnyVirtualDOM {
        return {
            tag: 'div',
            class: 'btn-group btn-group-toggle',
            customAttributes: {
                dataToggle: 'buttons',
            },
            children: [
                this.toggleButton('md'),
                this.toggleButton('js'),
                this.toggleButton('css'),
            ],
        }
    }

    private toggleButton(target: Language): AnyVirtualDOM {
        const urls: Record<Language, string> = {
            md: '../assets/icon-md.svg',
            js: '../assets/icon-js.svg',
            css: '../assets/icon-css.svg',
        }
        return {
            tag: 'label',
            class: attr$({
                source$: this.selectedMode$,
                vdomMap: (selected): string =>
                    selected === target ? 'active' : '',
                wrapper: (d) => `${d} btn btn-light p-1`,
            }),
            children: [
                { tag: 'img', style: { width: '25px' }, src: urls[target] },
            ],
            onclick: () => this.selectedMode$.next(target),
        }
    }
}
