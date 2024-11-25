export const example1 = `
<!DOCTYPE html>
<html lang="en">
    <head><script src="/webpm-client.js"></script></head>
    
    <body id="content"></body>    
    
    <script type="module">
        //-------------
        // Dependencies
        //-------------
        const {rxDom, client, pyodide, rxjs} = await webpm.install({
            modules:[
                'rx-vdom as rxDom', 
                'three#0.128.0 as THREE', 
                'three-trackballcontrols#0.0.8 as TrackballControls',
                'rxjs#7.5.6 as rxjs',
                'tweakpane#^4.0.1 as TP',
                'chroma-js#^2.4.2 as chroma'
            ],
            backends:['pyscf_backend#^0.1.0 as client'],
            pyodide:{
                version:'0.25.0',
                modules:["numpy", "scikit-image"]
            },
            css: [
                'bootstrap#^4.4.0~bootstrap.min.css',                
                'fontawesome#5.12.1~css/all.min.css', 
                '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css'
            ],
            displayLoadingScreen: true,
        })
        //---------------
        // Atomic systems
        //---------------
        const atoms = {
            Water: \`
        O 0.00000000,  0.000000,  0.500000 \\n H 0.761561, 0.478993, 0.50000000 \\n H -0.761561, 0.478993, 0.50000000\`,
            Cafeine: \`
        C -0.0171 1.4073 0.0098 \\n C 0.0021 -0.0041 0.0020 \\n C 1.1868 2.1007 0.0020 \\n N -1.0133 2.3630 0.0190
        N 2.3717 1.3829 -0.0136 \\n N 0.8932 3.4034 0.0118 \\n N 1.1884 -0.6467 -0.0128 \\n O -1.0401 -0.6344 0.0090
        C 2.3458 0.0368 -0.0214 \\n C 3.6549 2.0897 -0.0220 \\n C 1.2155 -2.1115 -0.0209 \\n O 3.3959 -0.5761 -0.0355
        C -0.4053 3.5654 0.0231 \\n C -2.4574 2.1166 0.0226 \\n H 3.9831 2.2592 1.0035 \\n H 4.3975 1.4884 -0.5465
        H 3.5388 3.0475 -0.5293 \\n H 1.2124 -2.4692 -1.0505 \\n H 2.1169 -2.4610 0.4825 \\n H 0.3373 -2.4940 0.4993
        H -0.9129 4.5186 0.0303 \\n H -2.8119 2.0494 1.0512 \\n H -2.9671 2.9358 -0.4846 \\n H -2.6677 1.1812 -0.4960
        \`
        }
        //----------------
        // Parameters
        //----------------
        const compute$ = new rxjs.BehaviorSubject(true)
        const isoValue$ = new rxjs.BehaviorSubject(50)
        const resolution$ = new rxjs.BehaviorSubject(80)
        const colorScale$ = new rxjs.BehaviorSubject('YlNavy')
        const opacity$ = new rxjs.BehaviorSubject(0.85)
        const molecule$ = new rxjs.BehaviorSubject('Water')
        const method$ = new rxjs.BehaviorSubject('rhf')
        const basis$ = new rxjs.BehaviorSubject('6-31G*')
        const params = {
            isoPercent: isoValue$.value,
            resolution: resolution$.value,
            colorScale: colorScale$.value,
            opacity: opacity$.value,
            molecule: molecule$.value,
            basis: basis$.value,
            method: method$.value
        }
        const methodsBody = {
            'rhf': { type: 'scf.rhf' },
            'dft-b3lyp': { type: 'dft.rks', params: { xc:'b3lyp' }},
        }
        const colorsMaps = {
            'YlNavy': chroma.scale(['yellow', 'navy']).domain([100, 0]).mode('lab'),
            'Spectral': chroma.scale('Spectral').domain([100,0])
        }
        
        //----------------
        // Utilities
        //----------------
        pyodide.runPython(\`
        import numpy as np
        from skimage import measure

        def prepare_data(array_buffer, cube_info):
            shape = cube_info.to_py()['shape']
            r = np.asarray(array_buffer)
            return r.reshape(shape)
      
        def iso_surface(prepared_data, target_percent, cube_info):
            cube_info = cube_info.to_py()
            shape = np.array(cube_info['shape'])
            min_corner = np.array(cube_info['min'])
            max_corner = np.array(cube_info['max'])
            spacing = (max_corner - min_corner) / (shape - 1)
            level = 10**( -7 + 8*(target_percent/100))
            verts, faces, normals, values =  measure.marching_cubes(prepared_data, level=level, spacing=spacing)
            verts = verts + min_corner
            return verts.tolist(), faces.tolist(), normals.tolist()
        \`)
        function fetch$(url, body){
            return client.fromFetch(
                url, 
                { method: 'post', body: JSON.stringify(body), headers: { "Content-Type": "application/json"}}
            )
        }
        function createEmptyThreeScene() {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 50;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); 
            directionalLight.position.set(1, 1, 1);
            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5); 
            directionalLight2.position.set(-1, -1, -1);
            
            scene.add(ambientLight, directionalLight, directionalLight2);
            return [scene, camera]
        }
        
        
        const [scene, camera] = createEmptyThreeScene();
        
        //----------------
        // HTML views
        //----------------
        function createCtrlPane(){
            const pane = new TP.Pane()
            
            
            const computations = pane.addFolder({title: 'Computations'});
            computations.addBinding(
                params, 'molecule', 
                { options: { Water: 'Water', Cafeine: 'Cafeine' }}
            ).on('change', (ev)=> molecule$.next(ev.value));
            
            computations.addBinding(
                params, 'method', 
                { options: { "rhf": "rhf", "dft-b3lyp": "dft-b3lyp"}}
            ).on('change', (ev)=> method$.next(ev.value));
            
            computations.addBinding(
                params, 'basis', 
                { options: { "STO-3G": "STO-3G", "6-31G*": "6-31G*", "6-311+G(2d,p)": "6-311+G(2d,p)" }}
            ).on('change', (ev)=> basis$.next(ev.value));
             
            computations.addBinding(
                params, 'resolution',                
                {min: 50, max: 200, step: 5}
            ).on('change', (ev) =>  resolution$.next(ev.value));
            
            computations.addButton({ title: 'Compute' }).on('click', () => {
                compute$.next(true)                           
            });
            
            const iso = pane.addFolder({title: 'Iso-surface'});
            iso.addBinding(
                params, 'isoPercent',
                {min: 0, max: 100, step: 1}
            ).on('change', (ev) => isoValue$.next(ev.value));
            
            iso.addBinding(
                params, 'colorScale', 
                { options: { YlNavy: 'YlNavy', Spectral: 'Spectral' }}
            ).on('change', (ev)=> colorScale$.next(ev.value));
            
            iso.addBinding(
                params, 'opacity',                
                {min: 0, max: 1, step: 0.1}
            ).on('change', (ev) =>  opacity$.next(ev.value));
            
            iso.addButton({ title: 'Pin' }).on('click', () => {
                const obj = scene.children.find( mesh => mesh.userData?.tmp )
                obj.userData.tmp = false                             
            });
            return pane.element
        }
        const computeBanner = (message) => ({
            tag: 'div',
            class: 'text-light d-flex align-items-center',
            style:{
                position:'absolute', 
                top:'10px', 
                left: '10px'
            },
            children:[
                { tag: 'div', class: 'fas fa-cog fa-spin me-2'},
                { tag: 'div', innerText: message },
            ]
        })
        
        const computingMessage$ = new rxjs.BehaviorSubject('')
        
        const vDOM = {
            tag: 'div',
            class: 'h-100 w-100 d-flex flex-column',
            children:[
                {
                    tag: 'div',
                    style:{
                        position:'absolute', 
                        width:'fit-content', 
                        top:'10px', 
                        right: '10px'
                    },
                    children:[
                        createCtrlPane()
                    ]
                },
                {    source$: computingMessage$,
                     vdomMap: (m) => m !== '' ? computeBanner(m) : {}
                },
                {
                    tag: 'div',
                    class:'flex-grow',
                    connectedCallback:(elem) => {
                        const renderer = new THREE.WebGLRenderer();
                        renderer.setSize(window.innerWidth, window.innerHeight);
                        elem.appendChild(renderer.domElement);
                        const controls = new TrackballControls(camera, renderer.domElement);
                        controls.rotateSpeed = 3.0;
                        controls.dynamicDampingFactor = 0.3;
                        function animate() {
                            requestAnimationFrame(animate);
                            controls.update(); // Update controls
                            renderer.render(scene, camera);
                        }
                        animate();
                    }
                }
            ]
        }
        
        //----------------
        // Orchestration
        //----------------
        const result$ = compute$.pipe(
            rxjs.withLatestFrom(molecule$, method$, basis$, resolution$),
            rxjs.tap(([_, molecule, method, basis]) => {
                const children = [...scene.children]
                children.forEach( m => m instanceof THREE.Mesh && scene.remove(m))
                computingMessage$.next('Computing electronic density of ' + molecule + ' using '+ method + ' '+ basis)
            }),
            rxjs.switchMap(([_, molecule, method, basis, resolution]) => fetch$('/cube', {
                mole:{ 
                    atom:atoms[molecule], 
                    basis
                }, 
                bbox: { nx: resolution, ny :resolution, nz: resolution, margin: 3}, 
                method: methodsBody[method]
            })),
            rxjs.switchMap( (cube) => rxjs.from(cube.arrayBuffer()).pipe(
                rxjs.map((buffer) => {
                    const meta = JSON.parse(cube.headers.get('X-Content-Metadata'))
                    return {
                    moleInfo: meta.mole,
                    cubeInfo: meta.cube,
                    cubeBuffer:pyodide.globals.get("prepare_data")(new Float64Array(buffer), meta.cube),
                }})
            )),
            rxjs.shareReplay({bufferSize:1, refCount: true})
        )
        
        rxjs.combineLatest([result$, isoValue$, colorScale$, opacity$]).pipe(
            rxjs.debounceTime(500),
            rxjs.tap(() => computingMessage$.next(\`Generating iso-surface\`))
        ).subscribe(([result, value, colorScale, opacity]) => {
            const out = pyodide.globals.get("iso_surface")(result.cubeBuffer, value, result.cubeInfo)
            const [vertices, faces, normals] = out.toJs()
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices.flat()), 3))
            geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(faces.flat()), 1))
            geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals.flat()), 3))
            let baseMat = { 
                color: colorsMaps[colorScale](value).hex(), specular: 0x111111, shininess: 200, 
                depthWrite: false, depthTest: true, side: THREE.DoubleSide
            } 
            if(opacity!==1){
                baseMat = {...baseMat, transparent: true, opacity, depthWrite: false, depthTest: true}
            }
            const material = new THREE.MeshPhongMaterial(baseMat)                
            const mesh = new THREE.Mesh(geometry, material)
            mesh.name = "iso-surface"
            mesh.userData = { value, tmp: true } 
            mesh.renderOrder = value
            const obj = scene.children.find( mesh => mesh.userData?.tmp )
            obj && scene.remove(obj)  
            scene.add(mesh)
            computingMessage$.next(\`\`)
        })
        
        result$.subscribe((result) => {
            const atomPositions = result.moleInfo.coordinates
            const atomTypes = result.moleInfo.elements
            const display = {
                'C': [0x808080, 0.77], 'N': [0x0000ff, 0.75], 'O': [0xff0000, 0.73], 'H': [0xffffff, 0.37]
            }
            atomPositions.forEach(function(position, index) {
                var options = display[atomTypes[index]];
                var atomMesh = new THREE.Mesh(
                     new THREE.SphereGeometry(options[1], 32, 32), 
                     new THREE.MeshPhongMaterial({ color: options[0], specular: 0x111111, shininess: 200, })
                );
                atomMesh.renderOrder = 0
                atomMesh.position.set(...position);
                scene.add(atomMesh);
            });            
        })
        document.body.appendChild(rxDom.render(vDOM));
        
    </script>
</html>
`
