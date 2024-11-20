import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { parseMd, Router } from '@youwol/mkdocs-ts'

export function pyYwDocLink(title: string, path: string) {
    const basePath = '/apps/@youwol/py-youwol-doc/latest?nav='
    const href = `${basePath}${path}`
    return `<a href='${href}' target='_blank'>${title}</a>`
}
export class PyYwReferencesView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor(params: {
        router: Router
        items: { title: string; description: string; path: string }[]
    }) {
        const basePath = '/apps/@youwol/py-youwol-doc/latest?nav='
        this.children = [
            parseMd({
                src: `
# References

Below are links to the youwol server reference documentation.
 
<references></references>
                `,
                router: params.router,
                views: {
                    references: () => {
                        return {
                            tag: 'ul',
                            children: params.items.map(
                                ({ title, description, path }) => {
                                    const href = `${basePath}${path}`
                                    return {
                                        tag: 'li',
                                        innerHTML: `<a href='${href}' target='_blank'>${title}</a> : ${description}`,
                                    }
                                },
                            ),
                        }
                    },
                },
            }),
        ]
    }
}
