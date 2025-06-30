import {
    AnyVirtualDOM,
    append$,
    attr$,
    child$,
    ChildrenLike,
    EmptyDiv,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { State } from './state'
import { ContextMessage, Local, raiseHTTPErrors } from '@w3nest/http-clients'
import { filter, map, take } from 'rxjs/operators'
import { BehaviorSubject, from, mergeMap, Observable } from 'rxjs'
import { ExpandableGroupView } from '../common/expandable-group.view'
import * as webpmClient from '@w3nest/webpm-client'
import { ObjectJs } from '@w3nest/ui-tk/Trees'

type Mode = 'run' | 'config' | 'manifest'

export class StepView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        projectsState,
        project,
        step,
    }: {
        projectsState: State
        project: Local.Projects.Project
        step: Local.Projects.CIStep
    }) {
        const events = projectsState.projectEvents[project.id]
        const status$ = events.getStep$(step.id).status$
        const log$ = events.getStep$(step.id).log$
        const mode$ = new BehaviorSubject<Mode>('run')
        const configView = step.view
            ? new ExpandableGroupView({
                  expanded: false,
                  icon: 'fas fa-wrench',
                  title: 'Configuration',
                  content: () =>
                      new ConfigView({
                          project,
                          stepId: step.id,
                          onExecute: () => {
                              mode$.next('run')
                              projectsState.runStep(project.id, step.id)
                          },
                      }),
              })
            : undefined
        this.children = [
            {
                tag: 'h3',
                innerText: step.id,
            },
            configView,
            new RunStdOutView({
                status$,
                messages$: log$,
            }),
            new ExpandableGroupView({
                expanded: false,
                icon: 'fas fa-outdent',
                title: 'Manifest',
                content: () =>
                    new ManifestView({
                        status$,
                        project,
                    }),
            }),
        ]
    }
}

export class ConfigView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'overflow-auto'
    public readonly children: ChildrenLike

    constructor({
        project,
        stepId,
        onExecute,
    }: {
        project: Local.Projects.Project
        stepId: string
        onExecute: () => void
    }) {
        const projectsRouter = new Local.Client().api.projects
        const source$ = projectsRouter
            .getStepView$({
                projectId: project.id,
                stepId,
            })
            .pipe(
                raiseHTTPErrors(),
                mergeMap((js) =>
                    from(
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-implied-eval
                        new Function(js)()({
                            triggerRun: triggerRunHandler,
                            project,
                            stepId,
                            projectsRouter,
                            webpmClient,
                        }) as unknown as Observable<AnyVirtualDOM>,
                    ),
                ),
            )
        this.children = [
            child$({
                source$,
                vdomMap: (view) => {
                    return { tag: 'div', children: [view] }
                },
            }),
        ]
        const triggerRunHandler = ({
            configuration,
        }: {
            configuration: unknown
        }) => {
            projectsRouter
                .updateStepConfiguration$({
                    projectId: project.id,
                    stepId,
                    body: configuration,
                })
                .pipe(take(1))
                .subscribe(() => onExecute())
        }
    }
}
export class ManifestView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'overflow-auto'

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        project,
        status$,
    }: {
        project: Local.Projects.Project
        status$: Observable<
            Local.Projects.CIStepEventKind | Local.Projects.CIStepStatusResponse
        >
    }) {
        const fingerPrint = (
            manifest: Local.Projects.Manifest,
        ): AnyVirtualDOM => ({
            tag: 'div',
            class: 'my-3',
            children: [
                {
                    tag: 'div',
                    style: { width: 'fit-content' },
                    innerText: 'Fingerprint',
                    class: 'me-3 mb-2 border-bottom',
                },
                {
                    tag: 'div',
                    innerText: manifest.fingerprint,
                },
            ],
        })
        const stdOut = (manifest: Local.Projects.Manifest): AnyVirtualDOM => {
            if (manifest.stdOut.length == 0) {
                return undefined
            }
            return new ExpandableGroupView({
                title: 'Std Outputs',
                icon: 'fas fa-terminal',
                content: () => {
                    return {
                        tag: 'div',
                        class: 'p-1 bg-dark text-light overflow-auto',
                        style: {
                            maxHeight: '33vh',
                            fontSize: 'medium',
                            fontFamily: 'monospace',
                        },
                        children: manifest.stdOut.map((out) => {
                            return {
                                tag: 'div',
                                innerText: out,
                            }
                        }),
                    }
                },
            })
        }

        const sources = (manifest: Local.Projects.Manifest): AnyVirtualDOM => {
            if (manifest.files.length == 0) {
                return undefined
            }
            return new ExpandableGroupView({
                title: 'Source files',
                icon: 'fas fa-file',
                content: () => {
                    return {
                        tag: 'div',
                        class: 'p-1 bg-dark text-light overflow-auto',
                        style: {
                            maxHeight: '33vh',
                            fontSize: 'medium',
                            fontFamily: 'monospace',
                        },
                        children: manifest.files.map((file) => {
                            return {
                                tag: 'div',
                                innerText: file.replace(project.path, ''),
                            }
                        }),
                    }
                },
            })
        }
        const data = (manifest: Local.Projects.Manifest): AnyVirtualDOM => {
            if (Object.keys(manifest.data).length == 0) {
                return undefined
            }
            return new ExpandableGroupView({
                title: 'Data',
                icon: 'fas fa-cog',
                content: () => {
                    return new ObjectJs.View({
                        state: new ObjectJs.State({
                            title: 'Data',
                            data: manifest.data,
                            expandedNodes: ['Data_0'],
                        }),
                    })
                },
            })
        }

        type Event = Local.Projects.CIStepEventKind
        type Status = Local.Projects.CIStepStatusResponse
        function isStatusResponse(d: Event | Status): d is Status {
            return (d as Status).manifest !== undefined
        }
        const source$ = status$.pipe(filter(isStatusResponse))
        this.children = [
            child$({
                source$,
                vdomMap: ({ manifest }) => {
                    return {
                        tag: 'div',
                        class: 'w-100',
                        children: [
                            manifest && {
                                tag: 'div',
                                class: 'w-100',
                                children: [
                                    fingerPrint(manifest),
                                    stdOut(manifest),
                                    sources(manifest),
                                    data(manifest),
                                ],
                            },
                        ],
                    }
                },
            }),
        ]
    }
}

/**
 * @category View
 */
export class RunStdOutView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100 bg-dark text-light d-flex flex-column'
    public readonly style = {
        fontFamily: 'monospace' as const,
        fontSize: 'medium',
        whiteSpace: 'pre' as const,
        height: '25vh',
        maxHeight: '50vh',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        messages$,
        status$,
    }: {
        messages$: Observable<ContextMessage>
        status$: Observable<
            Local.Projects.CIStepEventKind | Local.Projects.CIStepStatusResponse
        >
    }) {
        const data$ = new BehaviorSubject<unknown>(undefined)

        const sdtOut$ = messages$.pipe(
            filter((m) => {
                return (
                    m.labels.includes('Label.STD_OUTPUT') &&
                    m.labels.includes('Label.CI_STEP_RUNNING')
                )
            }),
        )
        this.children = [
            {
                tag: 'div',
                class: 'w-100 d-flex align-items-center p-1 px-2 border-bottom',
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-terminal',
                    },
                    { tag: 'div', class: 'mx-2' },
                    {
                        tag: 'div',
                        innerText: 'Terminal',
                    },
                ],
            },
            {
                tag: 'div',
                class: 'w-100 flex-grow-1 overflow-auto  d-flex align-items-center',
                children: [
                    child$({
                        source$: status$.pipe(
                            filter((s) => s === 'runStarted'),
                        ),
                        vdomMap: () => {
                            return {
                                tag: 'div',
                                class: attr$({
                                    source$: data$,
                                    vdomMap: (d): string =>
                                        d === undefined ? 'w-100' : 'w-50',
                                    wrapper: (cls) =>
                                        `${cls} overflow-auto p-1 h-100`,
                                }),
                                onclick: () => data$.next(undefined),
                                connectedCallback: (
                                    elem: RxHTMLElement<'div'>,
                                ) => {
                                    elem.ownSubscriptions(
                                        sdtOut$.subscribe(() => {
                                            elem.scrollTop = elem.scrollHeight
                                        }),
                                    )
                                },
                                children: append$({
                                    policy: 'append',
                                    source$: sdtOut$.pipe(map((m) => [m])),
                                    vdomMap: (message) => {
                                        return {
                                            tag: 'div',
                                            class: 'd-flex align-items-center',
                                            children: [
                                                {
                                                    tag: 'div',
                                                    innerText: `${message.text}`,
                                                },
                                                message.data &&
                                                Object.keys(message.data)
                                                    .length > 0
                                                    ? {
                                                          tag: 'button',
                                                          class: 'btn btn-sm btn-primary fas fa-paperclip mx-2',
                                                          style: {
                                                              transform:
                                                                  'scale(0.7)',
                                                          },
                                                          onclick: (ev) => {
                                                              data$.next(
                                                                  message.data,
                                                              )
                                                              ev.stopPropagation()
                                                          },
                                                      }
                                                    : undefined,
                                            ],
                                        }
                                    },
                                }),
                            }
                        },
                    }),
                    child$({
                        source$: data$,
                        vdomMap: (data) => {
                            if (data === undefined) {
                                return EmptyDiv
                            }
                            return {
                                tag: 'div',
                                class: 'w-50 h-100 overflow-auto',
                                children: [
                                    new ObjectJs.View({
                                        state: new ObjectJs.State({
                                            title: 'Data',
                                            data,
                                            expandedNodes: ['Data_0'],
                                        }),
                                    }),
                                ],
                            }
                        },
                    }),
                ],
            },
        ]
    }
}
