export const example1 = `
<!DOCTYPE html>
<html lang="en">
    <head><script src="/webpm-client.js"></script></head>
    
    <body id="content">
    
    <canvas id="plotCanvas" width="600" height="200"></canvas>
    </body>    
    
    <script type="module">
        const {rxDom, rxjs, pyodide} = await webpm.install({
            pyodide:{
                version:'0.25.0',
                modules:[
                    'numpy'
                ]
            },
            displayLoadingScreen: true,
        })
        const [x, y, count] = pyodide.runPython(\`
import numpy as np

x = np.linspace(0, 4 * np.pi, 100)
[x, np.sin(x) + np.random.normal(0, 0.1, x.shape), 100]
\`).toJs();
         const canvas = document.getElementById('plotCanvas');
         const ctx = canvas.getContext('2d');
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         ctx.beginPath();
         ctx.moveTo(x[0], y[0]);
         for (let i = 1; i < count; i++) {
             ctx.lineTo(x[i] * 50, 100 - y[i] * 50); // Example scaling
         }
         ctx.stroke();
    </script>
</html>
`

export const example2 = `
<!DOCTYPE html>
<html lang="en">
    <head><script src="/webpm-client.js"></script></head>
    
    <body id="content">
        <div id="plot"></div>
    </body>    
    
    <script type="module">
        const {rxDom, rxjs, pyodide} = await webpm.install({
            pyodide:{
                version:'0.25.0',
                modules:[
                    'numpy', 'matplotlib'
                ]
            },
            displayLoadingScreen: true,
        })
        const png_data = pyodide.runPython(\`
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
from PIL import Image
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

x = np.linspace(0, 4 * np.pi, 100)
y = np.sin(x) + np.random.normal(0, 0.1, 100)

fig, ax = plt.subplots()
ax.plot(x, y)
canvas = FigureCanvas(fig)
canvas.draw()

png_output = io.BytesIO()
plt.savefig(png_output, format='png')
plt.close(fig)

png_output.seek(0)
base64.b64encode(png_output.getvalue()).decode('ascii')
\`) 
        const img_element = document.createElement('img')
        img_element.setAttribute('src', \`data:image/png;base64,\${png_data}\`)
        document.getElementById('plot').appendChild(img_element)
    </script>
</html>
`

export const example3 = `
<!DOCTYPE html>
<html lang="en">
    <head><script src="/webpm-client.js"></script></head>
    
    <body id="content">
        <div id="plot"></div>
    </body>    
    
    <script type="module">
        /*
        This example illustrate the usage of workers pools to offload computation in threads.
        A simple approximation of PI is used.
        */
        const WPool = await webpm.installWorkersPoolModule()
        
        const {rxVDOM, rxjs} = await webpm.install({
            esm: ['rx-vdom#^1.0.0 as rxVDOM', 'rxjs#^7.5.6 as rxjs'],
            css: [
                'bootstrap#^4.4.0~bootstrap.min.css',                
                'fontawesome#5.12.1~css/all.min.css', 
                '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css'
            ],
            displayLoadingScreen: true,
        })
        const pool = new WPool.WorkersPool({
            install:{
                pyodide:{
                    version: "0.25.0",
                    modules: [ "numpy" ],
                }
            },
            pool: { startAt: 1, stretchTo: 10 }
        })
        
        const results$ = new rxjs.Subject()
        
        function task({args, workerScope}){
            const {pyodide} = workerScope
            pyodide.registerJsModule('jsModule', {count: args.count})
            return pyodide.runPython(\`
                import numpy as np
                from jsModule import count
                data = np.random.uniform(-0.5, 0.5, size=(count, 2))
                len(np.argwhere(np.linalg.norm(data, axis=1)<0.5)) / count * 4\`)
        }
        
        const scheduleThousandTasks = () => {
            for( let i=0; i<1000; i++){
                pool.schedule({title: 'PI approx.', entryPoint: task, args: {count:100000}})
                    .pipe(last())
                    .subscribe(message => results$.next(message.data.result))
            }
        }
        
        const { scan, buffer, takeWhile, last, filter, map }   = rxjs
        const resultsRate$ = results$.pipe(buffer(rxjs.interval(1000)))
        const sumAndCount$ = results$.pipe(scan(({s, c},e)=>({s:s + e, c: c+1}), {s:0, c:0}))    
        const workerCount$ = pool.workers$.pipe(map( workers => Object.keys(workers).length))
        
        const button = {
            tag: 'div', class:'btn btn-primary w3lab-pointer', innerText: 'start 1000 runs', 
            onclick: scheduleThousandTasks
        }
        const div = rxVDOM.render({
            tag: 'div', 
            class:'p-5',
            children:[
                {
                    source$: workerCount$.pipe( filter((count) => count > 0)),
                    vdomMap: () => button,
                    untilFirst: ({ innerHTML: '<i>Waiting for first worker readyness...</i>' })
                },
                { tag:'div', innerText: workerCount$.pipe( map( count => 'Workers count: '+ count))},
                { tag:'div', innerText: sumAndCount$.pipe( map(({s, c}) => 'Average: '+ s / c ))},
                { tag:'div', innerText: sumAndCount$.pipe( map(({c}) => 'Simulation count: '+ c ))},
                { tag:'div', innerText: resultsRate$.pipe( map(results=> 'Results /s: '+ results.length))},
                pool.view()
            ]
        })
        document.body.appendChild(div)
        await pool.ready()
    </script>
</html>
`
