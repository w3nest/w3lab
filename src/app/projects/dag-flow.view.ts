import * as d3 from 'd3'
import {
    Dag,
    dagStratify,
    decrossOpt,
    layeringLongestPath,
    sugiyama,
} from 'd3-dag'
import { combineLatest, merge } from 'rxjs'
import { Local } from '@w3nest/http-clients'
import { instanceOfStepStatus, State } from './state'
import { map } from 'rxjs/operators'
import { RxHTMLElement, VirtualDOM } from 'rx-vdom'
/* eslint-disable */
/**
 * @category View
 */
export class DagFlowView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100 flex-grow-1 mx-auto'

    /**
     * @group Immutable Constants
     */
    public readonly project: Local.Projects.Project

    /**
     * @group States
     */
    public readonly projectsState: State

    /**
     * @group Immutable Constants
     */
    public readonly dag: {
        includedSteps: Set<string>
        data: { id: string; parentIds: string[] }[]
    }

    /**
     * @group Immutable Constants
     */
    static colorsFactory = {
        none: 'gray',
        KO: 'red',
        OK: 'green',
        outdated: 'orange',
    }

    /**
     * @group Immutable Constants
     */
    static fasColorsFactory = {
        none: 'gray',
        KO: 'black',
        OK: 'black',
        outdated: '#cb5418',
    }

    /**
     * @group Immutable DOM Constants
     */
    connectedCallback: (elem: RxHTMLElement<'div'>) => void

    /**
     * @group Immutable Constants
     */
    static nodeRadius = 20
    /**
     * @group Immutable Constants
     */
    static toolBoxHeight = 10

    /**
     * @group Immutable Constants
     */
    public readonly defaultStyle = {
        group: {
            attributes: {
                id: (d) => d.data.id,
                class: 'fv-pointer',
                transform: ({ x, y }) => `translate(${y}, ${x})`,
            },
            style: {},
            on: {
                click: (n, { data }) => {
                    this.projectsState.selectStep(this.project.id, data.id)
                    n.stopPropagation()
                },
            },
        },
        link: {
            attributes: {
                d: ({ points }) => {
                    const line = d3
                        .line()
                        .curve(d3.curveCatmullRom)
                        .x((d) => d.y)
                        .y((d) => d.x)
                    return line(points)
                },
                class: 'fv-pointer dag-flow-link',
            },
        },
        thumbnail: {
            attributes: {
                class: 'thumbnail fv-hover-xx-lighter',
            },
        },
        circle: {
            attributes: {
                r: DagFlowView.nodeRadius,
                class: 'fv-pointer',
                fill: 'white',
                stroke: 'white',
            },
            style: {},
        },
        title: {
            attributes: {
                class: 'fv-pointer dag-flow-node-title',
                transform: `translate(0, -${DagFlowView.nodeRadius + 10})`,
            },
            style: {
                'font-size': `${DagFlowView.toolBoxHeight}px`,
                'user-select': 'none',
            },
            fontColor: (status) => {
                if (!status.manifest) {
                    return 'black'
                }
                return status.manifest.succeeded ? 'green' : 'red'
            },
        },
        status: {
            attributes: {
                class: 'fv-pointer fas  dag-flow-node-status',
            },
        },
        menuActions: {
            attributes: {
                class: 'menu-actions',
                transform: (d) =>
                    `translate( -${d.data.hasView ? 5 : 0}, ${
                        DagFlowView.nodeRadius + 15
                    })`,
            },
        },
        run: {
            attributes: {
                class: 'fas fv-pointer dag-flow-node-run fv-hover-xx-lighter',
                transform: `translate(0, 0)`,
            },
            style: {
                fill: 'green',
            },
            on: {
                click: (n, { data }) => {
                    n.stopPropagation()
                    this.projectsState.runStep(this.project.id, data.id)
                },
            },
        },
        settings: {
            attributes: {
                class: 'fas fv-pointer dag-flow-node-settings fv-hover-xx-lighter',
                transform: `translate(15, 0)`,
            },
            style: {
                fill: '#d7e5ee',
            },
            on: {
                click: (n, { data }) => {
                    n.stopPropagation()
                    this.projectsState.configureStep(this.project.id, data.id)
                },
            },
        },
    }

    constructor(params: {
        project: Local.Projects.Project
        projectsState: State
    }) {
        Object.assign(this, params)
        this.dag = parseDag(this.project)
        this.connectedCallback = (elem: RxHTMLElement<'div'>) => {
            const svg = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'svg',
            )
            svg.classList.add('h-100', 'w-100')
            elem.appendChild(svg)
            this.renderDag(svg)
            const events$ = Array.from(this.dag.includedSteps).map((stepId) => {
                const d3Svg = d3.select(svg)
                return combineLatest([
                    this.projectsState.projectEvents[this.project.id]
                        .getStep$(stepId)
                        .status$.pipe(
                            map((status) => ({
                                status,
                                stepId,
                                groupThumbnail: d3Svg.select(
                                    `g#${stepId} > g.thumbnail`,
                                ),
                                circle: d3Svg.select(`g#${stepId} circle`),
                                title: d3Svg.select(
                                    `g#${stepId} .dag-flow-node-title`,
                                ),
                                text: d3Svg.select(
                                    `g#${stepId} .dag-flow-node-status`,
                                ),
                                settings: d3Svg.select(
                                    `g#${stepId} .dag-flow-node-settings`,
                                ),
                                menuActions: d3Svg.select(
                                    `g#${stepId} > g.menu-actions`,
                                ),
                            })),
                        ),
                    this.projectsState.projectEvents[this.project.id]
                        .selectedStep$,
                ])
            })
            elem.ownSubscriptions(
                merge(...events$).subscribe(([event, selected]) => {
                    this.applyStyle(selected, event)
                }),
            )
        }
    }

    renderDag(svg: SVGElement) {
        const withDefaultStyleAttributes = (n, data) => {
            Object.entries(data.attributes || {}).forEach(([k, v]) => {
                n = n.attr(k, v)
            })
            Object.entries(data.style || {}).forEach(([k, v]) => {
                n = n.style(k, v)
            })
            Object.entries(data.on || {}).forEach(([k, v]) => {
                n = n.on(k, v)
            })
            return n
        }

        const dag = dagStratify()(this.dag.data)

        const layout = sugiyama()
            .layering(layeringLongestPath())
            // minimize number of crossings
            .decross(decrossOpt())
            // set node size instead of constraining to fit
            .nodeSize((n) => [
                (n ? 3.6 : 0.25) * DagFlowView.nodeRadius,
                4 * DagFlowView.nodeRadius,
            ])

        // see https://github.com/erikbrinkman/d3-dag#typescript-notes for Dag<never, never>
        const { width, height } = layout(dag as Dag<never, never>)
        const padding = 10
        const svgSelection = d3
            .select(svg)
            .on('click', () => this.projectsState.selectStep(this.project.id))
        svgSelection.attr(
            'viewBox',
            [-padding, -padding, height + padding, width + padding].join(' '),
        )

        withDefaultStyleAttributes(
            svgSelection
                .append('g')
                .selectAll('path')
                .data(dag.links())
                .enter()
                .append('path'),
            this.defaultStyle.link,
        )

        const nodes = withDefaultStyleAttributes(
            svgSelection
                .append('g')
                .selectAll('g')
                .data(dag.descendants())
                .enter()
                .append('g'),
            this.defaultStyle.group,
        )

        const nodesThumbnail = withDefaultStyleAttributes(
            nodes.append('g').attr('class', 'thumbnail'),
            this.defaultStyle.thumbnail,
        )
        withDefaultStyleAttributes(
            nodesThumbnail.append('circle'),
            this.defaultStyle.circle,
        )

        withDefaultStyleAttributes(
            nodes.append('text'),
            this.defaultStyle.status,
        )

        withDefaultStyleAttributes(
            nodes
                .append('text')
                .text((d) => d.data.id)
                .on('click', onclick),
            this.defaultStyle.title,
        )

        const nodesMenuActions = withDefaultStyleAttributes(nodes.append('g'), {
            attributes: {
                ...this.defaultStyle.menuActions.attributes,
                class: 'menu-actions d-none',
            },
        })

        withDefaultStyleAttributes(
            nodesMenuActions.append('text').text('\uf04b'),
            this.defaultStyle.run,
        )
        withDefaultStyleAttributes(
            nodesMenuActions
                .filter((d) => d.data.hasView)
                .append('text')
                .text('\uf0ad'),
            this.defaultStyle.settings,
        )
    }

    applyStyle(
        selected: { step: Local.Projects.PipelineStep },
        event: {
            stepId
            status
            groupThumbnail: d3.selection
            circle: d3.selection
            title: d3.selection
            text: d3.selection
            menuActions: d3.selection
            settings: d3.selection
        },
    ) {
        const isSelected = selected.step && selected.step.id === event.stepId
        const selectedClass = isSelected ? 'fv-xx-lighter' : ''
        const pendingClass = instanceOfStepStatus(event.status) ? '' : 'pending'

        event.menuActions.attr(
            'class',
            isSelected
                ? `${this.defaultStyle.menuActions.attributes.class} d-block`
                : `${this.defaultStyle.menuActions.attributes.class} d-none`,
        )

        event.circle.attr(
            'class',
            `${this.defaultStyle.circle.attributes.class} ${selectedClass} ${pendingClass}`,
        )
        event.circle.attr(
            'r',
            selected.step && selected.step.id === event.stepId
                ? '25px'
                : '20px',
        )
        event.title.style(
            'fill',
            this.defaultStyle.title.fontColor(event.status),
        )

        if (instanceOfStepStatus(event.status)) {
            event.circle.attr(
                'fill',
                DagFlowView.colorsFactory[event.status.status],
            )
        }

        event.groupThumbnail.attr(
            'class',
            `${this.defaultStyle.thumbnail.attributes.class} ${pendingClass}`,
        )

        const factoryPending: Record<
            Local.Projects.PipelineStepEventKind,
            string
        > = {
            runStarted: '',
            runDone: '',
            statusCheckStarted: '',
        }
        const factoryDone: Record<'OK' | 'KO' | 'outdated' | 'none', string> = {
            OK: '\uf00c',
            KO: '\uf00d',
            outdated: '\uf071',
            none: '',
        }

        event.text
            .text(
                instanceOfStepStatus(event.status)
                    ? factoryDone[event.status.status]
                    : factoryPending[event.status],
            )
            .style('fill', DagFlowView.fasColorsFactory[event.status.status])
    }
}

function parseDag(project: Local.Projects.Project) {
    const flow = project.pipeline.flow
    const availableSteps = project.pipeline.steps.map((s) => s.id)
    const includedSteps = new Set(
        flow.dag.flatMap((branch) => {
            return branch
                .split('>')
                .map((elem) => elem.trim())
                .reduce((acc, e) => acc.concat(e), [])
        }),
    )
    includedSteps.forEach((stepId) => {
        if (!availableSteps.includes(stepId)) {
            throw Error(`Step ${stepId} not found in the pipeline definition`)
        }
    })
    const parentIds: { [k: string]: string[] } = [...includedSteps].reduce(
        (acc, e) => ({ ...acc, [e]: [] }),
        {},
    )
    flow.dag.forEach((branch) => {
        let previous = undefined
        branch
            .split('>')
            .map((elem) => elem.trim())
            .reverse()
            .forEach((e: string) => {
                previous && parentIds[previous].push(e)
                // noinspection ReuseOfLocalVariableJS
                previous = e
            })
    })
    const data = [...includedSteps].map((stepId: string) => {
        return {
            id: stepId,
            parentIds: parentIds[stepId],
            hasView: project.pipeline.steps.find((s) => s.id === stepId)[
                'view'
            ],
        }
    })
    return {
        includedSteps,
        data,
    }
}
/* eslint-enable */
