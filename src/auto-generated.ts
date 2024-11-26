/* eslint-disable */
const runTimeDependencies = {
    "externals": {
        "@floating-ui/dom": "^1.6.3",
        "@w3nest/http-clients": "^0.1.1",
        "@w3nest/rx-code-mirror-editors": "^0.1.0",
        "@w3nest/rx-tree-views": "^0.1.0",
        "@w3nest/webpm-client": "^0.1.0",
        "bootstrap": "^5.3.0",
        "d3": "^7.7.0",
        "mkdocs-ts": "^0.1.1",
        "rx-vdom": "^0.1.0",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {
        "d3-dag": "0.8.2"
    }
}
const externals = {
    "@floating-ui/dom": "window['@floating-ui/dom_APIv1']",
    "@w3nest/http-clients": "window['@w3nest/http-clients_APIv01']",
    "@w3nest/rx-code-mirror-editors": "window['@w3nest/rx-code-mirror-editors_APIv01']",
    "@w3nest/rx-tree-views": "window['@w3nest/rx-tree-views_APIv01']",
    "@w3nest/webpm-client": "window['@w3nest/webpm-client_APIv01']",
    "bootstrap": "window['bootstrap_APIv5']",
    "d3": "window['d3_APIv7']",
    "mkdocs-ts": "window['mkdocs-ts_APIv01']",
    "rx-vdom": "window['rx-vdom_APIv01']",
    "rxjs": "window['rxjs_APIv7']",
    "rxjs/fetch": "window['rxjs_APIv7']['fetch']",
    "rxjs/operators": "window['rxjs_APIv7']['operators']"
}
const exportedSymbols = {
    "@floating-ui/dom": {
        "apiKey": "1",
        "exportedSymbol": "@floating-ui/dom"
    },
    "@w3nest/http-clients": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/http-clients"
    },
    "@w3nest/rx-code-mirror-editors": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/rx-code-mirror-editors"
    },
    "@w3nest/rx-tree-views": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/rx-tree-views"
    },
    "@w3nest/webpm-client": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/webpm-client"
    },
    "bootstrap": {
        "apiKey": "5",
        "exportedSymbol": "bootstrap"
    },
    "d3": {
        "apiKey": "7",
        "exportedSymbol": "d3"
    },
    "mkdocs-ts": {
        "apiKey": "01",
        "exportedSymbol": "mkdocs-ts"
    },
    "rx-vdom": {
        "apiKey": "01",
        "exportedSymbol": "rx-vdom"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./main.ts",
    "loadDependencies": [
        "mkdocs-ts",
        "rx-vdom",
        "bootstrap",
        "@w3nest/webpm-client",
        "@w3nest/http-clients",
        "@w3nest/rx-tree-views",
        "@w3nest/rx-code-mirror-editors",
        "@floating-ui/dom",
        "rxjs",
        "d3"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {}

const entries = {
     '@w3nest/co-lab': './main.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@w3nest/co-lab/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@w3nest/co-lab',
        assetId:'QHczbmVzdC9jby1sYWI=',
    version:'0.7.1-wip',
    shortDescription:"The W3Nest's collaborative laboratory application.",
    developerDocumentation:'https://platform.youwol.com/apps/@youwol/cdn-explorer/latest?package=@w3nest/co-lab&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@w3nest/co-lab',
    sourceGithub:'https://github.com/w3nest/co-lab',
    userGuide:'https://l.youwol.com/doc/@w3nest/co-lab',
    apiVersion:'07',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(_:unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@w3nest/co-lab_APIv07`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(_:unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@w3nest/co-lab#0.7.1-wip~dist/@w3nest/co-lab/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@w3nest/co-lab/${entry.name}_APIv07`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
