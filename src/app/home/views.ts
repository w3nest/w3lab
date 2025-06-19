import { ChildrenLike, VirtualDOM, AnyVirtualDOM, child$, attr$ } from 'rx-vdom'
import { BehaviorSubject, combineLatest, debounceTime, from, of } from 'rxjs'
import { Content, Language, State } from './state'
import { switchMap } from 'rxjs/operators'
import { internalDocLink } from '../common/buttons'
import { CodeEditorView, CodeLanguage } from '../common/code-editor.view'

export const editHomeAction = (state: State): AnyVirtualDOM => {
    const icon = {
        tag: 'i' as const,
        class: {
            source$: state.mode$,
            vdomMap: (mode) => (mode === 'view' ? 'fas fa-pen' : 'fas fa-eye'),
        },
    }
    return {
        tag: 'button',
        class: 'btn btn-sm btn-light',
        children: [icon],
        onclick: () => {
            state.toggleMode()
            state.appState.router.fireNavigateTo({ path: '/' })
        },
    }
}

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
                return mode === 'view'
                    ? from(this.state.generateView(content))
                    : of(new EditorView({ state: this.state, content }))
            }),
        )
        this.children = [
            {
                tag: 'div',
                class: 'w-100 mkdocs-bg-5 rounded p-1 mb-1',
                children: [editHomeAction(this.state)],
            },
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
                    const languages: Record<Language, CodeLanguage> = {
                        md: 'markdown',
                        js: 'javascript',
                        css: 'css',
                    }
                    const editor = new CodeEditorView({
                        language: languages[mode],
                        content: content[mode],
                        //extraKeys: {
                        //    'Ctrl-Enter': () => state.toggleMode(),
                        //},
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
