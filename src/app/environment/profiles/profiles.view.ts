import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { ProfilesState, Profile } from './profiles.state'

import { CodeEditorView } from './code-editor.view'
import { combineLatest } from 'rxjs'
import { TsCodeEditorModule } from '@w3nest/rx-code-mirror-editors'
import { spinnerView } from '../../common'

export class ProfilesListView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ profilesState }: { profilesState: ProfilesState }) {
        this.children = [
            {
                tag: 'select',

                onchange: (ev) => {
                    profilesState.selectProfile(ev.target['value'])
                },
                children: {
                    policy: 'replace',
                    source$: combineLatest([
                        profilesState.profiles$,
                        profilesState.selectedProfile$,
                    ]),
                    vdomMap: ([profiles, selected]: [
                        { id: string; name: string }[],
                        string,
                    ]) => {
                        return profiles.map((profile) => {
                            return {
                                tag: 'option',
                                innerText: profile.name,
                                value: profile.id,
                                selected: profile.id == selected,
                            } as AnyVirtualDOM
                        })
                    },
                },
            },
        ]
    }
}

const bottomNavClasses = 'fv-x-lighter w-100 overflow-auto'
const bottomNavStyle = {
    maxHeight: '800px',
}

/**
 * @category View
 */
export class InstallersView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = bottomNavClasses
    /**
     * @group Immutable DOM Constants
     */
    public readonly style = bottomNavStyle
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor(params: { profilesState: ProfilesState }) {
        const { profilesState } = params

        this.children = [
            {
                source$: combineLatest([
                    profilesState.selectedProfileData$,
                    ProfilesState.getFvCodeMirror$(),
                ]),
                vdomMap: ([profile, cmModule]: [
                    Profile,
                    TsCodeEditorModule,
                ]) => {
                    return new CodeEditorView({
                        profileState: profilesState,
                        CodeEditorModule: cmModule,
                        tsSrc: profile.installers.tsSrc,
                        readOnly: profile.id == 'default',
                        onRun: (editor) => {
                            const parsed =
                                ProfilesState.CodeEditorModule.parseTypescript(
                                    editor.getValue(),
                                )
                            return profilesState.updateProfile(profile.id, {
                                preferences: profile.preferences,
                                installers: parsed,
                            })
                        },
                    })
                },
                untilFirst: spinnerView,
            },
        ]
    }
}

/**
 * @category View
 */
export class PreferencesView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = bottomNavClasses
    /**
     * @group Immutable DOM Constants
     */
    public readonly style = bottomNavStyle
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor(params: { profilesState: ProfilesState }) {
        const { profilesState } = params
        this.children = [
            {
                source$: combineLatest([
                    profilesState.selectedProfileData$,
                    ProfilesState.getFvCodeMirror$(),
                ]),
                vdomMap: ([profile, cmModule]: [
                    Profile,
                    TsCodeEditorModule,
                ]) => {
                    return new CodeEditorView({
                        profileState: profilesState,
                        CodeEditorModule: cmModule,
                        tsSrc: profile.preferences.tsSrc,
                        readOnly: profile.id == 'default',
                        onRun: (editor) => {
                            const parsed =
                                ProfilesState.CodeEditorModule.parseTypescript(
                                    editor.getValue(),
                                )
                            return profilesState.updateProfile(profile.id, {
                                preferences: parsed,
                                installers: profile.installers,
                            })
                        },
                    })
                },
                untilFirst: spinnerView,
            },
        ]
    }
}
