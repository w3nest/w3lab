import { Observable, Subject } from 'rxjs'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Common, TsCodeEditorModule } from '@w3nest/rx-code-mirror-editors'

import CodeMirror from 'codemirror'
import { ProfilesState } from './profiles.state'

/**
 * @category View
 */
export class CodeEditorView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class: string = 'w-100 h-100 d-flex flex-column'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        CodeEditorModule,
        tsSrc,
        readOnly,
        onRun,
    }: {
        profileState: ProfilesState
        CodeEditorModule: TsCodeEditorModule
        tsSrc: string
        readOnly: boolean
        onRun: (editor) => Promise<unknown>
    }) {
        const ideState = new CodeEditorModule.IdeState({
            files: [
                {
                    path: './index.ts',
                    content: tsSrc,
                },
            ],
        })

        const error$ = new Subject<Error | undefined>()
        const onRunWithErrors = (editor) =>
            onRun(editor)
                .then(() => error$.next(undefined))
                .catch((e) => {
                    error$.next(e)
                    console.error('An error occurred', e)
                })

        const codeEditorView = new CodeEditorModule.CodeEditorView({
            ideState,
            path: './index.ts',
            config: {
                readOnly,
                extraKeys: {
                    'Ctrl-Enter': (editor) => onRunWithErrors(editor),
                },
            },
        })
        this.children = [
            readOnly
                ? { tag: 'div' }
                : {
                      source$: codeEditorView.nativeEditor$,
                      vdomMap: (editor) =>
                          new ToolbarView({
                              highlights$: codeEditorView.highlights$,
                              onRun: onRunWithErrors,
                              editor,
                              error$,
                          }),
                  },
            {
                tag: 'div',
                class: 'w-100 flex-grow-1 overflow-auto',
                children: [codeEditorView],
            },
        ]
    }
}

export class ToolbarView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class: string =
        'w-100 fv-bg-background d-flex justify-content-center align-items-center'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        highlights$,
        onRun,
        editor,
        error$,
    }: {
        highlights$: Observable<Common.SrcHighlight[]>
        onRun: (editor: CodeMirror.Editor) => Promise<unknown>
        editor: CodeMirror.Editor
        error$
    }) {
        this.children = [
            {
                source$: highlights$,
                vdomMap: (highlights: Common.SrcHighlight[]) => {
                    return highlights.length > 0
                        ? {
                              tag: 'div',
                              class: 'fas fa-exclamation fv-text-error p-1',
                          }
                        : {
                              tag: 'div',
                              class: 'fas fa-save mx-1 fv-text-success fv-hover-xx-lighter fv-pointer rounded p-1',
                              onclick: () => {
                                  onRun(editor).then(() => {
                                      /* no op: errors are handle separately using 'error$' */
                                  })
                              },
                          }
                },
            },
            {
                source$: error$,
                vdomMap: (error) => {
                    return error
                        ? {
                              tag: 'div',
                              class: 'fas fa-times fv-text-error  p-1',
                          }
                        : {
                              tag: 'div',
                              class: 'fas fa-check fv-text-success  p-1',
                          }
                },
            },
        ]
    }
}
