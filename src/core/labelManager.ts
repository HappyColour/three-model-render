import * as THREE from 'three';

interface LabelOptions {
  fontSize?: string;       // 标签字体大小
  color?: string;          // 字体颜色
  background?: string;     // 背景颜色
  padding?: string;        // 内边距
  borderRadius?: string;   // 圆角
  updateInterval?: number; // 更新间隔（ms），默认每帧更新，设置后按间隔更新
  enableCache?: boolean;   // 是否启用包围盒缓存，默认 true
}

interface LabelManager {
  pause: () => void;
  resume: () => void;
  dispose: () => void;
  isRunning: () => boolean;
}

/**
 * 给子模型添加头顶标签（支持 Mesh 和 Group）- 优化版
 * 
 * ✨ 性能优化：
 * - 缓存包围盒，避免每帧重复计算
 * - 支持暂停/恢复更新
 * - 可配置更新间隔，降低 CPU 占用
 * - 只在可见时更新，隐藏时自动暂停
 * 
 * @param camera THREE.Camera - 场景摄像机
 * @param renderer THREE.WebGLRenderer - 渲染器，用于屏幕尺寸
 * @param parentModel THREE.Object3D - FBX 根节点或 Group
 * @param modelLabelsMap Record<string,string> - 模型 name → 标签文字 映射表
 * @param options LabelOptions - 可选标签样式配置
 * @returns LabelManager - 包含 pause/resume/dispose 的管理接口
 */
export function addChildModelLabels(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  parentModel: THREE.Object3D,
  modelLabelsMap: Record<string, string>,
  options?: LabelOptions
): LabelManager {
  // 防御性检查：确保 parentModel 已加载
  if (!parentModel || typeof parentModel.traverse !== 'function') {
    console.error('parentModel 无效，请确保 FBX 模型已加载完成');
    return {
      pause: () => { },
      resume: () => { },
      dispose: () => { },
      isRunning: () => false
    };
  }

  // 配置项
  const enableCache = options?.enableCache !== false;
  const updateInterval = options?.updateInterval || 0;

  // 创建标签容器，绝对定位，放在 body 中
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.pointerEvents = 'none'; // 避免阻挡鼠标事件
  container.style.zIndex = '1000';
  document.body.appendChild(container);

  // 保存每个标签对应的模型对象及缓存的包围盒
  interface LabelData {
    object: THREE.Object3D;
    el: HTMLDivElement;
    cachedBox: THREE.Box3;
    cachedTopPos: THREE.Vector3;
    needsUpdate: boolean;
  }
  const labels: LabelData[] = [];

  // 状态管理
  let rafId: number | null = null;
  let isPaused = false;
  let lastUpdateTime = 0;

  // 遍历所有子模型
  parentModel.traverse((child: any) => {
    // 只处理 Mesh 或 Group
    if ((child.isMesh || child.type === 'Group')) {
      // 动态匹配 name，防止 undefined
      const labelText = Object.entries(modelLabelsMap).find(([key]) => child.name.includes(key))?.[1];
      if (!labelText) return; // 没有匹配标签则跳过

      // 创建 DOM 标签
      const el = document.createElement('div');
      el.innerText = labelText;

      // 样式直接在 JS 中定义，可通过 options 覆盖
      el.style.position = 'absolute';
      el.style.color = options?.color || '#fff';
      el.style.background = options?.background || 'rgba(0,0,0,0.6)';
      el.style.padding = options?.padding || '4px 8px';
      el.style.borderRadius = options?.borderRadius || '4px';
      el.style.fontSize = options?.fontSize || '14px';
      el.style.transform = 'translate(-50%, -100%)'; // 让标签在模型正上方
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'none';
      el.style.transition = 'opacity 0.2s ease';

      // 加入容器
      container.appendChild(el);

      // 初始化缓存
      const cachedBox = new THREE.Box3().setFromObject(child);
      const center = new THREE.Vector3();
      cachedBox.getCenter(center);
      const cachedTopPos = new THREE.Vector3(center.x, cachedBox.max.y, center.z);

      labels.push({
        object: child,
        el,
        cachedBox,
        cachedTopPos,
        needsUpdate: true
      });
    }
  });

  /**
   * 更新缓存的包围盒（仅在模型变换时调用）
   */
  const updateCache = (labelData: LabelData) => {
    labelData.cachedBox.setFromObject(labelData.object);
    const center = new THREE.Vector3();
    labelData.cachedBox.getCenter(center);
    labelData.cachedTopPos.set(center.x, labelData.cachedBox.max.y, center.z);
    labelData.needsUpdate = false;
  };

  /**
   * 获取对象顶部世界坐标（使用缓存）
   */
  const getObjectTopPosition = (labelData: LabelData): THREE.Vector3 => {
    if (enableCache) {
      // 检查对象是否发生变换
      if (labelData.needsUpdate || labelData.object.matrixWorldNeedsUpdate) {
        updateCache(labelData);
      }
      return labelData.cachedTopPos;
    } else {
      // 不使用缓存，每次都重新计算
      const box = new THREE.Box3().setFromObject(labelData.object);
      const center = new THREE.Vector3();
      box.getCenter(center);
      return new THREE.Vector3(center.x, box.max.y, center.z);
    }
  };

  /**
   * 更新标签位置函数
   */
  function updateLabels(timestamp: number = 0) {
    // 检查是否暂停
    if (isPaused) {
      rafId = null;
      return;
    }

    // 检查更新间隔
    if (updateInterval > 0 && timestamp - lastUpdateTime < updateInterval) {
      rafId = requestAnimationFrame(updateLabels);
      return;
    }
    lastUpdateTime = timestamp;

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    labels.forEach((labelData) => {
      const { el } = labelData;
      const pos = getObjectTopPosition(labelData); // 使用缓存的顶部坐标
      pos.project(camera); // 转到屏幕坐标

      const x = (pos.x * 0.5 + 0.5) * width; // 屏幕 X
      const y = (-(pos.y * 0.5) + 0.5) * height; // 屏幕 Y

      // 控制标签显示/隐藏（摄像机后方隐藏）
      const isVisible = pos.z < 1;
      el.style.opacity = isVisible ? '1' : '0';
      el.style.display = isVisible ? 'block' : 'none';
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`; // 屏幕位置
    });

    rafId = requestAnimationFrame(updateLabels); // 循环更新
  }

  // 启动更新
  updateLabels();

  /**
   * 暂停更新
   */
  const pause = () => {
    isPaused = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  /**
   * 恢复更新
   */
  const resume = () => {
    if (!isPaused) return;
    isPaused = false;
    updateLabels();
  };

  /**
   * 检查是否正在运行
   */
  const isRunning = () => !isPaused;

  /**
   * 清理函数：卸载所有 DOM 标签，取消动画，避免内存泄漏
   */
  const dispose = () => {
    pause();
    labels.forEach(({ el }) => {
      if (container.contains(el)) {
        container.removeChild(el);
      }
    });
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    labels.length = 0;
  };

  return {
    pause,
    resume,
    dispose,
    isRunning
  };
}
