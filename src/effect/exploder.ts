// src/utils/GroupExploder.ts 
/**
 * GroupExploder - 基于 Three.js 的模型爆炸效果工具（支持 Vue3 + TS）
 * ----------------------------------------------------------------------
 * 该工具用于对指定 Mesh 的集合进行“爆炸 / 还原”动画：
 *  - 仅初始化一次（onMounted）
 *  - 支持动态切换模型并自动还原上一个模型的爆炸状态
 *  - 支持多种排列模式（ring / spiral / grid / radial）
 *  - 支持非爆炸对象自动透明化（dimOthers）
 *  - 支持摄像机自动前置定位到最佳观察点
 *  - 所有动画均采用原生 requestAnimationFrame 实现
 *
 * ----------------------------------------------------------------------
 * 🔧 构造参数
 * ----------------------------------------------------------------------
 * @param scene      Three.js 场景实例
 * @param camera     Three.js 相机（一般为 PerspectiveCamera）
 * @param controls   OrbitControls 控件实例（必须绑定 camera）
 *
 * ----------------------------------------------------------------------
 * 🔥 爆炸参数 ExplodeOptions
 * ----------------------------------------------------------------------
 * 所有参数均可在 explode() 调用时指定，也可设置默认值。
 *
 * type ArrangeMode = 'ring' | 'spiral' | 'grid' | 'radial'
 *
 * @param mode?: ArrangeMode   
 *        爆炸排列方式：
 *        - 'ring'   环形排列（默认）
 *        - 'spiral' 螺旋上升排列
 *        - 'grid'   平面网格排列（规则整齐）
 *        - 'radial' 从中心点向外扩散
 *
 * @param spacing?: number    
 *        相邻爆炸对象之间的间距（默认：2.5）
 *
 * @param duration?: number   
 *        爆炸动画时长（ms），原生 rAF 完成（默认：1000）
 *
 * @param lift?: number       
 *        爆炸对象整体抬升的高度因子，用于让爆炸看起来更立体（默认：0.6）
 *
 * @param cameraPadding?: number 
 *        摄像机贴合爆炸后包围球时的额外安全距离（默认：1.2）
 *
 * @param autoRestorePrev?: boolean 
 *        当切换模型时，是否自动 restore 上一个模型的爆炸元素（默认：true）
 *
 * @param dimOthers?: { enabled: boolean; opacity?: number }
 *        非爆炸对象透明化配置：
 *        - enabled: true   开启
 *        - opacity: number 指定非爆炸对象透明度（默认：0.15）
 *
 * @param debug?: boolean
 *        是否开启调试日志，输出所有内部状态（默认 false）
 *
 *
 * ----------------------------------------------------------------------
 * 📌 方法说明
 * ----------------------------------------------------------------------
 *
 * ◆ setMeshes(meshSet: Set<Mesh>, contextId?: string)
 *    设置当前模型的爆炸 Mesh 集合：
 *      - 会记录 Mesh 的初始 transform
 *      - 根据 autoRestorePrev 自动还原上次爆炸
 *      - 第二个参数 contextId 可选，用于区分业务场景
 *
 *
 * ◆ explode(options?: ExplodeOptions)
 *    对当前 meshSet 执行爆炸动画：
 *      - 根据 mode 生成爆炸布局
 *      - 相机先自动飞向最佳观察点
 *      - 执行 mesh 位移动画
 *      - 按需将非爆炸模型透明化
 *
 *
 * ◆ restore(duration?: number)
 *    还原所有爆炸 Mesh 到爆炸前的 transform：
 *      - 支持平滑动画
 *      - 自动取消透明化
 *
 *
 * ◆ dispose()
 *    移除事件监听、取消动画、清理引用（在组件销毁时调用）
 *
 *
 * ----------------------------------------------------------------------
 * 🎨 排列模式说明
 * ----------------------------------------------------------------------
 *
 * 1. Ring（环形）
 *    - 按圆均匀分布
 *    - spacing 控制半径
 *    - lift 控制整体抬起高度
 *
 * 2. Spiral（螺旋）
 *    - 在环形基础上添加高度递增（y++)
 *    - 数量大时视觉效果最强
 *
 * 3. Grid（网格）
 *    - 类似棋盘布局
 *    - spacing 控制网格大小
 *    - z 不变或小幅度变化
 *
 * 4. Radial（径向扩散）
 *    - 从中心向外 “爆炸式” 发散
 *    - 对于大型组件分解展示非常适合
 *
 *
 * ----------------------------------------------------------------------
 * 📌 使用示例（业务层 Vue）
 * ----------------------------------------------------------------------
 *
 * const exploder = new GroupExploder(scene, camera, controls);
 *
 * onMounted(() => {
 *   exploder.setMeshes(new Set([meshA, meshB, meshC]));
 * });
 *
 * const triggerExplode = () => {
 *   exploder.explode({
 *     mode: 'ring',
 *     spacing: 3,
 *     duration: 1200,
 *     lift: 0.8,
 *     cameraPadding: 1.3,
 *     dimOthers: { enabled: true, opacity: 0.2 },
 *   });
 * };
 *
 * const triggerRestore = () => {
 *   exploder.restore(600);
 * };
 *
 */
import * as THREE from 'three';

type ArrangeMode = 'ring' | 'spiral' | 'grid' | 'radial';
export type ExplodeOptions = {
  mode?: ArrangeMode;
  spacing?: number;
  duration?: number;
  lift?: number;
  cameraPadding?: number;
  autoRestorePrev?: boolean;
  dimOthers?: { enabled: boolean; opacity?: number };
  debug?: boolean;
};

type InternalState = {
  originalParent: THREE.Object3D | null;
  originalMatrixWorld: THREE.Matrix4;
};

type MaterialSnap = {
  transparent: boolean;
  opacity: number;
  depthWrite?: boolean;
};

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export class GroupExploder {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera | THREE.Camera;
  private controls?: { target?: THREE.Vector3; update?: () => void };

  // sets and snapshots
  private currentSet: Set<THREE.Mesh> | null = null;
  private stateMap = new Map<THREE.Mesh, InternalState>();

  // prevSet preserved to allow async restore
  private prevSet: Set<THREE.Mesh> | null = null;
  private prevStateMap = new Map<THREE.Mesh, InternalState>();

  // material context map: material -> Set<contextId>, and snapshot store material->snap
  private materialContexts = new Map<THREE.Material, Set<string>>();
  private materialSnaps = new Map<THREE.Material, MaterialSnap>();
  private contextMaterials = new Map<string, Set<THREE.Material>>();

  private animId: number | null = null;
  private cameraAnimId: number | null = null;

  private isExploded = false;
  private isInitialized = false;

  public onLog?: (s: string) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.Camera, controls?: { target?: THREE.Vector3; update?: () => void }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
  }

  private log(msg: string) {
    console.log('[GroupExploderDebug]', msg);
    if (this.onLog) this.onLog(msg);
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.log('init() called');
  }

  /**
   * setMeshes(newSet):
   * - Detects content-level changes even if same Set reference is used.
   * - Preserves prevSet/stateMap to allow async restore when needed.
   * - Ensures stateMap contains snapshots for *all meshes in the new set*.
   */
  async setMeshes(newSet: Set<THREE.Mesh> | null, options?: { autoRestorePrev?: boolean; restoreDuration?: number }) {
    const autoRestorePrev = options?.autoRestorePrev ?? true;
    const restoreDuration = options?.restoreDuration ?? 300;

    this.log(`setMeshes called. newSetSize=${newSet ? newSet.size : 0}, autoRestorePrev=${autoRestorePrev}`);

    // If the newSet is null and currentSet is null -> nothing
    if (!newSet && !this.currentSet) {
      this.log('setMeshes: both newSet and currentSet are null, nothing to do');
      return;
    }

    // If both exist and are the same reference, we still must detect content changes.
    const sameReference = this.currentSet === newSet;

    // Prepare prevSet snapshot (we copy current to prev)
    if (this.currentSet) {
      this.prevSet = this.currentSet;
      this.prevStateMap = new Map(this.stateMap);
      this.log(`setMeshes: backed up current->prev prevSetSize=${this.prevSet.size}`);
    } else {
      this.prevSet = null;
      this.prevStateMap = new Map();
    }

    // If we used to be exploded and need to restore prevSet, do that first (await)
    if (this.prevSet && autoRestorePrev && this.isExploded) {
      this.log('setMeshes: need to restore prevSet before applying newSet');
      await this.restoreSet(this.prevSet, this.prevStateMap, restoreDuration, { debug: true });
      this.log('setMeshes: prevSet restore done');
      this.prevStateMap.clear();
      this.prevSet = null;
    }

    // Now register newSet: we clear and rebuild stateMap carefully.
    // But we must handle the case where caller reuses same Set object and just mutated elements.
    // We will compute additions and removals.
    const oldSet = this.currentSet;
    this.currentSet = newSet;

    // If newSet is null -> simply clear stateMap
    if (!this.currentSet) {
      this.stateMap.clear();
      this.log('setMeshes: newSet is null -> cleared stateMap');
      this.isExploded = false;
      return;
    }

    // If we have oldSet (could be same reference) then compute diffs
    if (oldSet) {
      // If same reference but size or content differs -> handle diffs
      const wasSameRef = sameReference;
      let added: THREE.Mesh[] = [];
      let removed: THREE.Mesh[] = [];

      // Build maps of membership
      const oldMembers = new Set<THREE.Mesh>(Array.from(oldSet));
      const newMembers = new Set<THREE.Mesh>(Array.from(this.currentSet));

      // find removals
      oldMembers.forEach((m) => {
        if (!newMembers.has(m)) removed.push(m);
      });
      // find additions
      newMembers.forEach((m) => {
        if (!oldMembers.has(m)) added.push(m);
      });

      if (wasSameRef && added.length === 0 && removed.length === 0) {
        // truly identical (no content changes)
        this.log('setMeshes: same reference and identical contents -> nothing to update');
        return;
      }

      this.log(`setMeshes: diff detected -> added=${added.length}, removed=${removed.length}`);

      // Remove snapshots for removed meshes
      removed.forEach((m) => {
        if (this.stateMap.has(m)) {
          this.stateMap.delete(m);
        }
      });

      // Ensure snapshots exist for current set members (create for newly added meshes)
      await this.ensureSnapshotsForSet(this.currentSet);

      this.log(`setMeshes: after diff handling, stateMap size=${this.stateMap.size}`);
      this.isExploded = false;
      return;
    } else {
      // no oldSet -> brand new registration
      this.stateMap.clear();
      await this.ensureSnapshotsForSet(this.currentSet);
      this.log(`setMeshes: recorded stateMap entries for newSet size=${this.stateMap.size}`);
      this.isExploded = false;
      return;
    }
  }

  /**
   * ensureSnapshotsForSet: for each mesh in set, ensure stateMap has an entry.
   * If missing, record current matrixWorld as originalMatrixWorld (best-effort).
   */
  private async ensureSnapshotsForSet(set: Set<THREE.Mesh>) {
    set.forEach((m) => {
      try {
        m.updateMatrixWorld(true);
      } catch {}
      if (!this.stateMap.has(m)) {
        try {
          this.stateMap.set(m, {
            originalParent: m.parent || null,
            originalMatrixWorld: (m.matrixWorld && m.matrixWorld.clone()) || new THREE.Matrix4().copy(m.matrix),
          });
          // Also store in userData for extra resilience
          (m.userData as any).__originalMatrixWorld = this.stateMap.get(m)!.originalMatrixWorld.clone();
        } catch (e) {
          this.log(`ensureSnapshotsForSet: failed to snapshot mesh ${m.name || m.id}: ${(e as Error).message}`);
        }
      }
    });
  }

  /**
   * explode: compute targets first, compute targetBound using targets + mesh radii,
   * animate camera to that targetBound, then animate meshes to targets.
   */
  async explode(opts?: ExplodeOptions) {
    if (!this.currentSet || this.currentSet.size === 0) {
      this.log('explode: empty currentSet, nothing to do');
      return;
    }

    const {
      spacing = 2,
      duration = 1000,
      lift = 0.5,
      cameraPadding = 1.5,
      mode = 'spiral',
      dimOthers = { enabled: true, opacity: 0.25 },
      debug = false,
    } = opts || {};

    this.log(`explode called. setSize=${this.currentSet.size}, mode=${mode}, spacing=${spacing}, duration=${duration}, lift=${lift}, dim=${dimOthers.enabled}`);
    this.cancelAnimations();
    const meshes = Array.from(this.currentSet);

    // ensure snapshots exist for any meshes that may have been added after initial registration
    await this.ensureSnapshotsForSet(this.currentSet);

    // compute center/radius from current meshes (fallback)
    const initial = this.computeBoundingSphereForMeshes(meshes);
    const center = initial.center;
    const baseRadius = Math.max(1, initial.radius);
    this.log(`explode: initial center=${center.toArray().map((n) => n.toFixed(3))}, baseRadius=${baseRadius.toFixed(3)}`);

    // compute targets (pure calculation)
    const targets = this.computeTargetsByMode(meshes, center, baseRadius + spacing, { lift, mode });
    this.log(`explode: computed ${targets.length} target positions`);

    // compute target-based bounding sphere (targets + per-mesh radius)
    const targetBound = this.computeBoundingSphereForPositionsAndMeshes(targets, meshes);
    this.log(`explode: targetBound center=${targetBound.center.toArray().map((n) => n.toFixed(3))}, radius=${targetBound.radius.toFixed(3)}`);

    await this.animateCameraToFit(targetBound.center, targetBound.radius, { duration: Math.min(600, duration), padding: cameraPadding });
    this.log('explode: camera animation to target bound completed');

    // apply dim if needed with context id
    const contextId = dimOthers?.enabled ? this.applyDimToOthers(meshes, dimOthers.opacity ?? 0.25, { debug }) : null;
    if (contextId) this.log(`explode: applied dim for context ${contextId}`);

    // capture starts after camera move
    const starts: THREE.Vector3[] = meshes.map((m) => {
      const v = new THREE.Vector3();
      try {
        m.getWorldPosition(v);
      } catch {
        // fallback to originalMatrixWorld if available
        const st = this.stateMap.get(m);
        if (st) v.setFromMatrixPosition(st.originalMatrixWorld);
      }
      return v;
    });

    const startTime = performance.now();
    const total = Math.max(1, duration);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / total);
      const eased = easeInOutQuad(t);

      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        const s = starts[i];
        const tar = targets[i];
        const cur = s.clone().lerp(tar, eased);
        if (m.parent) {
          const local = cur.clone();
          m.parent.worldToLocal(local);
          m.position.copy(local);
        } else {
          m.position.copy(cur);
        }
        m.updateMatrix();
      }

      if (this.controls && typeof this.controls.update === 'function') this.controls.update();

      if (t < 1) {
        this.animId = requestAnimationFrame(tick);
      } else {
        this.animId = null;
        this.isExploded = true;
        this.log(`explode: completed. contextId=${contextId ?? 'none'}`);
      }
    };

    this.animId = requestAnimationFrame(tick);
    return;
  }

  restore(duration = 400): Promise<void> {
    if (!this.currentSet || this.currentSet.size === 0) {
      this.log('restore: no currentSet to restore');
      return Promise.resolve();
    }
    this.log(`restore called for currentSet size=${this.currentSet.size}`);
    return this.restoreSet(this.currentSet, this.stateMap, duration, { debug: true });
  }

  /**
   * restoreSet: reparent and restore transforms using provided stateMap.
   * If missing stateMap entry for a mesh, use fallbacks:
   *  1) mesh.userData.__originalMatrixWorld (if present)
   *  2) mesh.matrixWorld (current) -> smooth lerp to itself (no-op visually)
   */
  private restoreSet(set: Set<THREE.Mesh> | null, stateMap: Map<THREE.Mesh, InternalState>, duration = 400, opts?: { debug?: boolean }): Promise<void> {
    if (!set || set.size === 0) {
      if (opts?.debug) this.log('restoreSet: empty set, nothing to restore');
      return Promise.resolve();
    }

    this.cancelAnimations();
    const meshes = Array.from(set);
    this.log(`restoreSet: starting restore for ${meshes.length} meshes (duration=${duration})`);

    const starts: THREE.Vector3[] = [];
    const targets: THREE.Vector3[] = [];

    for (const m of meshes) {
      try {
        m.updateMatrixWorld(true);
      } catch {}
      const s = new THREE.Vector3();
      try {
        m.getWorldPosition(s);
      } catch {
        s.set(0, 0, 0);
      }
      starts.push(s);

      const st = stateMap.get(m);
      if (st) {
        const tar = new THREE.Vector3();
        tar.setFromMatrixPosition(st.originalMatrixWorld);
        targets.push(tar);
      } else {
        // fallback attempts
        const ud = (m.userData as any).__originalMatrixWorld;
        if (ud instanceof THREE.Matrix4) {
          const tar = new THREE.Vector3();
          tar.setFromMatrixPosition(ud);
          targets.push(tar);
          this.log(`restoreSet: used userData.__originalMatrixWorld for mesh ${m.name || m.id}`);
        } else {
          // fallback to current position to avoid NaN; will be effectively a no-op but avoids error
          const tar = s.clone();
          targets.push(tar);
          this.log(`restoreSet: missing stateMap entry for mesh ${m.name || m.id} -> fallback to current pos`);
        }
      }
    }

    const startTime = performance.now();
    const total = Math.max(1, duration);

    return new Promise((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / total);
        const eased = easeInOutQuad(t);

        for (let i = 0; i < meshes.length; i++) {
          const m = meshes[i];
          const s = starts[i];
          const tar = targets[i];
          const cur = s.clone().lerp(tar, eased);

          // final step: ensure reparent to original parent if possible
          const st = stateMap.get(m);
          if (st && t >= 0.999) {
            try {
              const origParent = st.originalParent || this.scene;
              origParent.updateMatrixWorld(true);
              const parentInv = new THREE.Matrix4().copy(origParent.matrixWorld).invert();
              const localMat = new THREE.Matrix4().multiplyMatrices(parentInv, st.originalMatrixWorld);

              // reparent (if needed)
              if (m.parent !== origParent) {
                origParent.add(m);
              }
              m.matrix.copy(localMat);
              m.matrix.decompose(m.position, m.quaternion, m.scale);
              m.updateMatrixWorld(true);
            } catch (e) {
              // fallback: set world position
              if (m.parent) {
                const local = tar.clone();
                m.parent.worldToLocal(local);
                m.position.copy(local);
              } else {
                m.position.copy(tar);
              }
              m.updateMatrixWorld(true);
              this.log(`restoreSet: error finalizing reparent for ${m.name || m.id}: ${(e as Error).message}`);
            }
          } else {
            // intermediate frames: lerp world -> convert to local relative to current parent
            if (m.parent) {
              const local = cur.clone();
              m.parent.worldToLocal(local);
              m.position.copy(local);
            } else {
              m.position.copy(cur);
            }
            m.updateMatrix();
          }
        }

        if (this.controls && typeof this.controls.update === 'function') this.controls.update();

        if (t < 1) {
          this.animId = requestAnimationFrame(tick);
        } else {
          this.animId = null;
          this.cleanContextsForMeshes(meshes);
          this.isExploded = false;
          this.log('restoreSet: completed and cleaned contexts for restored meshes');
          resolve();
        }
      };

      this.animId = requestAnimationFrame(tick);
    });
  }

  // material dim with context id
  private applyDimToOthers(explodingMeshes: THREE.Mesh[], opacity = 0.25, opts?: { debug?: boolean }) {
    const contextId = `ctx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const explodingSet = new Set(explodingMeshes);
    const touched = new Set<THREE.Material>();

    this.scene.traverse((obj) => {
      if (!(obj as any).isMesh) return;
      const mesh = obj as THREE.Mesh;
      if (explodingSet.has(mesh)) return;

      const applyMat = (mat: THREE.Material) => {
        if (!this.materialSnaps.has(mat)) {
          this.materialSnaps.set(mat, {
            transparent: !!(mat as any).transparent,
            opacity: (mat as any).opacity ?? 1,
            depthWrite: (mat as any).depthWrite,
          });
        }
        let s = this.materialContexts.get(mat);
        if (!s) {
          s = new Set<string>();
          this.materialContexts.set(mat, s);
        }
        s.add(contextId);
        touched.add(mat);
        (mat as any).transparent = true;
        (mat as any).opacity = opacity;
        mat.needsUpdate = true;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => applyMat(m));
      } else if (mesh.material) {
        applyMat(mesh.material);
      }
    });

    this.contextMaterials.set(contextId, touched);
    this.log(`applyDimToOthers: context=${contextId}, touchedMaterials=${touched.size}`);
    return contextId;
  }

  // clean contexts for meshes (restore materials whose contexts are removed)
  private cleanContextsForMeshes(meshes: THREE.Mesh[]) {
    // conservative strategy: for each context we created, delete it and restore materials accordingly
    for (const [contextId, mats] of Array.from(this.contextMaterials.entries())) {
      mats.forEach((mat) => {
        const ctxSet = this.materialContexts.get(mat);
        if (ctxSet) {
          ctxSet.delete(contextId);
          if (ctxSet.size === 0) {
            const snap = this.materialSnaps.get(mat);
            if (snap) {
              (mat as any).transparent = snap.transparent;
              (mat as any).opacity = snap.opacity;
              if (typeof snap.depthWrite !== 'undefined') (mat as any).depthWrite = snap.depthWrite;
            }
            mat.needsUpdate = true;
            this.materialContexts.delete(mat);
            this.materialSnaps.delete(mat);
          } else {
            this.materialContexts.set(mat, ctxSet);
          }
        }
      });
      this.contextMaterials.delete(contextId);
      this.log(`cleanContextsForMeshes: removed context ${contextId}`);
    }
  }

  // robust bounding sphere computation; if mesh world pos invalid, try stateMap's originalMatrixWorld as backoff
  private computeBoundingSphereForMeshes(meshes: THREE.Mesh[]) {
    const box = new THREE.Box3();

    meshes.forEach((m) => {
      try {
        m.updateMatrixWorld(true);
        const pos = new THREE.Vector3();
        m.getWorldPosition(pos);
        if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) {
          // fallback to stateMap's originalMatrixWorld if available
          const st = this.stateMap.get(m);
          if (st) {
            const fallback = new THREE.Vector3();
            fallback.setFromMatrixPosition(st.originalMatrixWorld);
            if (isFinite(fallback.x) && isFinite(fallback.y) && isFinite(fallback.z)) {
              this.log(`computeBoundingSphereForMeshes: using stateMap originalMatrixWorld for mesh ${m.name || m.id}`);
              pos.copy(fallback);
            } else {
              this.log(`computeBoundingSphereForMeshes: skipping mesh ${m.name || m.id} due to invalid positions`);
              return;
            }
          } else {
            this.log(`computeBoundingSphereForMeshes: skipping mesh ${m.name || m.id} due to invalid world pos and no snapshot`);
            return;
          }
        }

        let radius = 0;
        const geom = (m.geometry as THREE.BufferGeometry) || null;
        if (geom) {
          if (!geom.boundingSphere) geom.computeBoundingSphere();
          if (geom.boundingSphere) {
            radius = geom.boundingSphere.radius;
            const ws = new THREE.Vector3();
            m.getWorldScale(ws);
            radius = radius * Math.max(ws.x, ws.y, ws.z, 1e-6);
          }
        }
        if (!isFinite(radius) || radius < 0 || radius > 1e8) radius = 0;

        const min = pos.clone().addScalar(-radius);
        const max = pos.clone().addScalar(radius);
        box.expandByPoint(min);
        box.expandByPoint(max);
      } catch (e) {
        this.log(`computeBoundingSphereForMeshes: error for mesh ${(m as any).name || m.id}: ${(e as Error).message}`);
      }
    });

    const center = new THREE.Vector3();
    if (box.isEmpty()) {
      center.set(0, 0, 0);
      box.expandByPoint(center);
    }
    box.getCenter(center);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = sphere.radius || Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 1.0);
    return { center, radius };
  }

  // compute bounding sphere for positions + mesh radii
  private computeBoundingSphereForPositionsAndMeshes(positions: THREE.Vector3[], meshes: THREE.Mesh[]) {
    const box = new THREE.Box3();
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
        this.log(`computeBoundingSphereForPositionsAndMeshes: skipping invalid target pos idx=${i}`);
        continue;
      }
      let radius = 0;
      const m = meshes[i];
      try {
        const geom = (m.geometry as THREE.BufferGeometry) || null;
        if (geom) {
          if (!geom.boundingSphere) geom.computeBoundingSphere();
          if (geom.boundingSphere) {
            radius = geom.boundingSphere.radius;
            const ws = new THREE.Vector3();
            m.getWorldScale(ws);
            radius = radius * Math.max(ws.x, ws.y, ws.z, 1e-6);
          }
        }
      } catch {
        radius = 0;
      }
      if (!isFinite(radius) || radius < 0 || radius > 1e8) radius = 0;
      const min = p.clone().addScalar(-radius);
      const max = p.clone().addScalar(radius);
      box.expandByPoint(min);
      box.expandByPoint(max);
    }
    const center = new THREE.Vector3();
    if (box.isEmpty()) {
      center.set(0, 0, 0);
      box.expandByPoint(center);
    }
    box.getCenter(center);
    const tmp = new THREE.Sphere();
    box.getBoundingSphere(tmp);
    const radius = tmp.radius || Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 1.0);
    return { center, radius };
  }

  // computeTargetsByMode (unchanged logic but pure function)
  private computeTargetsByMode(meshes: THREE.Mesh[], center: THREE.Vector3, baseRadius: number, opts: { lift?: number; mode?: ArrangeMode }) {
    const n = meshes.length;
    const lift = opts.lift ?? 0.5;
    const mode = opts.mode ?? 'ring';
    const targets: THREE.Vector3[] = [];

    if (mode === 'ring') {
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        targets.push(new THREE.Vector3(center.x + Math.cos(angle) * baseRadius, center.y + lift, center.z + Math.sin(angle) * baseRadius));
      }
      return targets;
    }

    if (mode === 'spiral') {
      const turns = Math.max(1, Math.ceil(n / 6));
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1 || 1);
        const angle = t * Math.PI * 2 * turns;
        const radius = baseRadius * (0.3 + 0.7 * t);
        targets.push(new THREE.Vector3(center.x + Math.cos(angle) * radius, center.y + lift + t * 0.5, center.z + Math.sin(angle) * radius));
      }
      return targets;
    }

    if (mode === 'grid') {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const spacing = Math.max(0.5, baseRadius / Math.max(cols, rows));
      const startX = center.x - ((cols - 1) * spacing) / 2;
      const startZ = center.z - ((rows - 1) * spacing) / 2;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        targets.push(new THREE.Vector3(startX + c * spacing, center.y + lift, startZ + r * spacing));
      }
      return targets;
    }

    // radial
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const angle = t * Math.PI * 2;
      const r = baseRadius * (1 + (i % 3) * 0.4 + Math.floor(i / 3) * 0.6);
      targets.push(new THREE.Vector3(center.x + Math.cos(angle) * r, center.y + lift + Math.floor(i / 3) * 0.2, center.z + Math.sin(angle) * r));
    }
    return targets;
  }

  private animateCameraToFit(targetCenter: THREE.Vector3, targetRadius: number, opts?: { duration?: number; padding?: number }) {
    const duration = opts?.duration ?? 600;
    const padding = opts?.padding ?? 1.5;

    if (!(this.camera instanceof THREE.PerspectiveCamera)) {
      if (this.controls && this.controls.target) {
        this.controls.target.copy(targetCenter);
        if (typeof this.controls.update === 'function') this.controls.update();
      }
      return Promise.resolve();
    }

    const cam = this.camera as THREE.PerspectiveCamera;
    const fov = (cam.fov * Math.PI) / 180;
    const safeRadius = isFinite(targetRadius) && targetRadius > 0 ? targetRadius : 1;
    const desiredDistance = Math.min(1e6, (safeRadius * (opts?.padding ?? padding)) / Math.sin(fov / 2));

    const camPos = cam.position.clone();
    const dir = camPos.clone().sub(targetCenter);
    if (dir.length() === 0) dir.set(0, 0, 1);
    else dir.normalize();

    const newCamPos = targetCenter.clone().add(dir.multiplyScalar(desiredDistance));
    const startPos = cam.position.clone();
    const startTarget = (this.controls && this.controls.target) ? (this.controls.target.clone()) : this.getCameraLookAtPoint();
    const endTarget = targetCenter.clone();

    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / Math.max(1, duration));
        const eased = easeInOutQuad(t);

        cam.position.lerpVectors(startPos, newCamPos, eased);
        if (this.controls && (this.controls as any).target) (this.controls as any).target.lerpVectors(startTarget, endTarget, eased);

        cam.updateProjectionMatrix();
        if (this.controls && typeof this.controls.update === 'function') this.controls.update();

        if (t < 1) this.cameraAnimId = requestAnimationFrame(tick);
        else {
          this.cameraAnimId = null;
          this.log(`animateCameraToFit: done. center=${targetCenter.toArray().map((n) => n.toFixed(2))}, radius=${targetRadius.toFixed(2)}`);
          resolve();
        }
      };
      this.cameraAnimId = requestAnimationFrame(tick);
    });
  }

  private getCameraLookAtPoint() {
    const dir = new THREE.Vector3();
    (this.camera as THREE.PerspectiveCamera).getWorldDirection(dir);
    return this.camera.position.clone().add(dir.multiplyScalar(10));
  }

  private cancelAnimations() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.cameraAnimId) {
      cancelAnimationFrame(this.cameraAnimId);
      this.cameraAnimId = null;
    }
  }

  async dispose(restoreBefore = true) {
    this.cancelAnimations();
    if (restoreBefore && this.isExploded) {
      try {
        await this.restore(200);
      } catch {}
    }
    // force restore of materials
    for (const [mat, ctxs] of Array.from(this.materialContexts.entries())) {
      const snap = this.materialSnaps.get(mat);
      if (snap) {
        (mat as any).transparent = snap.transparent;
        (mat as any).opacity = snap.opacity;
        if (typeof snap.depthWrite !== 'undefined') (mat as any).depthWrite = snap.depthWrite;
        mat.needsUpdate = true;
      }
      this.materialContexts.delete(mat);
      this.materialSnaps.delete(mat);
    }
    this.contextMaterials.clear();
    this.stateMap.clear();
    this.prevStateMap.clear();
    this.currentSet = null;
    this.prevSet = null;
    this.isInitialized = false;
    this.isExploded = false;
    this.log('dispose: cleaned up');
  }
}
