import {
    BehaviorSubject,
    combineLatest,
    from,
    Observable,
    ReplaySubject,
    Subject,
} from 'rxjs'
import { filter, map, mergeMap, shareReplay } from 'rxjs/operators'
import { AppState } from '../app-state'
import {
    filterCtxMessage,
    raiseHTTPErrors,
    WebSocketResponse$,
    ContextMessage,
    Label,
    Local,
    WebpmSessionsStorage,
} from '@w3nest/http-clients'
import { getProjectNav$ } from '../common/utils-nav'
import { setup } from '../../auto-generated'

function projectLoadingIsSuccess(
    result: unknown,
): result is Local.Projects.ProjectsLoadingResults {
    return result['failure'] === undefined
}

export type FlowId = string

export function instanceOfStepStatus(
    data: unknown,
): data is Local.Projects.PipelineStepStatusResponse {
    return [
        'projectId',
        'flowId',
        'stepId',
        'artifactFolder',
        'artifacts',
    ].reduce((acc, e) => acc && data[e], true)
}

/**
 * @category Event
 */
export class ProjectEvents {
    /**
     * @group Immutable Constants
     */
    public readonly projectsClient = new Local.Client().api.projects

    /**
     * @group Observables
     */
    public readonly messages$: WebSocketResponse$<unknown, Label>

    /**
     * @group Observables
     */
    public readonly selectedStep$: BehaviorSubject<{
        step: Local.Projects.PipelineStep | undefined
    }>

    /**
     * @group Observables
     */
    public readonly configureStep$: Subject<{
        step: Local.Projects.PipelineStep | undefined
    }> = new Subject()

    /**
     * @group Observables
     */
    public readonly step$: {
        [k: string]: {
            status$: ReplaySubject<
                | Local.Projects.PipelineStepEventKind
                | Local.Projects.PipelineStepStatusResponse
            >
            log$: Subject<ContextMessage>
        }
    } = {}

    /**
     * @group Observables
     */
    public readonly projectStatusResponse$: WebSocketResponse$<
        Local.Projects.ProjectStatus,
        Label
    >

    constructor(public readonly project: Local.Projects.Project) {
        this.messages$ = Local.Client.ws.log$.pipe(
            filterCtxMessage({
                withAttributes: { projectId: this.project.id },
            }),
            shareReplay(1),
        )

        this.selectedStep$ = new BehaviorSubject<{
            step: Local.Projects.PipelineStep | undefined
        }>({
            step: undefined,
        })

        this.projectsClient.webSocket
            .stepEvent$({ projectId: this.project.id })
            .pipe(
                map((message) => message.data),
                filter(
                    (data: Local.Projects.PipelineStepEvent) =>
                        data.event == 'runStarted' ||
                        data.event == 'statusCheckStarted',
                ),
            )
            .subscribe((data: Local.Projects.PipelineStepEvent) => {
                this.getStep$(data.stepId).status$.next(data.event)
            })
        this.messages$
            .pipe(
                filterCtxMessage({
                    withLabels: ['Label.PIPELINE_STEP_RUNNING'],
                    withAttributes: { projectId: this.project.id },
                }),
            )
            .subscribe((message: ContextMessage) => {
                const stepId = message.attributes['stepId']
                this.getStep$(stepId).log$.next(message)
            })

        this.projectsClient.webSocket
            .ciStepStatus$({
                projectId: this.project.id,
            })
            .pipe(map((message) => message.data))
            .subscribe((status) => {
                this.getStep$(status.stepId).status$.next(status)
            })
        this.projectStatusResponse$ = this.projectsClient.webSocket
            .projectStatus$()
            .pipe(shareReplay(1))

        this.projectsClient.getCiStatus$({ projectId: project.id }).subscribe()

        this.selectedStep$
            .pipe(
                filter(({ step }) => step != undefined),
                mergeMap(({ step }) => {
                    return this.projectsClient.getCiStepStatus$({
                        projectId: project.id,
                        stepId: step.id,
                    })
                }),
            )
            .subscribe()
    }

    getStep$(stepId: string) {
        if (this.step$[stepId]) {
            return this.step$[stepId]
        }
        this.step$[stepId] = {
            status$: new ReplaySubject(1),
            log$: new Subject(),
        }
        return this.step$[stepId]
    }
}

/**
 * @category State
 */
export class State {
    /**
     * @group States
     */
    public readonly appState: AppState

    /**
     * @group Immutable Constants
     */
    public readonly projectsClient = new Local.Client().api.projects

    /**
     * @group Immutable Constants
     */
    public readonly projectEvents: { [k: string]: ProjectEvents } = {}

    /**
     * @group Observables
     */
    public readonly projectsLoading$: Observable<Local.Projects.ProjectsLoadingResults>

    /**
     * @group Observables
     */
    public readonly projects$: Observable<Local.Projects.Project[]>

    /**
     * @group Observables
     */
    public readonly projectsFailures$: Observable<
        Local.Projects.ProjectsLoadingResults['failures']
    >

    /**
     * @group Observables
     */
    public readonly openProjects$ = new BehaviorSubject<
        Local.Projects.Project[]
    >([])

    public readonly historic$: Observable<Local.Projects.Project[]>
    private readonly rawHistoric$ = new BehaviorSubject<string[]>([])

    private readonly storageClient = new WebpmSessionsStorage.Client()
    private static readonly STORAGE_KEY = 'colab-projects-v0'

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)

        this.projectsLoading$ = this.projectsClient.webSocket.status$().pipe(
            map(({ data }) => data),
            shareReplay(1),
        )

        this.projects$ = this.projectsLoading$.pipe(
            map((data) =>
                data.results.filter((result) =>
                    projectLoadingIsSuccess(result),
                ),
            ),
            map((results) => results),
            shareReplay(1),
        )

        this.projectsFailures$ = this.projectsLoading$.pipe(
            map((data) => data.failures),
            shareReplay(1),
        )

        this.historic$ = combineLatest([
            this.projects$,
            this.rawHistoric$,
        ]).pipe(
            map(([projects, historic]) => {
                return historic
                    .map((p) => projects.find((p2) => p2.name === p))
                    .filter((d) => d !== undefined)
            }),
        )
        this.rawHistoric$
            .pipe(
                mergeMap((historic) => {
                    return from(
                        this.storageClient.postData$({
                            packageName: setup.name,
                            dataName: State.STORAGE_KEY,
                            body: { historic },
                        }),
                    )
                }),
            )
            .subscribe(() => {})

        this.storageClient
            .getData$({
                packageName: setup.name,
                dataName: State.STORAGE_KEY,
            })
            .pipe(raiseHTTPErrors())
            .subscribe((resp) => {
                this.updatePersistedHistoric({ open: resp['historic'] })
            })
    }

    runStep(projectId: string, stepId: string) {
        this.projectsClient.runStep$({ projectId, stepId }).subscribe()
    }

    configureStep(projectId: string, stepId: string) {
        const events = this.projectEvents[projectId]
        const step = events.project.pipeline.steps.find((s) => s.id == stepId)
        this.projectEvents[projectId].configureStep$.next({
            step,
        })
    }

    openProject(project: Local.Projects.Project) {
        this.updatePersistedHistoric({ open: [project.name] })
        if (!this.projectEvents[project.id]) {
            this.projectEvents[project.id] = new ProjectEvents(project)
        }

        const openProjects = this.openProjects$.getValue()

        if (
            !openProjects.some((openProject) => openProject.id === project.id)
        ) {
            this.openProjects$.next([...openProjects, project])
        }
        getProjectNav$({
            projectName: project.name,
            appState: this.appState,
            timeout: 3000,
        }).subscribe((nav) => {
            if (this.appState.router.getCurrentPath() !== nav) {
                this.appState.router.navigateTo({ path: nav })
            }
        })
    }

    updatePersistedHistoric({ open }: { open: string[] }) {
        const raw = this.rawHistoric$.value
        const base = raw.filter((p) => {
            return !open.includes(p)
        })
        const newHistoric = [...open, ...base]
        this.rawHistoric$.next(newHistoric)
    }
    selectStep(projectId: string, stepId: string | undefined = undefined) {
        const events = this.projectEvents[projectId]
        const step = events.project.pipeline.steps.find((s) => s.id == stepId)
        events.selectedStep$.next(step ? { step } : { step: undefined })
    }

    createProjectFromTemplate$({
        type,
        parameters,
    }: {
        type: string
        parameters: { [_k: string]: string }
    }) {
        return this.projectsClient.createProjectFromTemplate$({
            body: {
                type,
                parameters,
            },
        })
    }

    refreshProjects() {
        this.projectsClient.status$().subscribe()
    }
}
