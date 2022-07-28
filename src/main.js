import * as THREE from 'three'
import { GUI } from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Tmrt } from './tmrt.js'

import * as model from './blocky_human.glb'

const resizeRendererToDisplaySize = function (renderer) {
    const canvas = renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    if (needResize) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        renderer.setSize(width, height, false)
    }
    return needResize
}

const absGrad = (t) => {
    const gradiant = [{ color: '0059F2', t: -200 },
    { color: '0059F2', t: -40 }, { color: '60B7FF', t: 0 },
    { color: '8DFF71', t: 20 }, { color: 'FFF73F', t: 40 }, { color: 'FF6E2F', t: 65 },
    { color: 'EA4430', t: 90 }, { color: 'EA4430', t: 200 },]

    let range = []
    for (const [i, point] of gradiant.entries()) {
        if (t <= point.t) {
            range.push(gradiant[i - 1])
            range.push(point)
            break
        }
    }
    let ratio = (t - range[0].t) / (range[1].t - range[0].t)
    let colors = range.map(v => new THREE.Color(`#${v.color}`))
    let result = new THREE.Color()
    result.lerpColors(...colors, ratio)
    return result
}

let camera, scene, renderer, clock, gui
let human, room


const room_dim = {
    l: 2,
    w: 2,
    h: 2
}

const surface_args = {
    ceil: { t: 22, e: 1 },
    floor: { t: 22, e: 1 },
    l_wall: { t: 22, e: 1 },
    r_wall: { t: 22, e: 1 },
    f_wall: { t: 22, e: 1 },
    b_wall: { t: 22, e: 1 },
}

const human_dim = {
    h: 1245.45 / 1000,
    w: 342.9 / 1000,
    l: 794.6 / 1000,
    x: 0,
    y: 0,
    rot: 0
}

const trans = {
    mode: 0,
    mrt: {},
    vfs: {}
}

trans.updateTMRT = () => {
    [trans.mrt, trans.vfs] = Tmrt.calc(room_dim, surface_args, human_dim)
    for (let k in trans.mrt) {
        let value = '-'
        if (trans.mrt[k]) {
            value = trans.mrt[k]
        }
        let theSpan = document.getElementById(k)
        theSpan.innerHTML = value
        theSpan.setAttribute('style', `background-color:${absGrad(value).getStyle()}`)
    }
}

trans.down = () => {
    const downloadJson = (fileName, json) => {
        const jsonStr = (json instanceof Object) ? JSON.stringify(json, null, 4) : json

        const url = window.URL || window.webkitURL || window
        const blob = new Blob([jsonStr])
        const saveLink = document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
        saveLink.href = url.createObjectURL(blob)
        saveLink.download = fileName
        saveLink.click()
    }
    switch (trans.mode) {
        case 0:
            downloadJson('Tmrt.json', trans.mrt)
            break
        case 1:
            downloadJson('ViewFactors.json', trans.vfs)
            break;
    }
}

init()
animate()

function initAndLoadHuman() {
    let loader = new GLTFLoader()

    loader.load(
        './blocky_human.glb',
        function (gltf) {
            //console.log(gltf)
            let geometry = gltf.scene.children[0].children[0].geometry
            const material = new THREE.MeshPhongMaterial({ color: 0x5555EE, })//transparent: true, opacity: 0.5 })
            const human_mesh = new THREE.Mesh(geometry, material)
            human = human_mesh
            scene.add(human_mesh)
        }
    )
}

function initRoom() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const common_material = new THREE.MeshPhongMaterial({ color: 0xF0EBE6, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    const highlight_material = new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide })

    const materials = []
    for (let i = 0; i < 6; i++) {
        materials.push(common_material)
    }
    materials.push(highlight_material)

    const room_mesh = new THREE.Mesh(geometry, materials)

    return room_mesh
}

function initInstance() {
    human = initAndLoadHuman()

    room = initRoom()
    scene.add(room)
}

function clamp(v, minv, maxv) {
    if (v < minv) return minv
    if (v > maxv) return maxv
    return v
}

function initGUI() {
    gui = new GUI()

    const folder0 = gui.addFolder("Misc")
    folder0.add(trans, 'mode', { 'TMRT': 0, 'View Factors': 1 }).name('Mode')
    folder0.add(trans, 'down').name('Download Result')

    const folder1 = gui.addFolder("Room Dimensions")
    folder1.add(room_dim, "l", 2, 10, 0.01).name("Length")
    folder1.add(room_dim, "w", 2, 10, 0.01).name("Width")
    folder1.add(room_dim, "h", 2, 10, 0.01).name("Height")


    const folder2 = gui.addFolder("Human Position:")
    folder2.add(human_dim, "x", -.5, .5, 0.01).name("X").listen()
    folder2.add(human_dim, "y", -.5, .5, 0.01).name("Y").listen()
    folder2.add(human_dim, "rot", { 0: 0, 90: 1, 180: 2, 270: 3 }).name("Rotation")

    const updateRange = _ => {
        let xmax = (room_dim.w / 2 - human_dim.l)
        let ymax = (room_dim.l / 2 - human_dim.l)
        human_dim.x = clamp(human_dim.x, -xmax, xmax)
        human_dim.y = clamp(human_dim.y, -ymax, ymax)
        folder2.controllers[0].min(-xmax).max(xmax)
        folder2.controllers[1].min(-ymax).max(ymax)
    }
    folder1.onChange(updateRange)
    updateRange()

    const folder3 = gui.addFolder("Surfaces Settings")
    const surface_floders = { ceil: "Ceiling", floor: "Floor", l_wall: "Left Wall", r_wall: "Right Wall", f_wall: "Front Wall", b_wall: "Back Wall" }
    const surface_order = { l_wall: 0, r_wall: 1, ceil: 2, floor: 3, f_wall: 4, b_wall: 5 }

    for (let type in surface_floders) {
        let folder = folder3.addFolder(surface_floders[type])
        folder.add(surface_args[type], "t", -50, 100, 0.01).name("Temperature(Celsius):")
            .onChange(value => {
                let order = surface_order[type]
                if (room.material[order] == room.material[(order + 1) % 6]) {
                    room.material[order] = room.material[6]//The senventh material is the hightlight
                }
                room.material[order].color.copy(absGrad(value))
            })
            .onFinishChange(_ => {
                let order = surface_order[type]
                room.material[order] = room.material[(order + 1) % 6]

            })
        folder.add(surface_args[type], "e", 0, 1, 0.01).name("Emissivity:")
    }

    gui.onChange(trans.updateTMRT)
    trans.updateTMRT()
}

function init() {
    const container = document.createElement('div')
    document.body.appendChild(container)

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
    camera.position.set(18, 6, 18)
    camera.layers.enableAll()
    camera.lookAt(0, 1, 0)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    scene.fog = new THREE.Fog(0xf0f0f0, 50, 100)

    clock = new THREE.Clock()

    // ground
    {
        const geometry = new THREE.PlaneGeometry(500, 500)
        const material = new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })

        const ground = new THREE.Mesh(geometry, material)
        ground.position.set(0, -0.003, 0)
        ground.rotation.x = - Math.PI / 2
        ground.receiveShadow = true
        scene.add(ground)

        const grid = new THREE.GridHelper(500, 100, 0x000000, 0x000000)
        grid.position.y = -0.002
        grid.material.opacity = 0.12
        grid.material.transparent = true
        scene.add(grid)

        const grid2 = new THREE.GridHelper(10, 10, 0x000000, 0x000000)
        grid2.position.y = -0.001
        grid2.material.opacity = 0.12
        grid2.material.transparent = true
        scene.add(grid2)
    }

    // lights
    {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
        hemiLight.position.set(0, 200, 0)
        scene.add(hemiLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
        dirLight.position.set(0, 20, 10)
        dirLight.castShadow = true
        dirLight.shadow.camera.top = 18
        dirLight.shadow.camera.bottom = -10
        dirLight.shadow.camera.left = - 12
        dirLight.shadow.camera.right = 12
        scene.add(dirLight)
    }

    //
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    //
    const controls = new OrbitControls(camera, renderer.domElement)
    //controls.enablePan = false
    controls.minDistance = 5
    controls.maxDistance = 50
    controls.target.y = 1
    controls.update()

    //
    initInstance()
    initGUI()
}

function animate() {
    requestAnimationFrame(animate)
    //updateInstances(clock.getElapsedTime())
    const time = clock.getElapsedTime()

    room.scale.x = room_dim.w
    room.scale.y = room_dim.h
    room.scale.z = room_dim.l
    room.position.y = room_dim.h / 2
    if (human) {
        human.position.set(human_dim.x, 0, human_dim.y)
        human.rotation.set(0, human_dim.rot / 2 * Math.PI, 0)
    }
    render()
}

function render() {
    renderer.render(scene, camera)
}