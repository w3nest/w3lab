import { ChildrenLike, CSSAttribute, VirtualDOM } from '@youwol/rx-vdom'
import type { ApplicationInfo } from '@youwol/os-core'
import { raiseHTTPErrors, AssetsGateway } from '@w3nest/http-clients'
import { shareReplay } from 'rxjs/operators'
import { colabClassPrefix } from '../../common'

/**
 * Represents a view that displays a collection of application links, arranged in a flexible grid layout.
 *
 * The `LaunchPadView` is a container that wraps multiple {@link AppIcon} components, each representing an
 * individual application.
 *
 *
 * This component is designed to be embedded in a `Markdown` page,
 * refer to {@link LaunchPadView.fromHTMLElement}.
 */
export class LaunchPadView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * CSS classes applied to the container.
     */
    public readonly class = `${colabClassPrefix}-LaunchPadView d-flex flex-wrap`
    public readonly children: ChildrenLike

    public readonly size: string
    public readonly apps: AppIcon[]

    constructor(params: { size: string; apps: AppIcon[] }) {
        Object.assign(this, params)

        this.children = params.apps
    }

    /**
     * Creates a `LaunchPadView` instance from an HTML element, typically sourced from `Markdown`.
     *
     * This function parses the child elements of the given HTML element and transforms each child `APP` tag
     * into an {@link AppIcon} component.
     *
     * **Example**
     *
     * <code-snippet language='html'>
     * <launchPad size='50px'>
     *    <app name="@youwol/mkdocs-ts-doc"></app>
     *    <app name="@youwol/rx-vdom-doc"></app>
     *    <app name="@w3nest/webpm-client-doc"></app>
     * </launchPad>
     * </code-snippet>
     *
     *
     * @param elem - The HTML element to parse and convert.
     * @returns A new instance of `LaunchPadView`.
     */
    static fromHTMLElement(elem: HTMLElement): LaunchPadView {
        const div = document.createElement('div')
        div.innerHTML = elem.textContent

        const apps = Array.from(div.children)
            .filter((child) => child.tagName === 'APP')
            .map((child) => {
                return AppIcon.fromHTMLElement(child, {
                    size: elem.getAttribute('size'),
                })
            })

        return new LaunchPadView({ size: elem.getAttribute('size'), apps })
    }
}

/**
 * Represents a link for a specific application within a {@link LaunchPadView}.
 *
 * Each `AppIcon` dynamically loads metadata (like the application name, icon) to render it.
 *
 * Refer to {@link AppIcon.fromHTMLElement} for constructing the view from an HTML element in MarkDown.
 */
export class AppIcon implements VirtualDOM<'button'> {
    public readonly tag = 'button'

    /**
     * CSS classes applied to the container, maybe modified when constructing the instance.
     */
    public readonly class: string = `${colabClassPrefix}-AppIcon btn btn-light btn-sm colab-AppIcon m-3`

    /**
     * Inlined style specification, maybe modified when constructing the instance.
     */
    public readonly style: CSSAttribute = {}

    public readonly children: ChildrenLike

    static readonly appMetadata$ = (appName: string) => {
        if (AppIcon._appMetadata$[appName]) {
            return AppIcon._appMetadata$[appName]
        }
        AppIcon._appMetadata$[appName] = new AssetsGateway.Client().webpm
            .getResource$<ApplicationInfo>({
                libraryId: window.btoa(appName),
                version: 'latest',
                restOfPath: '.yw_metadata.json',
            })
            .pipe(raiseHTTPErrors(), shareReplay(1))
        return AppIcon._appMetadata$[appName]
    }
    private static _appMetadata$ = {}

    constructor(params: {
        package: string
        size: string
        version?: string
        label?: string
        class?: string
        style?: CSSAttribute
    }) {
        if (params.class) {
            this.class = params.class
        }
        if (params.style) {
            this.style = params.style
        }
        this.children = [
            {
                source$: AppIcon.appMetadata$(params.package),
                vdomMap: (appInfo: ApplicationInfo) => {
                    return {
                        tag: 'a',
                        class: 'd-flex flex-column align-items-center',
                        href: `/apps/${params.package}/${params.version}`,
                        target: '_blank',
                        children: [
                            {
                                tag: 'div',
                                class: 'colab-Icon',
                                style: {
                                    width: params.size,
                                    height: params.size,
                                },
                                children: [appInfo.graphics.appIcon],
                            },
                            {
                                tag: 'i',
                                class: 'my-1',
                            },
                            {
                                tag: 'div',
                                class: '',
                                innerText: params.label || appInfo.displayName,
                            },
                        ],
                    }
                },
                untilFirst: {
                    tag: 'i',
                    class: 'fas fa-spinner fa-spin m-5',
                },
            },
        ]
    }

    /**
     * Creates an `AppIcon` instance from an HTML element, typically sourced from Markdown.
     *
     * This function parses the attributes of the given HTML element and converts it into an `AppIcon` component.
     *
     * The following attributes are expected:
     * - **name**: The name of the application (its package name).
     * - **version**: The version of the application, defaults to `'latest'` if not specified.
     * - **class**: Optional CSS classes to associate with the `AppIcon` HTML element.
     * - **style**: Optional inline styles to apply to the `AppIcon` HTML element.
     * - **label**: Optional, if provided, this value will be displayed instead of the application's official `displayName`.
     * - **size**: Specifies the size of the application's icon (displayed with a 1:1 aspect ratio), defaults to `50px` if not provided.
     *
     * @param elem - The HTML element to parse and convert into an `AppIcon`.
     * @param size - The default size to apply if the `size` attribute is not specified on the element.
     * @returns A new instance of `AppIcon`.
     */
    static fromHTMLElement(elem: Element, { size }): AppIcon {
        const style: CSSAttribute = (elem.getAttribute('style') || '')
            .split(';')
            .filter((d) => d != '')
            .map((part) => {
                const key = part.trim().split(':')[0].trim()
                const val = part.trim().split(':')[1].trim()
                return { key, val }
            })
            .reduce((acc, { key, val }) => ({ ...acc, [key]: val }), {})
        const d = {
            package: elem.getAttribute('name'),
            version: elem.getAttribute('version') || 'latest',
            class: elem.classList.value,
            style,
            label: elem.getAttribute('label'),
            size: elem.getAttribute('size') || '50px',
        }
        return new AppIcon({ ...d, size: elem.getAttribute('size') || size })
    }
}
