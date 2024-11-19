import {
    BehaviorSubject,
    combineLatest,
    from,
    Observable,
    of,
    ReplaySubject,
    Subject,
} from 'rxjs'
import { CdnEvent, install } from '@youwol/webpm-client'
import { map, mergeMap, shareReplay, take, tap } from 'rxjs/operators'
import { setup } from '../../../auto-generated'
import {
    PreferencesFacade,
    ChildApplicationAPI,
    Installer,
} from '@youwol/os-core'
import { CdnSessionsStorage, raiseHTTPErrors } from '@w3nest/http-clients'
import { v4 } from 'uuid'
import * as OsCore from '@youwol/os-core'
import { TsCodeEditorModule } from '@youwol/rx-code-mirror-editors'

import * as webpmClient from '@youwol/webpm-client'
import * as httpClients from '@w3nest/http-clients'

const cmInstall = {
    modules: [
        `@youwol/rx-code-mirror-editors#${setup.runTimeDependencies.externals['@youwol/rx-code-mirror-editors']} as codeMirrorEditors`,
    ],
    scripts: [
        'codemirror#5.52.0~mode/javascript.min.js',
        'codemirror#5.52.0~addons/lint/lint.js',
    ],
    css: [
        'codemirror#5.52.0~codemirror.min.css',
        'codemirror#5.52.0~theme/blackboard.min.css',
        'codemirror#5.52.0~addons/lint/lint.css',
    ],
    onEvent: (event) => {
        ProfilesState.cdnEvents$.next(event)
    },
}

export type SettingsFamilies = 'preferences' | 'installers'

export type SettingsContent = Record<
    SettingsFamilies,
    { tsSrc: string; jsSrc: string }
>

export type Profile = { id: string; name: string } & SettingsContent

export type ProfileInfo = {
    customProfiles: { id: string; name: string }[]
    selectedProfile: string
}

/**
 * @category State
 */
export class ProfilesState {
    /**
     * @group Observables
     */
    public readonly profileProcessing$ = new BehaviorSubject(false)
    /**
     * @group Observables
     */
    public readonly profiles$: BehaviorSubject<{ id: string; name: string }[]>

    /**
     * @group Observables
     */
    public readonly selectedProfile$ = new ReplaySubject<string>(1)

    /**
     * @group Observables
     */
    public readonly selectedProfileData$ = new Subject<Profile>()

    /**
     * @group Observables
     */
    public readonly editedProfile$ = new ReplaySubject<Profile>(1)

    /**
     * @group Observables
     */
    public readonly editionMode$ = new BehaviorSubject<boolean>(true)

    /**
     * @group Observables
     */
    static bootstrap$: Observable<WindowOrWorkerGlobalScope>

    /**
     * @group Observables
     */
    static cdnEvents$ = new ReplaySubject<CdnEvent>()

    /**
     * @group Observables
     */
    static fvCodeMirror$: Observable<TsCodeEditorModule>

    /**
     *
     * @group HTTP
     * @private
     */
    private cdnSessionStorage = new CdnSessionsStorage.Client()

    /**
     *
     * @group Lazy Dependencies
     * @private
     */
    static CodeEditorModule: TsCodeEditorModule

    constructor() {
        this.profiles$ = new BehaviorSubject<{ id: string; name: string }[]>([
            { id: 'default', name: 'Default' },
        ])

        new CdnSessionsStorage.Client()
            .getData$({
                packageName: '@youwol/platform',
                dataName: 'profilesInfo',
            })
            .pipe(
                raiseHTTPErrors(),
                map((jsonResp: ProfileInfo) =>
                    jsonResp.customProfiles
                        ? jsonResp
                        : {
                              customProfiles: [],
                              selectedProfile: 'default',
                          },
                ),
            )
            .subscribe((profilesInfo) => {
                this.profiles$.next([
                    { id: 'default', name: 'Default' },
                    ...profilesInfo.customProfiles,
                ])
                this.selectedProfile$.next(profilesInfo.selectedProfile)
            })
        this.selectedProfile$
            .pipe(
                mergeMap((selectedProfile) =>
                    this.getProfileData$(selectedProfile),
                ),
            )
            .subscribe((data) => this.selectedProfileData$.next(data))
    }

    edit() {
        this.editionMode$.next(true)
    }

    newProfile(name: string) {
        const profileId = v4()
        this.profiles$.next([...this.profiles$.value, { name, id: profileId }])

        this.syncProfileInfo(profileId)
        this.profileProcessing$.next(true)
        this.cdnSessionStorage
            .postData$({
                packageName: '@youwol/platform',
                dataName: `customProfile_${profileId}`,
                body: {
                    name,
                    id: profileId,
                    preferences: PreferencesFacade.getDefaultPreferences(),
                    installers: OsCore.Installer.getDefaultInstaller(),
                },
            })
            .subscribe(() => {
                this.selectProfile(profileId)
                this.edit()
                this.profileProcessing$.next(false)
            })
    }

    selectProfile(profileId: string) {
        /* To be used only if the validity of the profile is guaranteed */
        this.selectProfile$(profileId).subscribe()
    }

    selectProfile$(profileId: string) {
        return this.getProfileData$(profileId).pipe(
            mergeMap((resp) => {
                return combineLatest([
                    from(
                        OsCore.PreferencesFacade.setPreferencesScript(
                            resp.preferences,
                        ),
                    ),
                    from(OsCore.Installer.setInstallerScript(resp.installers)),
                ]).pipe(map(() => resp))
            }),
            tap((resp) => {
                this.syncProfileInfo(profileId)
                this.selectedProfileData$.next(resp)
            }),
        )
    }

    deleteProfile(profileId: string) {
        this.profiles$.next(
            [...this.profiles$.value].filter(({ id }) => id != profileId),
        )
        this.syncProfileInfo(profileId)
        this.cdnSessionStorage
            .deleteData$({
                packageName: '@youwol/platform',
                dataName: `customProfile_${profileId}`,
            })
            .subscribe()
    }

    ensureExecutionOk$(settingsContent: SettingsContent) {
        /**
         * This function should somehow be provided by os-core, for now it is implemented here
         */
        const executePreferences = () =>
            new Function(settingsContent.preferences.jsSrc)()({
                webpmClient,
                httpClients,
                platformState: ChildApplicationAPI.getOsInstance(),
            })
        const executeInstallers = () =>
            new Function(settingsContent.installers.jsSrc)()(
                new Installer(),
            ).then((installer) => installer.resolve())

        return from(Promise.all([executePreferences(), executeInstallers]))
    }

    updateProfile(profileId: string, settingsContent: SettingsContent) {
        if (profileId == 'default') {
            return
        }
        const profile = this.profiles$.value.find(({ id }) => id == profileId)
        const obs = this.ensureExecutionOk$(settingsContent).pipe(
            mergeMap(() =>
                this.cdnSessionStorage.postData$({
                    packageName: '@youwol/platform',
                    dataName: `customProfile_${profileId}`,
                    body: {
                        id: profile.id,
                        name: profile.name,
                        preferences: settingsContent.preferences,
                        installers: settingsContent.installers,
                    },
                }),
            ),
            mergeMap(() => this.selectedProfile$),
            take(1),
            mergeMap((selected) =>
                selected === profileId
                    ? this.selectProfile$(profileId)
                    : of({}),
            ),
        )
        return new Promise<void>((resolve, reject) => {
            obs.subscribe(
                () => resolve(),
                (e) => {
                    console.error(
                        'An error occurred while updating the profile',
                        e,
                    )
                    reject(e)
                },
            )
        })
    }

    renameProfile(profileId, newName) {
        if (profileId.id == 'default') {
            return
        }
        const updatedProfiles = this.profiles$.value.map((profile) => {
            if (profile.id === profileId) {
                return { ...profile, name: newName }
            }
            return profile
        })
        this.profiles$.next(updatedProfiles)
        this.syncProfileInfo(profileId)
        this.profileProcessing$.next(true)
        this.getProfileData$(profileId)
            .pipe(
                tap((profileData) => {
                    this.cdnSessionStorage
                        .postData$({
                            packageName: '@youwol/platform',
                            dataName: `customProfile_${profileId}`,
                            body: {
                                name: newName,
                                id: profileId,
                                preferences: profileData.preferences,
                                installers: profileData.installers,
                            },
                        })
                        .subscribe(() => {
                            this.edit()
                            this.profileProcessing$.next(false)
                        })
                }),
            )
            .subscribe()
    }

    duplicateProfile(oldProfileId: string, newName: string) {
        const profileId = v4()
        this.profiles$.next([
            ...this.profiles$.value,
            { name: newName, id: profileId },
        ])

        this.syncProfileInfo(profileId)
        this.profileProcessing$.next(true)
        this.getProfileData$(oldProfileId)
            .pipe(
                tap((profileData) => {
                    this.cdnSessionStorage
                        .postData$({
                            packageName: '@youwol/platform',
                            dataName: `customProfile_${profileId}`,
                            body: {
                                name: newName,
                                id: profileId,
                                preferences: profileData.preferences,
                                installers: profileData.installers,
                            },
                        })
                        .subscribe(() => {
                            this.profileProcessing$.next(false)
                        })
                }),
            )
            .subscribe()
    }

    editProfile(profileId: string) {
        this.getProfileData$(profileId)
            .pipe(tap((resp: Profile) => this.editedProfile$.next(resp)))
            .subscribe()
    }

    private getProfileData$(profileId: string): Observable<Profile> {
        return profileId == 'default'
            ? of({
                  id: 'default',
                  name: 'Default',
                  preferences: PreferencesFacade.getDefaultPreferences(),
                  installers: OsCore.Installer.getDefaultInstaller(),
              } as Profile)
            : (this.cdnSessionStorage
                  .getData$({
                      packageName: '@youwol/platform',
                      dataName: `customProfile_${profileId}`,
                  })
                  .pipe(raiseHTTPErrors()) as unknown as Observable<Profile>)
    }

    private syncProfileInfo(profileId: string) {
        return this.cdnSessionStorage
            .postData$({
                packageName: '@youwol/platform',
                dataName: 'profilesInfo',
                body: {
                    selectedProfile: profileId,
                    customProfiles: this.profiles$.value.filter(
                        ({ id }) => id != 'default',
                    ),
                },
            })
            .subscribe()
    }

    static getBootstrap$() {
        if (ProfilesState.bootstrap$) {
            return ProfilesState.bootstrap$
        }
        ProfilesState.bootstrap$ = from(
            install({ modules: ['bootstrap#^5.3.0'] }),
        ).pipe(shareReplay({ bufferSize: 1, refCount: true }))
        return ProfilesState.getBootstrap$()
    }

    static getFvCodeMirror$() {
        if (ProfilesState.fvCodeMirror$) {
            return ProfilesState.fvCodeMirror$
        }
        ProfilesState.fvCodeMirror$ = from(install(cmInstall)).pipe(
            mergeMap((window) =>
                from(window['codeMirrorEditors'].TypescriptModule()),
            ),
            tap(
                (cm: TsCodeEditorModule) =>
                    (ProfilesState.CodeEditorModule = cm),
            ),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        return ProfilesState.getFvCodeMirror$()
    }
}
