import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';

/**
 * 点击处理器配置选项
 */
export interface ClickHandlerOptions {
  clickThreshold?: number                    // 拖动判定阈值，默认 3px
  debounceDelay?: number                     // 防抖延迟，默认 0（不防抖）
  raycasterParams?: {                        // Raycaster 自定义参数
    near?: number
    far?: number
    pointsPrecision?: number
  }
  enableDynamicThickness?: boolean           // 是否启用动态描边厚度，默认 true
  minThickness?: number                      // 最小描边厚度，默认 1
  maxThickness?: number                      // 最大描边厚度，默认 10
}

/**
 * 创建模型点击高亮工具（OutlinePass 版）- 优化版
 * 
 * ✨ 功能增强：
 * - 使用 AbortController 统一管理事件生命周期
 * - 支持防抖处理避免频繁触发
 * - 可自定义 Raycaster 参数
 * - 根据相机距离动态调整描边厚度
 * 
 * @param camera 相机
 * @param scene 场景
 * @param renderer 渲染器
 * @param outlinePass 已初始化的 OutlinePass
 * @param onClick 点击回调
 * @param options 可选配置
 * @returns dispose 函数，用于清理事件和资源
 */
export function createModelClickHandler(
  camera: THREE.Camera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  outlinePass: OutlinePass,
  onClick: (object: THREE.Object3D | null, info?: { name?: string; position?: THREE.Vector3; uuid?: string }) => void,
  options: ClickHandlerOptions = {}
) {
  // 配置项
  const {
    clickThreshold = 3,
    debounceDelay = 0,
    raycasterParams = {},
    enableDynamicThickness = true,
    minThickness = 1,
    maxThickness = 10
  } = options

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // 应用 raycaster 自定义参数
  if (raycasterParams.near !== undefined) raycaster.near = raycasterParams.near
  if (raycasterParams.far !== undefined) raycaster.far = raycasterParams.far
  if (raycasterParams.pointsPrecision !== undefined) {
    if (!raycaster.params.Points) {
      raycaster.params.Points = { threshold: raycasterParams.pointsPrecision }
    } else {
      raycaster.params.Points.threshold = raycasterParams.pointsPrecision
    }
  }

  let startX = 0;
  let startY = 0;
  let selectedObject: THREE.Object3D | null = null;
  let debounceTimer: number | null = null;

  // 使用 AbortController 统一管理事件
  const abortController = new AbortController();
  const signal = abortController.signal;

  /** 获取对象及其子 Mesh 列表 */
  function getMeshes(obj: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    obj.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });
    return meshes;
  }

  /** 高亮对象：更新 OutlinePass.selectedObjects 并调整描边厚度 */
  function highlightObject(obj: THREE.Object3D) {
    const meshes = getMeshes(obj);
    outlinePass.selectedObjects = meshes;

    if (enableDynamicThickness) {
      // 动态调整描边厚度，根据相机到模型距离
      const center = new THREE.Vector3();
      obj.getWorldPosition(center);
      const distance = camera.position.distanceTo(center);
      const thickness = Math.min(maxThickness, Math.max(minThickness, 100 / distance));
      outlinePass.edgeThickness = thickness;
    }
  }

  /** 恢复对象高亮（清空 OutlinePass.selectedObjects） */
  function restoreObject() {
    outlinePass.selectedObjects = [];
  }

  /** 鼠标按下记录位置 */
  function handleMouseDown(event: MouseEvent) {
    startX = event.clientX;
    startY = event.clientY;
  }

  /** 鼠标抬起判定点击或拖动（带防抖） */
  function handleMouseUp(event: MouseEvent) {
    const dx = Math.abs(event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);
    if (dx > clickThreshold || dy > clickThreshold) return; // 拖动不触发点击

    // 防抖处理
    if (debounceDelay > 0) {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        processClick(event);
        debounceTimer = null;
      }, debounceDelay);
    } else {
      processClick(event);
    }
  }

  /** 实际的点击处理逻辑 */
  function processClick(event: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      // 点击不同模型，先清除之前高亮
      if (selectedObject && selectedObject !== object) restoreObject();

      selectedObject = object;
      // highlightObject(selectedObject); // 可选：是否自动高亮

      onClick(selectedObject, {
        name: selectedObject.name || '未命名模型',
        position: selectedObject.getWorldPosition(new THREE.Vector3()),
        uuid: selectedObject.uuid
      });
    } else {
      // 点击空白 → 清除高亮
      if (selectedObject) restoreObject();
      selectedObject = null;
      onClick(null);
    }
  }

  // 使用 AbortController 的 signal 注册事件
  renderer.domElement.addEventListener('mousedown', handleMouseDown, { signal });
  renderer.domElement.addEventListener('mouseup', handleMouseUp, { signal });

  /** 销毁函数：解绑事件并清除高亮 */
  return () => {
    // 清理防抖定时器
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // 一次性解绑所有事件
    abortController.abort();
    // 清除高亮
    restoreObject();
    // 清空引用
    selectedObject = null;
  };
}

