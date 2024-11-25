export const example1 = `
<!DOCTYPE html>
<html lang="en">
    <head><script src="/webpm-client.js"></script></head>
    
    <body id="content"></body>    
    
    <script type="module">
        /*
        Resource installation:
          -  rx-vdom is a UI library powered by reactive programing 
          -  demo_yw_backend is the backend used here
        */
        const {rxDom, client} = await webpm.install({
            esm:['rx-vdom as rxDom'],
            backends:['demo_yw_backend#^0.1.0 as client'],
            displayLoadingScreen: true,
        })
        /*
        The \`client\` variable above hold a generic javascript client for the backend.
        It exposes methods relying either on Promise or Observable.
          -  Promise: await client.fetch('/hello-world').then(() => ...)
          -  Observable: client.fromFetch('/hello-world').subscribe(() => ...)
         The path in method call is the path of the end-point, the API documentation is usually exposed 
         on \`/backends/$NAME/$VERSION/docs\` (for the backend here: \`/backends/demo_yw_backend/0.1.0\`)/
        */
        /*
        An example using Promise, by calling the endpoint \`hello-world\`
        */
        await client.fetch('/hello-world')
            .then((resp) => resp.json())
            .then((resp) => {
                document.body.append(rxDom.render({
                    tag: 'div',
                    children:[{
                        tag:'h3',
                        innerText: "Example of fetching the '/hello-world' endpoint using Promise"
                    },{
                        tag:'div',
                        innerText: 'Response is '+ resp.endpoint
                    }]
                }))
            })
        
        /**
        Some end point return a StreamingResponse, allowing to consume multiple data over time from one endpoint call.
        The data are send using websocket, to consume them:
        */
        document.body.append(rxDom.render({
            tag: 'div',
            children:[{
                tag:'h3',
                innerText: "Example of streaming the '/async-job' response"
            },{
                tag:'div',
                innerText: {
                    // 'client.channel' return an observable that emit items send from the endpoint '/async-job'.
                    source$: client.stream('/async-job'),
                    // This function simply convert the data from 'source$' into the value displayed as 'innerText'.
                    vdomMap: (resp) => resp.data.result
                }
            }]
        }))
        
    </script>
</html>
`
