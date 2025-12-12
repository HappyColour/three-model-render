<template>
    <div id="three-model-render">
        <div ref="containerRef" class="three-container" />
        <div id="explode">
            <button v-if="!exploded" @click="explode">EXPLODE</button>
            <button v-else @click="restore">RESTORE</button>
        </div>
        <div id="setView">
            <select v-model="selectedView" @change="changeView" class="view-select">
                <option value="front">FRONT</option>
                <option value="back">BACK</option>
                <option value="left">LEFT</option>
                <option value="right">RIGHT</option>
                <option value="top">TOP</option>
                <option value="iso">ISO</option>
            </select>
        </div>

        <Transition name="modal">
            <div v-show="modalShow" class="modal-overlay" @click.self="modalShow = false">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3 class="modal-title">{{ modalTitle }}</h3>
                        <button class="close-btn" @click="modalShow = false">×</button>
                    </div>
                    <div class="modal-body">
                        <pre v-if="typeof modalContent === 'object'" class="json-content">{{ JSON.stringify(modalContent, null, 2) }}</pre>
                        <p v-else>{{ modalContent }}</p>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { loadModelByUrl,disposeObject } from '@chocozhang/three-model-render';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { followModels, FOLLOW_ANGLES } from '@chocozhang/three-model-render';
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render/setup';
import { setView } from '@chocozhang/three-model-render';
import { initPostProcessing } from '@chocozhang/three-model-render';
import { enableHoverBreath } from '@chocozhang/three-model-render';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { createModelClickHandler } from '@chocozhang/three-model-render';
import { GroupExploder } from '@chocozhang/three-model-render'

const containerRef = ref<HTMLDivElement | null>(null)
let scene!: THREE.Scene
let camera!: THREE.PerspectiveCamera
let renderer!: THREE.WebGLRenderer
let controls!: OrbitControls
let model!: THREE.Object3D
const modelUrl: string = 'https://happycolour.github.io/gorilla_tag_map.glb'
const selectedView = ref<'front' | 'back' | 'left' | 'right' | 'top' | 'iso'>('front')
let ppManager!: ReturnType<typeof initPostProcessing>
let composer!: EffectComposer
let outlinePass!: OutlinePass
let hoverController: ReturnType<typeof enableHoverBreath> | null = null
let disposeClickHandler: () => void
const modalShow = ref(false)
const modalTitle = ref('')
const modalContent = ref<any>('')
let exploder!: GroupExploder
let explosionTargets = new Set<THREE.Mesh>()
let exploded = ref(false)
let animationId: number | any

onMounted(() => {
    initScene()
    initCamera()
    initRenderer()
    initControl()
    initLoadModel(modelUrl)
    initHoverBreath()
    initClickHandler()
    initGroupExploder()
    animate()
})

function initScene(){
    scene = new THREE.Scene()
}

function initCamera(){
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
}

function initRenderer(){
    renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.value?.appendChild(renderer.domElement)
}

function initControl() {
	controls = new OrbitControls(camera, renderer.domElement)
	controls.enableDamping = true
	controls.dampingFactor = 0.05
	controls.enableZoom = true
}

async function initLoadModel(modelUrl: string) {
    model = await loadModelByUrl(modelUrl, {
        manager: new THREE.LoadingManager(() => {
            console.log('Loading complete')
        })
    })
    scene?.add(model)
    autoSetupCameraAndLight(camera, scene, model)
    followModels(camera, model, {
        ...FOLLOW_ANGLES.FRONT, // default ISOMETRIC
        duration: 1500,
        padding: 0.6,
        controls,
        easing: 'easeInOut'
    })
    model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            const mesh = child as THREE.Mesh
            if(mesh.name === 'Slide_metalbare_1_0') {
                explosionTargets.add(mesh)
            }
            if(mesh.name === 'Ladder_1_metalbare_1_0') {
                explosionTargets.add(mesh)
            }
            if(mesh.name === 'Ladder_1_metalpattern001_0') {
                explosionTargets.add(mesh)
            }
        }
    })
}

function animate() {
    animationId = requestAnimationFrame(animate)
    controls?.update()
    renderer.render(scene, camera)
    composer?.render()
}

function changeView() {
    setView(camera, controls, model, selectedView.value)
}

function initHoverBreath() {
    ppManager = initPostProcessing(renderer, scene, camera, {
        resolutionScale: 0.8, // 性能优化
		edgeStrength: 4,
		visibleEdgeColor: '#ffee00'
    })
    composer = ppManager.composer
    outlinePass = ppManager.outlinePass
    // const inititalNames = []
    hoverController = enableHoverBreath({
        camera,
		scene,
		renderer,
		outlinePass,
		// highlightNames: inititalNames,
		throttleDelay: 16, // ✨ 60fps节流
		minStrength: 2,
		maxStrength: 8,
		speed: 3
    })
}

function initClickHandler() {
    disposeClickHandler = createModelClickHandler(camera, scene, renderer, outlinePass, (object, info) => {
        console.log('object', object)
        console.log('info', info)
        followModels(camera, object, {
            ...FOLLOW_ANGLES.ISOMETRIC, // default ISOMETRIC
            duration: 1500,
            padding: 0.5,
            controls,
            easing: 'easeInOut'
        })
        modalTitle.value = info?.uuid || 'undefined'
		modalContent.value = info
		modalShow.value = true
    })
}

function initGroupExploder() {
    exploder = new GroupExploder(scene, camera, controls)
    exploder.init()
}

function explode() {
    exploded.value = true
    exploder.setMeshes(explosionTargets, { autoRestorePrev: true })
    exploder.explode({ mode: 'grid', spacing: 2.8, duration: 1100, lift: 1.2, cameraPadding: 0.8, dimOthers: { enabled: true, opacity: 0.1 } })
}

function restore() {
    exploded.value = false
    exploder.restore(600)
}

onBeforeUnmount(() => {
    disposeObject(model)
    disposeClickHandler && disposeClickHandler()
	hoverController?.dispose()
    exploder?.dispose()
    ppManager?.dispose()
    if (animationId != null) {
		cancelAnimationFrame(animationId)
		animationId = null
	}
    controls?.dispose()
    if (scene && scene.traverse) {
		scene.traverse(obj => {
			if (!(obj instanceof THREE.Object3D)) return

			// geometry
			// @ts-ignore
			if (obj.geometry) {
				try {
					;(obj.geometry as THREE.BufferGeometry).dispose()
				} catch (e) {}
			}

			// material
			// @ts-ignore
			const material = (obj as THREE.Mesh).material
			if (material) {
				const mats = Array.isArray(material) ? material : [material]
				mats.forEach((mat: any) => {
					for (const key in mat) {
						if (Object.prototype.hasOwnProperty.call(mat, key)) {
							const value = mat[key]
							if (value && typeof value === 'object' && 'dispose' in value) {
								try {
									value.dispose()
								} catch (e) {}
							}
						}
					}
					try {
						mat.dispose()
					} catch (e) {}
				})
			}
		})
	}
    try {
		renderer?.forceContextLoss?.()
		if (renderer?.domElement && renderer.domElement.parentNode) {
			renderer.domElement.parentNode.removeChild(renderer.domElement)
		}
		renderer?.dispose?.()
	} catch (e) {}

	scene = null as any
	renderer = null as any
	controls = null as any
	composer = null as any
	outlinePass = null as any
})
</script>

<style scoped>
.three-container {	
    position: absolute;
    top: 0;
    left: 0;
	width: 100vw;
	height: 100vh;
	display: block;
	overflow: hidden;
}
#setView{
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1;
}
#explode {
    position: fixed;
    top: 20px;
    right: 120px;
    z-index: 1;
}
#explode button{
    padding: 10px;
    outline: none;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    width: 85px;
    backdrop-filter: blur(10px);
    cursor: pointer;    
}
.view-select {
    padding: 10px;
    outline: none;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    backdrop-filter: blur(10px);
    cursor: pointer;
}

.view-select option {
    background: #333;
    color: white;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    right: 0; 
    bottom: 0;
    left: 0;
    background: transparent; /* No blocking background */
    display: flex;
    justify-content: flex-end; /* Align to right */
    align-items: stretch; /* Full height */
    z-index: 100;
    pointer-events: none; /* Allow clicking through overlay area */
}

.modal-card {
    background: rgba(25, 25, 35, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px 0 0 24px; /* Rounded only on left */
    padding: 30px;
    width: 400px;
    max-width: 90%;
    height: 100%; /* Full height */
    color: #fff;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
    pointer-events: auto; /* Re-enable clicks on card */
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 15px;
    flex-shrink: 0;
}

.modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #00c6fb 0%, #005bea 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
}

.close-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: rotate(90deg);
}

.modal-body {
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 5px; /* Adjust for scrollbar */
}

.json-content {
    background: rgba(0, 0, 0, 0.3);
    padding: 15px;
    border-radius: 12px;
    font-family: 'Fira Code', monospace;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-all;
    color: #a5b3ce;
    margin: 0;
}

/* Animations - Slide Right */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    /* transform: translateX(100%);  Note: Wrapper transition might need adjustment for absolute position, but here we animate opacity/transform of child usually. 
       Vue transition wrapper applies classes to the root element inside <Transition>. 
       Since .modal-overlay is the root, animating it might fade the whole thing.
       We want to slide the CARD. Best practice: transition wrapper on Card or use nested transition. 
       However, simplified: slide the whole overlay if it was just the card, but overlay is fixed.
       
       Better approach for this structure: Animate transparency of overlay (if any) and Transform of card.
       But here 'modal-overlay' IS the transition root. 
    */
}

.modal-enter-active .modal-card {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-leave-active .modal-card {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
    transform: translateX(100%);
    opacity: 0;
}
</style>