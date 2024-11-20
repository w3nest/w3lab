import { Local } from '@w3nest/http-clients'
import { NavIconSvg } from '../common'
import { AnyVirtualDOM } from '@youwol/rx-vdom'

export function icon(project: Local.Projects.Project): AnyVirtualDOM {
    const filenames = {
        typescript: 'icon-TS.svg',
        python: 'icon-python.svg',
        javascript: 'icon-js.svg',
    }
    let filename = ''
    if (project.pipeline.tags.includes('typescript')) {
        filename = filenames.typescript
    }
    if (project.pipeline.tags.includes('python')) {
        filename = filenames.python
    }
    if (project.pipeline.tags.includes('javascript')) {
        filename = filenames.javascript
    }
    if (filename === '') {
        return { tag: 'div' }
    }
    return new NavIconSvg({
        filename,
    })
}
