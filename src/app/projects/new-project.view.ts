import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { State as ProjectsState } from './state'
import { HTTPError, dispatchHTTPErrors, Local } from '@w3nest/http-clients'
import { BehaviorSubject, from, Observable, Subject } from 'rxjs'
import { install } from '@w3nest/webpm-client'
import { delay, map, shareReplay, tap } from 'rxjs/operators'
import { classesButton } from '../common'
import { setup } from '../../auto-generated'

declare type CodeEditorModule = typeof import('@w3nest/rx-code-mirror-editors')

/**
 * Lazy loading of the module `@youwol/fv-code-mirror-editors`
 *
 * @category HTTP
 */
export const loadFvCodeEditorsModule$: () => Observable<CodeEditorModule> =
    () =>
        from(
            install({
                modules: [
                    `@w3nest/rx-code-mirror-editors#${setup.runTimeDependencies.externals['@w3nest/rx-code-mirror-editors']} as codeMirrorEditors`,
                ],
                scripts: ['codemirror#5.52.0~mode/javascript.min.js'],
                css: [
                    'codemirror#5.52.0~codemirror.min.css',
                    'codemirror#5.52.0~theme/blackboard.min.css',
                ],
            }),
        ).pipe(
            map((window) => window['codeMirrorEditors']),
            shareReplay({ bufferSize: 1, refCount: true }),
        )

/**
 * @category View
 */
export class NewProjectFromTemplateView implements VirtualDOM<'div'> {
    static loadFvCodeEditors$ = loadFvCodeEditorsModule$()

    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'd-flex flex-column w-100 h-100'

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        position: 'relative' as const,
    }

    /**
     * @group Immutable Constants
     */
    public readonly id: string

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group States
     */
    public readonly projectsState: ProjectsState

    /**
     * @group Immutable Constants
     */
    public readonly projectTemplate: Local.Environment.ProjectTemplate

    constructor(params: {
        projectsState: ProjectsState
        projectTemplate: Local.Environment.ProjectTemplate
    }) {
        Object.assign(this, params)

        this.children = [
            {
                tag: 'div',
                class: 'w-100 h-100 py-2 overflow-auto',
                style: { minHeight: '0px' },
                children: [
                    {
                        source$: NewProjectFromTemplateView.loadFvCodeEditors$,
                        vdomMap: (CodeEditorModule: CodeEditorModule) => {
                            return new ProjectTemplateEditor({
                                projectsState: this.projectsState,
                                CodeEditorModule: CodeEditorModule,
                                projectTemplate: this.projectTemplate,
                                onError: () => {
                                    /*viewState$.next('expanded')*/
                                },
                            })
                        },
                    },
                ],
            },
            //bottomNav,
        ]
    }
}

/**
 * @category View
 */
export class ProjectTemplateEditor implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100'

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable Constants
     */
    public readonly projectTemplate: Local.Environment.ProjectTemplate

    /**
     * @group State
     */
    public readonly projectsState: ProjectsState

    /**
     * @group Module
     */
    public readonly CodeEditorModule: CodeEditorModule

    constructor(params: {
        projectsState: ProjectsState
        CodeEditorModule: CodeEditorModule
        projectTemplate: Local.Environment.ProjectTemplate
        onError: () => void
    }) {
        Object.assign(this, params)
        const content = JSON.stringify(this.projectTemplate.parameters, null, 4)

        const ideState = new this.CodeEditorModule.Common.IdeState({
            files: [{ path: './index.js', content }],
            defaultFileSystem: Promise.resolve(new Map<string, string>()),
        })
        const editor = new this.CodeEditorModule.Common.CodeEditorView({
            ideState,
            path: './index.js',
            language: 'javascript',
        })
        editor.nativeEditor$.pipe(delay(100)).subscribe((nativeEdtr) => {
            nativeEdtr.refresh()
        })
        const generateButton = new GenerateButton({
            projectsState: this.projectsState,
            projectTemplate: this.projectTemplate,
            file$: ideState.updates$['./index.js'],
        })

        generateButton.error$.subscribe(() => {
            params.onError()
        })
        this.children = [
            { tag: 'div', class: 'py-2', children: [editor] },
            {
                tag: 'div',
                class: 'my-2',
            },
            generateButton,
        ]
    }
}

/**
 * @category View
 */
export class GenerateButton implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = `${classesButton} mx-auto px-4`

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        width: 'fit-content',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable DOM Constants
     */
    public readonly onclick: (ev: MouseEvent) => void

    /**
     * @group Observables
     */
    public readonly error$ = new Subject<HTTPError>()

    constructor({
        projectsState,
        projectTemplate,
        file$,
    }: {
        projectsState: ProjectsState
        projectTemplate: Local.Environment.ProjectTemplate
        file$: BehaviorSubject<{
            path: string
            content: string
        }>
    }) {
        const creating$ = new BehaviorSubject(false)
        this.children = [
            {
                tag: 'div',
                innerText: 'Generate',
            },
            {
                tag: 'div',
                class: {
                    source$: creating$,
                    vdomMap: (creating) =>
                        creating ? 'fas fa-spinner fa-spin ms-1' : '',
                },
            },
        ]
        this.onclick = () => {
            creating$.next(true)
            projectsState
                .createProjectFromTemplate$({
                    type: projectTemplate.type,
                    parameters: JSON.parse(file$.getValue().content),
                })
                .pipe(
                    tap(() => creating$.next(false)),
                    dispatchHTTPErrors(this.error$),
                )
                .subscribe((resp: Local.Projects.Project) => {
                    projectsState.openProject(resp)
                })
        }
    }
}
