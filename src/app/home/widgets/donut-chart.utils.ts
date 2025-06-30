import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CSSAttribute,
    EmptyDiv,
    VirtualDOM,
} from 'rx-vdom'

import * as d3 from 'd3'
import { AppState } from '../../app-state'
import { combineLatest, Observable } from 'rxjs'

type D3 = typeof d3
/* eslint-disable */
/**
 * Data model representing a section within a donut chart.
 *
 * @typeParam T The type of the entity used in the `selector` function to determine section membership.
 */
export type DonutChartSection<T> = {
    /**
     * A selector function that determines whether a given entity
     * belongs to this section.
     *
     * @param entity The entity to evaluate.
     * @returns `true` if the entity should be included in the section,
     *     `false` otherwise.
     */
    selector: (entity: T) => boolean
    /**
     * The label used to represent the section in the chart.
     */
    label: string
    /**
     * Optional CSS classes applied to the associated SVG element for custom styling.
     */
    class?: string
    /**
     * An optional inline style applied to the associated SVG element for custom styling.
     */
    style?: string

    /**
     * Fill color.
     */
    fill?: string
}

/**
 * Creates a donut chart using D3.js within a Virtual DOM structure.
 *
 * This function generates a donut chart, visualizing sections based on the provided entities and selectors.
 * The chart is rendered as an SVG element.
 *
 * @typeParam T - The type of the entities being analyzed and represented in the chart.
 *
 * @param params - An object containing parameters to configure the donut chart.
 * @param params.d3 - The D3.js library instance used to generate the chart.
 * @param params.entities - An array of entities to be analyzed and displayed in the chart sections.
 * @param params.margin - The margin size around the chart (in pixels).
 * @param params.width - The width of the chart, defined in CSS units (e.g., `100%`, `300px`).
 * @param params.sections - An array of {@link DonutChartSection} objects defining the chart's sections,
 *        including labels and selectors.
 * @returns A `Virtual DOM` that represents the `div` container.
 */
export function createDonutChartD3<T>({
    d3,
    entities,
    margin,
    style,
    sections,
}: {
    style: CSSAttribute
    d3: D3
    entities: T[]
    margin: number
    sections: DonutChartSection<T>[]
}): AnyVirtualDOM {
    return {
        tag: 'div',
        class: 'mx-auto',
        style: {
            ...style,
            aspectRatio: '1/1',
        },
        connectedCallback: (elem) => {
            const width = elem.offsetWidth
            const height = elem.offsetHeight
            const radius = Math.min(width, height) / 2 - margin
            const svg = d3
                .select(elem)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .append('g')
                .attr('transform', `translate(${width / 2}, ${height / 2})`)
            const data = sections
                .map((section, i) => {
                    const count = entities.filter((p) => {
                        return section.selector(p)
                    }).length
                    return {
                        ...section,
                        key: `${i}`,
                        label: section.label,
                        count,
                    }
                })
                .reduce((acc, e) => ({ ...acc, [e.key]: e }), {})

            const pie = d3.pie().value(function (d) {
                return d[1].count
            })
            // @ts-ignore
            const data_ready = pie(Object.entries(data))

            // @ts-ignore
            svg.selectAll('path')
                .data(data_ready)
                .join('path')
                .attr('class', (d) => d.data[1].class)
                .attr('style', (d) => d.data[1].style)
                .attr(
                    'd',
                    // @ts-ignore
                    d3
                        .arc()
                        .innerRadius(radius / 3)
                        .outerRadius(radius),
                )
                .attr('fill', (d) => d.data[1].fill ?? 'grey')
                .attr('stroke', 'black')
                .style('stroke-width', '2px')
                .style('opacity', 0.7)

            const text = svg.selectAll('text').data(data_ready)

            const legendRectSize = 18
            const legendSpacing = 8
            const legendHeight = legendRectSize + legendSpacing
            const legendPadding = 10
            // Container for the whole legend block
            const legendGroup = d3
                .select(elem.querySelector('svg'))
                .append('g')
                .attr('class', 'legend-group')
                .attr(
                    'transform',
                    `translate(${margin}, ${height - sections.length * legendHeight - margin})`,
                )

            // Inner group that holds only items (excluding background)
            const legendItemsGroup = legendGroup
                .append('g')
                .attr('class', 'legend-items')

            // Add legend items to inner group
            const legendItems = legendItemsGroup
                .selectAll('.legend-item')
                .data(data_ready)
                .enter()
                .append('g')
                .attr('class', 'legend-item')
                .attr(
                    'transform',
                    (_, i) =>
                        `translate(${legendPadding}, ${i * legendHeight + legendPadding})`,
                )

            legendItems
                .append('rect')
                .attr('width', legendRectSize)
                .attr('height', legendRectSize)
                .attr('fill', (d) => d.data[1].fill ?? 'grey')
                .attr('class', (d) => d.data[1].class)
                .attr('stroke', 'black')

            legendItems
                .append('text')
                .attr('x', legendRectSize + 6)
                .attr('y', legendRectSize / 2)
                .attr('dy', '0.35em')
                .text((d) => `${d.data[1].label} (${d.data[1].count})`)

            // Now add background *after* so we can measure the bbox of the content only
            setTimeout(() => {
                const bbox = legendItemsGroup.node()?.getBBox()
                if (bbox) {
                    // Insert rect *before* the items group so it goes underneath
                    legendGroup
                        .insert('rect', '.legend-items')
                        .attr('x', bbox.x - legendPadding)
                        .attr('y', bbox.y - legendPadding)
                        .attr('width', bbox.width + 2 * legendPadding)
                        .attr('height', bbox.height + 2 * legendPadding)
                        .attr('fill', '#f0f0f0')
                        .attr('opacity', 0.6)
                        .attr('stroke', '#ccc')
                        .attr('rx', 6)
                        .attr('ry', 6)
                }
            }, 0)
        },
    }
}
/**
 * Base class for creating donut-style charts.
 *
 * @typeParam T The type of entities being analyzed and represented in the chart.
 */
export class DonutChart<T> implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100'
    public readonly children: ChildrenLike

    public readonly appState: AppState
    public readonly width: string
    public readonly margin: number
    public readonly sections: DonutChartSection<T>[]
    public readonly entities$: Observable<T[]>

    constructor(params: {
        appState: AppState
        innerStyle?: CSSAttribute
        margin: number
        sections: DonutChartSection<T>[]
        entities$: Observable<T[]>
    }) {
        Object.assign(this, params)

        const d3$ = this.appState.install('d3') as unknown as Observable<{
            d3: D3
        }>
        this.children = [
            child$({
                source$: combineLatest([d3$, this.entities$]),
                vdomMap: ([{ d3 }, entities]) => {
                    if (this.sections.length === 0) {
                        console.warn(
                            '[w3lab] DonutChart plotted with no sections',
                        )
                    }
                    if (entities.length === 0 || params.sections.length === 0) {
                        return EmptyDiv
                    }
                    return createDonutChartD3<T>({
                        d3,
                        style: params.innerStyle,
                        entities: entities,
                        margin: this.margin,
                        sections: this.sections,
                    })
                },
            }),
        ]
    }

    /* eslint-enable */
    /**
     * Constructs a list of chart sections from the children of a given HTML element.
     *
     * The sections are defined by `section` child elements within the container, each with the following attributes:
     *
     * - **style**: Applied to the associated SVG element for custom styling.
     * - **class**: Forwarded to the associated SVG element for custom CSS classes.
     * - **label**: Label used to represent the section in the chart.
     * - **textContent**: The content of the HTML element should define a `selector` function (in string form).
     *   This function takes an entity as an argument and returns a boolean indicating whether the entity belongs to
     *   the section.
     *
     * **Example**
     *
     * <code-snippet language='html'>
     * <section label="Category 1" class="donut-category-1" style="fill: blue;">
     *     return (entity) => entity.type === 'category1';
     * </section>
     * </code-snippet>
     *
     * @param elem The parent HTML element containing `section` children.
     * @returns An array of `DonutChartSection` objects derived from the child `section` elements.
     */
    static sections(elem: HTMLElement): DonutChartSection<unknown>[] {
        const div = document.createElement('div')
        div.innerHTML = elem.textContent
        return Array.from(div.children)
            .filter((child) => child.tagName === 'SECTION')
            .map((child) => ({
                class: child.classList.value,
                style: child.getAttribute('style'),
                label: child.getAttribute('label'),
                // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
                selector: new Function(child.textContent)() as (
                    entity: unknown,
                ) => boolean,
            }))
    }
}
