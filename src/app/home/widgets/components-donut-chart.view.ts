import { AppState } from '../../app-state'
import { map } from 'rxjs/operators'
import { DonutChart, DonutChartSection } from './donut-chart.utils'
import { Local } from '@w3nest/http-clients'
import { Router } from 'mkdocs-ts'

/**
 * A widget that displays a donut chart representing components.
 *
 * The chart's sections are determined by a selector function that takes a {@link w3nest.CdnPackageLight} as argument.
 *
 * This component is designed to be embedded in a `Markdown` page,
 * refer to {@link ComponentsDonutChart.fromHTMLElement}.
 */
export class ComponentsDonutChart extends DonutChart<Local.Components.CdnPackageLight> {
    constructor(params: {
        appState: AppState
        width: string
        margin: number
        sections: DonutChartSection<Local.Components.CdnPackage>[]
    }) {
        super({
            ...params,
            entities$: params.appState.cdnState.status$.pipe(
                map((resp) => resp.packages),
            ),
        })
    }

    /**
     * Constructs a `ComponentsDonutChart` from an HTML element, typically sourced from
     * `Markdown`.
     *
     * The HTML element must include specific attributes:
     *
     * - **margin**: Margin of the plot in pixels, defaults to `75`.
     * - **width**: Width of the plot in CSS units, defaults to `100%`.
     *
     * The sections of the chart are defined by `section` child elements. See {@link DonutChart.sections}
     * for more details.
     *
     * **Example**
     *
     * <code-snippet language="html">
     * <componentsDonutChart margin="70" width="75%">
     *     <section label="JS/WASM" style="fill:darkblue">
     *        return (c) => c.versions.slice(-1)[0].kind === 'esm'
     *     </section>
     *     <section label="Pyodide" style="fill:rebeccapurple">
     *        return (c) => c.versions.slice(-1)[0].kind === 'pyodide'
     *     </section>
     *     <section  label="Backend" style="fill:yellow">
     *        return (c) => c.versions.slice(-1)[0].kind === 'backend'
     *     </section>
     *     <section  label="WebApp" style="fill:darkgreen">
     *        return (c) => c.versions.slice(-1)[0].kind === 'webapp'
     *     </section>
     * </componentsDonutChart>
     * </code-snippet>
     *
     * <note level="hint">
     * Attributes of the `c` variable, as defined in the example, are available in
     * {@link w3nest.CdnPackageLight}.
     * </note>
     *
     * @param elem The HTML element containing the chart configuration.
     * @param router The application router.
     * @returns An instance of `ComponentsDonutChart`.
     */
    static fromHTMLElement(
        elem: HTMLElement,
        router: Router,
    ): ComponentsDonutChart {
        return new ComponentsDonutChart({
            appState: router.userStore as AppState,
            margin: parseFloat(elem.getAttribute('margin')) || 75,
            width: elem.getAttribute('width') || '100%',
            sections: DonutChart.sections(elem),
        })
    }
}
