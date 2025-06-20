/**
 * This module offers a collection of widgets designed for use when editing the `Home` page.
 *
 *
 * ## {@link LaunchPadView}
 *
 * A container for applications' link, *e.g.*:
 *
 * <launchPad size='50px'>
 * <app name="@mkdocs-ts/doc"></app>
 * <app name="@rx-vdom/doc"></app>
 * <app name="@webpm-client/doc"></app>
 * </launchPad>
 *
 * ## {@link ProjectsDonutChart}
 *
 * A donut chart that displays a histogram of {@link w3nest.Project}, *e.g.*:
 *
 * <projectsDonutChart margin="70" width="75%">
 *     <section label="Typescript" style="fill:darkblue">
 *        return (p) => p.ci.tags.includes('typescript')
 *     </section>
 *     <section label="Python" class="pie-chart-py" style="fill:rebeccapurple">
 *        return (p) => p.ci.tags.includes('python')
 *     </section>
 *     <section  label="JavaScript" style="fill:yellow">
 *        return (p) => p.ci.tags.includes('javascript')
 *     </section>
 * </projectsDonutChart>
 *
 * ## {@link ComponentsDonutChart}
 *
 * A donut chart that visualizes a histogram of {@link w3nest.CdnPackageLight}, *e.g.*:
 *
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
 *
 * ## Recent Projects
 *
 * This widget displays a list of the most recently edited projects, *e.g.*:
 *
 * <projectsHistoric count="5"></projectsHistoric>
 *
 *
 * @module
 */
export * from './launch-pad.view'
export * from './projects-historic.view'
export * from './projects-donut-chart.view'
export * from './components-donut-chart.view'
export * from './donut-chart.utils'
