import {
    AnyVirtualDOM,
    ChildrenLike,
    RxHTMLElement,
    VirtualDOM,
} from '@youwol/rx-vdom'
import { State } from '../state'
import {
    ContextMessage,
    Local,
    raiseHTTPErrors,
    onHTTPErrors,
} from '@w3nest/http-clients'
import { filter, map, take } from 'rxjs/operators'
import {
    BehaviorSubject,
    combineLatest,
    from,
    mergeMap,
    Observable,
    Subject,
} from 'rxjs'
import { ExpandableGroupView } from '../../common/expandable-group.view'
import * as webpmClient from '@youwol/webpm-client'
import { DataView } from '../../common'

type Mode = 'run' | 'config' | 'manifest'

export class SelectedStepView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        flowId,
        projectsState,
        project,
    }: {
        flowId: string
        projectsState: State
        project: Local.Routers.Projects.Project
    }) {
        const events = projectsState.projectEvents[project.id]
        const selected$ = events.selectedStep$.pipe(
            filter(({ step }) => step !== undefined),
        )
        const status$ = selected$.pipe(
            mergeMap(({ step }) => events.getStep$(flowId, step.id).status$),
        )
        const log$ = selected$.pipe(
            mergeMap(({ step }) => events.getStep$(flowId, step.id).log$),
        )
        const mode$ = new BehaviorSubject<Mode>('run')

        const factory: Record<
            Mode,
            (step: Local.Routers.Projects.PipelineStep) => AnyVirtualDOM
        > = {
            run: () =>
                new RunOutputsView({
                    status$,
                    messages$: log$,
                }),
            manifest: () =>
                new ManifestView({
                    status$,
                    project,
                }),
            config: (step) =>
                new ConfigView({
                    project,
                    stepId: step.id,
                    flowId,
                    onExecute: () => {
                        mode$.next('run')
                        projectsState.runStep(project.id, flowId, step.id)
                    },
                }),
        }
        this.children = [
            {
                source$: selected$,
                vdomMap: ({
                    step,
                }: {
                    step: Local.Routers.Projects.PipelineStep
                }) => {
                    return new ExpandableGroupView({
                        expanded: true,
                        icon: '',
                        title: new HeaderMenuView({
                            mode$,
                            project,
                            projectsState,
                            stepId: step.id,
                            flowId,
                            status$,
                        }),
                        content: () => ({
                            tag: 'div',
                            children: [
                                {
                                    source$: mode$,
                                    vdomMap: (mode: Mode) =>
                                        factory[mode](step),
                                },
                            ],
                        }),
                    })
                },
            },
        ]
    }
}

export class HeaderMenuView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center'
    public readonly children: ChildrenLike

    constructor({
        mode$,
        stepId,
        flowId,
        project,
        projectsState,
        status$,
    }: {
        project: Local.Routers.Projects.Project
        status$: Observable<
            | Local.Routers.Projects.PipelineStepEventKind
            | Local.Routers.Projects.PipelineStepStatusResponse
        >
        projectsState: State
        mode$: Subject<Mode>
        stepId: string
        flowId: string
    }) {
        const button = (target: Mode, icon: string): AnyVirtualDOM => ({
            tag: 'i',
            class: {
                source$: mode$,
                vdomMap: (mode: Mode) =>
                    mode == target ? 'fv-text-success' : '',
                wrapper: (d: string) => `${d} fas ${icon} fv-pointer`,
            },
            onclick: () => mode$.next(target),
        })

        const playButton: AnyVirtualDOM = {
            tag: 'i',
            class: {
                source$: combineLatest([status$, mode$]),
                vdomMap: ([s, m]: [string, Mode]) => {
                    const base =
                        s === 'runStarted'
                            ? 'fas fa-spinner fa-spin'
                            : 'fas fa-play fv-pointer'
                    return m == 'run' ? base + ' fv-text-success' : base
                },
            },
            onclick: () => {
                mode$.next('run')
                projectsState.runStep(project.id, flowId, stepId)
            },
        }
        const sep: AnyVirtualDOM = { tag: 'i', class: 'mx-2' }
        const config$ = new Local.Client().admin.projects
            .getStepView$({
                projectId: project.id,
                stepId,
                flowId,
            })
            .pipe(onHTTPErrors(() => false))
        this.children = [
            {
                tag: 'div',
                innerText: stepId,
            },
            sep,
            playButton,
            {
                source$: config$,
                vdomMap: (d) =>
                    d && {
                        tag: 'div',
                        children: [sep, button('config', 'fa-wrench')],
                    },
            },
            sep,
            button('manifest', 'fa-newspaper'),
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
        flowId,
        onExecute,
    }: {
        project: Local.Routers.Projects.Project
        stepId: string
        flowId: string
        onExecute: () => void
    }) {
        const projectsRouter = new Local.Client().admin.projects
        this.children = [
            {
                source$: projectsRouter
                    .getStepView$({
                        projectId: project.id,
                        stepId,
                        flowId,
                    })
                    .pipe(
                        raiseHTTPErrors(),
                        mergeMap((js) =>
                            from(
                                new Function(js)()({
                                    triggerRun: triggerRunHandler,
                                    project,
                                    flowId,
                                    stepId,
                                    projectsRouter,
                                    webpmClient,
                                }),
                            ),
                        ),
                    ),
                vdomMap: (view: RxHTMLElement<'div'>) => {
                    return { tag: 'div', children: [view] }
                },
            },
        ]
        const triggerRunHandler = ({
            configuration,
        }: {
            configuration: unknown
        }) => {
            projectsRouter
                .updateStepConfiguration$({
                    projectId: project.id,
                    flowId,
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
        project: Local.Routers.Projects.Project
        status$: Observable<
            | Local.Routers.Projects.PipelineStepEventKind
            | Local.Routers.Projects.PipelineStepStatusResponse
        >
    }) {
        const fingerPrint = (
            manifest: Local.Routers.Projects.Manifest,
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
        const sources = (
            manifest: Local.Routers.Projects.Manifest,
        ): AnyVirtualDOM => ({
            tag: 'div',
            class: 'my-3',
            children: [
                {
                    tag: 'div',
                    style: { width: 'fit-content' },
                    innerText: 'Source files',
                    class: 'me-3 mb-2 border-bottom',
                },
                new DataView(
                    manifest.files.map((f) => f.replace(project.path, '')),
                ),
            ],
        })
        const outputs = (
            manifest: Local.Routers.Projects.Manifest,
        ): AnyVirtualDOM => ({
            tag: 'div',
            class: 'my-3 w-100',
            children: [
                {
                    tag: 'div',
                    style: { width: 'fit-content' },
                    innerText: 'Outputs',
                    class: 'me-3 mb-2  border-bottom',
                },
                {
                    tag: 'div',
                    class: 'w-100 overflow-auto',
                    style: {
                        fontFamily: 'monospace',
                        fontSize: 'x-small',
                        whiteSpace: 'pre',
                    },
                    children: Array.isArray(manifest.cmdOutputs)
                        ? manifest.cmdOutputs.map((output) => {
                              return {
                                  tag: 'div',
                                  innerText: `${output}`,
                              } as VirtualDOM<'div'>
                          })
                        : [new DataView(manifest.cmdOutputs)],
                },
            ],
        })
        this.children = [
            {
                source$: status$,
                vdomMap: ({
                    manifest,
                }: {
                    manifest?: Local.Routers.Projects.Manifest
                }) => {
                    return {
                        tag: 'div',
                        class: 'w-100',
                        children: [
                            manifest && {
                                tag: 'div',
                                class: 'w-100',
                                children: [
                                    fingerPrint(manifest),
                                    sources(manifest),
                                    outputs(manifest),
                                ],
                            },
                        ],
                    }
                },
            },
        ]
    }
}

/**
 * @category View
 */
export class RunOutputsView implements VirtualDOM<'div'> {
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
        messages$,
        status$,
    }: {
        messages$: Observable<ContextMessage>
        status$: Observable<
            | Local.Routers.Projects.PipelineStepEventKind
            | Local.Routers.Projects.PipelineStepStatusResponse
        >
    }) {
        this.children = [
            {
                source$: status$,
                vdomMap: (s) =>
                    s === 'runStarted'
                        ? {
                              tag: 'div',
                              style: {
                                  fontFamily: 'monospace' as const,
                                  fontSize: 'x-small',
                                  whiteSpace: 'pre',
                              },
                              children: {
                                  policy: 'append',
                                  source$: messages$.pipe(map((m) => [m])),
                                  vdomMap: (
                                      message: ContextMessage<unknown>,
                                  ) => {
                                      return {
                                          tag: 'div',
                                          innerText: `${message.text}`,
                                      }
                                  },
                              },
                          }
                        : {
                              tag: 'div',
                          },
            },
        ]
    }
}
