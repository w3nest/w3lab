import { attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { State as ProjectsState } from './state'
import { HTTPError, dispatchHTTPErrors, Local } from '@w3nest/http-clients'
import { BehaviorSubject, Subject } from 'rxjs'
import { tap } from 'rxjs/operators'
import { classesButton } from '../common'
import { CodeEditorView } from '../common/code-editor.view'

/**
 * @category View
 */
export class NewProjectFromTemplateView implements VirtualDOM<'div'> {
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
                    new ProjectTemplateEditor({
                        projectsState: this.projectsState,
                        projectTemplate: this.projectTemplate,
                        onError: () => {
                            /*viewState$.next('expanded')*/
                        },
                    }),
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

    constructor(params: {
        projectsState: ProjectsState
        projectTemplate: Local.Environment.ProjectTemplate
        onError: () => void
    }) {
        Object.assign(this, params)
        const content = JSON.stringify(this.projectTemplate.parameters, null, 4)

        const editor = new CodeEditorView({
            language: 'javascript',
            content,
        })

        const generateButton = new GenerateButton({
            projectsState: this.projectsState,
            projectTemplate: this.projectTemplate,
            file$: editor.content$,
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
        file$: BehaviorSubject<string>
    }) {
        const creating$ = new BehaviorSubject(false)
        this.children = [
            {
                tag: 'div',
                innerText: 'Generate',
            },
            {
                tag: 'div',
                class: attr$({
                    source$: creating$,
                    vdomMap: (creating) =>
                        creating ? 'fas fa-spinner fa-spin ms-1' : '',
                }),
            },
        ]
        this.onclick = () => {
            creating$.next(true)
            const parameters = JSON.parse(file$.value) as Record<string, string>
            projectsState
                .createProjectFromTemplate$({
                    type: projectTemplate.type,
                    parameters,
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
