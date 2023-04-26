/*
 * @Author: lby
 * @Date: 2021-08-02 15:48:15
 * @LastEditors: lby
 * @LastEditTime: 2021-09-15 14:08:40
 * @Description: Converse By You - 3D Core
 */
import * as TWEEN from '@tweenjs/tween.js';
// import * as THREE from 'three';
import {
  Vector2, Vector3, PerspectiveCamera, Scene, AmbientLight, DirectionalLight, WebGLRenderer, sRGBEncoding, Object3D, CanvasTexture, RepeatWrapping, MirroredRepeatWrapping, TextureLoader, PlaneGeometry, MeshBasicMaterial, Mesh, Group, Color, Raycaster, AxesHelper, MeshPhysicalMaterial,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as Stats from 'stats.js';
import OrbitControls from './OrbitControls';
import ResourceTracker from './ResourceTracker';
import CTexture from './CTexture';

const CBYC = function (op) {
  // 
  // =========================================
  // INIT
  // =========================================
  // 

  // debug
  const debug = {
    enable: !!op.debug,
    stats: true,
    axes: true,
    raycaster: false,
    ctLayer: false,
    ema: true,
    fabricBoard: true,
  };

  // preload all models in storeconf
  const doPreload = !!op.preload;

  // loader
  const loader = new GLTFLoader();

  // cache
  const cache = {};

  // only update when neeeded
  const updateOnNeed = true; 

  // prod info
  let prod = {};

  // stage
  const stage = {
    w: op.canvasEle.clientWidth,
    h: op.canvasEle.clientHeight,

    // models
    modelA: null,
    modelB: null,

    // color parts
    laces: null,
    eyelets: null,
    racingStripeUp: null,
    racingStripeDown: null,
    bodyParts: [],

    // inverse color parts
    icParts: [],

    // ca parts
    cas: {},

    // cts
    cts: {},

    // colors
    colors: {},

    // size
    size: null,

    // active
    activeCaId: null,

    // thumbnail
    thumbnail: null,
    
    // render control
    needsUpdate: false,
    needsUpdateOnce: false,
  };

  // resTracker
  const resTracker = new ResourceTracker();
  const track = resTracker.track.bind(resTracker);

  // 
  // =========================================
  // COMMON OBJECTS
  // =========================================
  // 

  // camera
  // -----------------------------------------
  const camera = new PerspectiveCamera(
    35,
    stage.w / stage.h,
    0.01,
    100,
  );

  // scene
  // -----------------------------------------
  const scene = new Scene();

  // lights
  // -----------------------------------------
  const ambientLight = new AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dlFront = new DirectionalLight(0xffffff, 0.35);
  dlFront.position.set(0, 1, 7.5);
  scene.add(dlFront);

  const dlBack = new DirectionalLight(0xffffff, 0.2);
  dlBack.position.set(0, 1.5, -7.5);
  scene.add(dlBack);

  const dlLeft = new DirectionalLight(0xffffff, 0.45);
  dlLeft.position.set(5, 5, 0);
  scene.add(dlLeft);

  const dlRight = new DirectionalLight(0xffffff, 0.45);
  dlRight.position.set(-5, 5, -2);
  scene.add(dlRight);

  const dlBottom = new DirectionalLight(0xffffff, 0.2);
  dlBottom.position.set(1, -5, 1);
  scene.add(dlBottom);

  // const dlRightTarget = new THREE.Object3D();
  // dlRightTarget.name = 'dlLightTarget';
  // dlRightTarget.position.set(0, 0.8, -1.2);
  // dlRight.target = dlRightTarget;
  // dlRight.target.updateMatrixWorld();
  // scene.add(dlRight.target);
  
  // const helper = new THREE.DirectionalLightHelper(dlBottom, 5);
  // scene.add(helper);

  // renderer
  // -----------------------------------------
  const renderer = new WebGLRenderer({
    antialias: true,
    canvas: op.canvasEle,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(stage.w, stage.h);
  renderer.outputEncoding = sRGBEncoding;

  // controls
  // -----------------------------------------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.target.set(0, 0, 0);
  controls.addEventListener('change', () => {
    stage.needsUpdateOnce = true;
  });

  // stats
  // -----------------------------------------
  let stats = null;
  if (debug.enable && debug.stats) {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
  }

  // axesHelper
  // -----------------------------------------
  if (debug.enable && debug.axes) {
    const axesHelper = new AxesHelper(5);
    scene.add(axesHelper);
  }
  
  // 
  // =========================================
  // MAIN LOOP
  // =========================================
  // 
  const animation = () => {
    if (!updateOnNeed || stage.needsUpdate || stage.needsUpdateOnce) {
      if (stage.needsUpdateOnce) stage.needsUpdateOnce = false;

      if (tweenView) {
        TWEEN.update();
      }

      if (debug.enable && debug.ema && ema.inited) {
        updateEma();
      }

      controls.update();
      renderer.render(scene, camera);
    }
    if (stats) {
      stats.update();
    }
  };
  renderer.setAnimationLoop(animation);

  const updateOnce = () => {
    stage.needsUpdateOnce = true;
  };
  
  // 
  // =========================================
  // RESIZE
  // =========================================
  // 

  const updateStageSize = () => {
    stage.w = op.wrapEle.clientWidth;
    stage.h = op.wrapEle.clientHeight;
  };

  const resize = () => {
    console.log('CBYC: Resized');
    updateStageSize();
    camera.aspect = stage.w / stage.h;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.w, stage.h);
    stage.needsUpdateOnce = true;
  };
  window.addEventListener('resize', resize);
 
  // =========================================
  // PROD FUNCTIONS & METHODS
  // =========================================
  // 
  const mountProd = (gltf) => {
    // set prod parts
    // -------------------------------------
    const prodParts = {};
    Object.assign(
      prodParts, 
      op.dataset.standardProdParts[prod.type].prodParts, 
      prod.prodParts,
    );

    // set default size
    // -------------------------------------
    if (!stage.size) {
      switch (prod.type) {
        case 'shoes':
          stage.size = '13';
          break;
        case 'clothing':
          stage.size = '22';
          break;
        default:
          break;
      }
    }

    // create stage.cts
    // -------------------------------------
    if (prod.caParts) {
      Object.keys(prod.caParts).forEach((caId) => {
        stage.cts[caId] = new CTexture({
          id: caId,
          wrap: op.ctWrapEle,
          obj: null,
          updateOnce,
          controls,
          caData: prod.caParts[caId],
          prodSize: prod.sizes[stage.size] * 0.393700787402,
          dataset: op.dataset,
          prodType: prod.type,
          vm: op.vm,
          debug: debug.enable && debug.fabricBoard,
        });
      });
    }

    // link the model parts
    // -------------------------------------
    let cur = null;
    
    switch (prod.type) {
      // shoes
      // ***************************************
      case 'shoes':
        // pretreatment - modelA
        stage.modelA = gltf.scene.clone();
        stage.modelA.rotation.y = prod.rotationY;
        stage.modelA.position.x = 0;

        stage.modelB = gltf.scene.clone();
        stage.modelB.rotation.y = -prod.rotationY;
        stage.modelB.scale.x = -1;
        stage.modelB.visible = false;

        for (let i = 0; i < stage.modelA.children.length; i += 1) {
          // console.log(stage.modelA.children[i].name);
        
          switch (stage.modelA.children[i].name) {
            case prodParts.laces:
              stage.laces = stage.modelA.children[i];
              stage.laces.material = stage.laces.material.clone();
              stage.modelB.children[i].material = stage.laces.material;     
              break;
            case prodParts.eyelets:
              stage.eyelets = stage.modelA.children[i];
              stage.eyelets.material = stage.eyelets.material.clone();
              stage.modelB.children[i].material = stage.eyelets.material;
              break;
            case prodParts.racingStripeUp:
              stage.racingStripeUp = stage.modelA.children[i];
              stage.racingStripeUp.material = stage.racingStripeUp.material.clone();
              stage.modelB.children[i].material = stage.racingStripeUp.material;     
              break;
            case prodParts.racingStripeDown:
              stage.racingStripeDown = stage.modelA.children[i];
              stage.racingStripeDown.material = stage.racingStripeDown.material.clone();
              stage.modelB.children[i].material = stage.racingStripeDown.material;     
              break;
            case prodParts.outside:
              stage.cas.caSLO = stage.modelA.children[i];
              stage.cas.caSLO.material = stage.cas.caSLO.material.clone();

              stage.cts.caSLO.obj = stage.cas.caSLO;
              stage.cts.caSLO.tImg = stage.modelA.children[i].material.map.image;
              stage.cts.caSLO.update();

              stage.cas.caSLO.material.map.dispose();
              stage.cas.caSLO.material.map = new CanvasTexture(stage.cts.caSLO.mixer);
              stage.cas.caSLO.material.map.encoding = sRGBEncoding;
              stage.cas.caSLO.material.map.flipY = false;
              stage.cas.caSLO.material.map.needsUpdate = true;

              // 
            
              stage.cas.caSRO = stage.modelB.children[i];
              stage.cas.caSRO.material = stage.cas.caSRO.material.clone();

              stage.cts.caSRO.obj = stage.cas.caSRO;
              stage.cts.caSRO.tImg = stage.modelB.children[i].material.map.image;
              stage.cts.caSRO.tImgFlipX = true;
              stage.cts.caSRO.update();

              stage.cas.caSRO.material.map.dispose();
              stage.cas.caSRO.material.map = new CanvasTexture(stage.cts.caSRO.mixer);
              stage.cas.caSRO.material.map.encoding = sRGBEncoding;
              stage.cas.caSRO.material.map.wrapS = RepeatWrapping;
              stage.cas.caSRO.material.map.repeat.x = -1;
              stage.cas.caSRO.material.map.flipY = false;
              stage.cas.caSRO.material.map.needsUpdate = true;
              stage.cas.caSRO.material.normalMap.wrapS = MirroredRepeatWrapping;

              break;
            case prodParts.inside:
              stage.cas.caSLI = stage.modelA.children[i];
              stage.cas.caSLI.material = stage.cas.caSLI.material.clone();

              stage.cts.caSLI.obj = stage.cas.caSLI;
              stage.cts.caSLI.tImg = stage.modelA.children[i].material.map.image;
              stage.cts.caSLI.update();

              stage.cas.caSLI.material.map.dispose();
              stage.cas.caSLI.material.map = new CanvasTexture(stage.cts.caSLI.mixer);
              stage.cas.caSLI.material.map.encoding = sRGBEncoding;
              stage.cas.caSLI.material.map.flipY = false;
              stage.cas.caSLI.material.map.needsUpdate = true;
              // 
            
              stage.cas.caSRI = stage.modelB.children[i];
              stage.cas.caSRI.material = stage.cas.caSRI.material.clone();

              stage.cts.caSRI.obj = stage.cas.caSRI;
              stage.cts.caSRI.tImg = stage.modelB.children[i].material.map.image;
              stage.cts.caSRI.tImgFlipX = true;
              stage.cts.caSRI.update();

              stage.cas.caSRI.material.map.dispose();
              stage.cas.caSRI.material.map = new CanvasTexture(stage.cts.caSRI.mixer);
              stage.cas.caSRI.material.map.encoding = sRGBEncoding;

              stage.cas.caSRI.material.map.wrapS = RepeatWrapping;
              stage.cas.caSRI.material.map.repeat.x = -1;

              stage.cas.caSRI.material.map.flipY = false;
              stage.cas.caSRI.material.map.needsUpdate = true;
              stage.cas.caSRI.material.normalMap.wrapS = MirroredRepeatWrapping;

              break;
            case prodParts.heel:
            case prodParts.tongue:
            case prodParts.inner:
              cur = stage.modelA.children[i];
              cur.material = cur.material.clone();
              stage.bodyParts.push(cur);
              cur = stage.modelB.children[i];
              cur.material = stage.modelA.children[i].material;
              stage.bodyParts.push(cur);
              break;
            case prodParts.roundLabel:
            case prodParts.heelLabel:
            case prodParts.tongueLabel:
            case prodParts.insole:
              cur = stage.modelB.children[i];
              cur.material = cur.material.clone();
              cur.material.map = cur.material.map.clone();
              cur.material.map.repeat.x = -1;
              cur.material.map.needsUpdate = true;
              break;
            default:
              break;
          }
        }
        break;
      // clothing
      // ***************************************
      case 'clothing':
        stage.modelA = gltf.scene.clone();
        if (prod.scale) {
          stage.modelA.scale.x = prod.scale;
          stage.modelA.scale.y = prod.scale;
          stage.modelA.scale.z = prod.scale;
        }

        for (let i = 0; i < stage.modelA.children.length; i += 1) {
          // console.log(stage.modelA.children[i].name);
          switch (stage.modelA.children[i].name) {
            case prodParts.front:
              stage.cas.caCFT = stage.modelA.children[i];
              stage.cas.caCFT.material = stage.cas.caCFT.material.clone();

              stage.cts.caCFT.obj = stage.cas.caCFT;
              stage.cts.caCFT.tImg = stage.modelA.children[i].material.map.image;
              stage.cts.caCFT.update();

              stage.cas.caCFT.material.map = new CanvasTexture(stage.cts.caCFT.mixer);
              stage.cas.caCFT.material.map.encoding = sRGBEncoding;
              stage.cas.caCFT.material.map.flipY = false;
              stage.cas.caCFT.material.map.needsUpdate = true;
              break;
            case prodParts.back:
              stage.cas.caCBK = stage.modelA.children[i];
              stage.cas.caCBK.material = stage.cas.caCBK.material.clone();
              stage.cts.caCBK.obj = stage.cas.caCBK;
              stage.cts.caCBK.tImg = stage.modelA.children[i].material.map.image;
              stage.cts.caCBK.update();
              stage.cas.caCBK.material.map = new CanvasTexture(stage.cts.caCBK.mixer);
              stage.cas.caCBK.material.map.encoding = sRGBEncoding;
              stage.cas.caCBK.material.map.flipY = false;
              stage.cas.caCBK.material.map.needsUpdate = true;
              break;
            case prodParts.left:
              stage.cas.caCLS = stage.modelA.children[i];
              stage.cas.caCLS.material = stage.cas.caCLS.material.clone();

              stage.cts.caCLS.obj = stage.cas.caCLS;
              stage.cts.caCLS.tImg = stage.modelA.children[i].material.map.image;
              stage.cts.caCLS.update();

              stage.cas.caCLS.material.map = new CanvasTexture(stage.cts.caCLS.mixer);
              stage.cas.caCLS.material.map.encoding = sRGBEncoding;
              stage.cas.caCLS.material.map.flipY = false;
              stage.cas.caCLS.material.map.needsUpdate = true;

              break;
            case prodParts.right:
              stage.cas.caCRS = stage.modelA.children[i];
              stage.cas.caCRS.material = stage.cas.caCRS.material.clone();

              stage.cts.caCRS.obj = stage.cas.caCRS;
              stage.cts.caCRS.tImg = stage.modelA.children[i].material.map.image;
              stage.cts.caCRS.update();

              stage.cas.caCRS.material.map = new CanvasTexture(stage.cts.caCRS.mixer);
              stage.cas.caCRS.material.map.encoding = sRGBEncoding;
              stage.cas.caCRS.material.map.wrapS = RepeatWrapping;
              stage.cas.caCRS.material.map.repeat.x = prod.caParts.caCRS.repeatX ? prod.caParts.caCRS.repeatX : 1;

              stage.cas.caCRS.material.map.flipY = false;
              stage.cas.caCRS.material.map.needsUpdate = true;
              break;
            case prodParts.collar:
            case prodParts.inner:
            case prodParts.elastic:
            case prodParts.hood:
            case prodParts.pocket:
            case prodParts.rope:
            case prodParts.gromet:
              cur = stage.modelA.children[i];
              cur.material = cur.material.clone();
              stage.bodyParts.push(cur);
              break;
            case prodParts.labelAtWhite:
              stage.modelA.children[i].visible = false;
              if (!stage.icParts.white) {
                stage.icParts.white = [];
              }
              stage.icParts.white.push(stage.modelA.children[i]);
              break;
            case prodParts.labelAtBlack:
              stage.modelA.children[i].visible = false;
              if (!stage.icParts.black) {
                stage.icParts.black = [];
              }
              stage.icParts.black.push(stage.modelA.children[i]);
              break;
            default:
              break;
          }
        }
        break;
      default:
        break;
    }

    // set default color
    if (prod.customColorParts) {
      Object.keys(prod.customColorParts).forEach((partId) => {
        this.setColor(
          partId,
          prod.customColorParts[partId],
        );
      });
    }

    // add to scene
    scene.add(track(stage.modelA));
    if (stage.modelB) {
      scene.add(track(stage.modelB));  
    }
    
    controls.enabled = true;
    stage.needsUpdateOnce = true;
  };

  const loadProd = (prodId, cb = null) => {
    const loadTarget = op.dataset.prods[prodId];
    if (loadTarget) {
      cache[prodId] = 'loading';
      loader.load(
        loadTarget.model,
        (gltf) => {
          console.log(`CBYC: Loaded ${prodId}`);
          gltf.scene.position.set(
            loadTarget.centerOffset.x,
            loadTarget.centerOffset.y,
            loadTarget.centerOffset.z,
          );

          // pretreatment
          const curProd = op.dataset.prods[prodId];
          const prodParts = {};
          Object.assign(
            prodParts, 
            op.dataset.standardProdParts[curProd.type].prodParts, 
            curProd.prodParts,
          );

          if (curProd.innateColorParts) {
            Object.keys(curProd.innateColorParts).forEach((partId) => {
              const cur = gltf.scene.children.find((item) => item.name === prodParts[partId]);

              if (cur) {
                if (cur.type && cur.type === 'Group') {
                  cur.children.forEach((c) => {
                    c.material.color = new Color(op.dataset.colors[curProd.innateColorParts[partId]].color);
                    c.material.color.convertSRGBToLinear();
                  });
                } else {
                  cur.material.color = new Color(op.dataset.colors[curProd.innateColorParts[partId]].color);
                  cur.material.color.convertSRGBToLinear();
                }
              } else {
                console.warn(`CBYC: ${partId} not found`);
              }
            });
          }

          // save to cache
          cache[prodId] = gltf;
          if (cb) cb();
        },
        (xhr) => {
          // console.log(`CBYC: Loading ${prodId}: ${xhr.loaded / xhr.total * 100}%`);
        },
        (error) => {
          console.warn('CBYC: Error in loading model', error);
        },
      );
    } else {
      console.warn('CBYC: Cannot find model data:', prodId);
    }
  };

  // setCurProd
  // -----------------------------------------
  const setCurProd = (productId, cb = null) => {
    const prodId = op.dataset.products[productId].modelid;
    prod = op.dataset.prods[prodId];
    prod.id = prodId;
    prod.productId = productId;

    if (!prod) {
      console.warn('CBYC: No prod data founded');
    } else {
      console.log(`CBYC: Set prod to ${prodId}`, prod);

      // clear stage
      this.clear();

      // set lights
      switch (prod.type) {
        case 'shoes':
          dlFront.intensity = 0.1;
          dlBack.intensity = 0;
          break;
        case 'clothing':
          dlFront.intensity = 0.4;
          dlBack.intensity = 0.3;
          break;
        default:
          break;
      }

      // load model
      if (cache[prodId]) {
        if (cache[prodId] !== 'loading') {
          mountProd(cache[prodId], prod);
          if (cb) cb();
        } else {
          setTimeout(() => {
            setCurProd(productId, cb);
          }, 100);
        }
      } else {
        loadProd(prodId, () => {
          if (productId === prod.productId) {
            mountProd(cache[prodId], prod);
            if (cb) cb();
          }
        });
      }
    }
  };

  // setProd
  // -----------------------------------------
  this.setProd = (productId, scene = 'focus') => {
    debug.timestart = new Date().getTime();
    setCurProd(productId, () => {
      debug.timeend = new Date().getTime();
      console.log(`CBYC: Mount model cost: ${debug.timeend - debug.timestart}ms`);
      setTimeout(() => {
        this.setSence('stage', scene);
      }, 1);
    });
  };

  // 
  // =========================================
  // ASSIST FUNCTIONS
  // =========================================
  // 

  // set model visible
  // -----------------------------------------
  const setModelVisible = (target, visible) => {
    if (target) {
      target.visible = visible;
    }
  };
  
  // reset camera
  // -----------------------------------------
  const resetCameraPos = () => {
    switch (prod.type) {
      case 'shoes':
      default:
        camera.position.set(-9, 0, 0);
        break;
      case 'clothing':
        camera.position.set(-0.00009865052484243558, 1.5296762095684602, 8.869029655297606);
        break;
    }
  };

  // 
  // =========================================
  // PRELOAD
  // =========================================
  // 
  let preloadTotal = 0;
  let preloaded = 0;
  const preloadOneItem = () => {
    preloaded += 1;
    console.log(`CBYC: Preloaded: ${preloaded}/${preloadTotal}`);
    if (preloaded === preloadTotal) {
      op.vm.$emit('preloadFinished');
    }
  };
  this.preload = (productId = null) => {
    if (productId) {
      const modelid = op.dataset.products[productId].modelid;
      if (!cache[modelid]) {
        preloadTotal = 1;
        preloaded = 0;
        loadProd(modelid, preloadOneItem);
      }
    } else if (Object.keys(op.dataset.products).length > 0) {
      const preloadModels = [];
      Object.keys(op.dataset.products).forEach((productId) => {
        const modelid = op.dataset.products[productId].modelid;
        if (preloadModels.indexOf(modelid) === -1) {
          preloadModels.push(modelid);
          loadProd(modelid, preloadOneItem);
        }
      });
      preloadTotal = preloadModels.length;
      preloaded = 0;
      console.log('CBYC: Preload models:', preloadModels);
    }
  };
  if (doPreload) {
    this.preload();
  }

  // 
  // =========================================
  // CT FUNCTIONS & METHODS
  // =========================================
  // 

  // set active ct
  // -----------------------------------------
  const setActiveCt = (active, caId) => {
    if (caId && stage.cts[caId]) {
      stage.cts[caId].setActive(active);
    } else {
      Object.keys(stage.cts).forEach((caId) => {
        stage.cts[caId].setActive(active);
      });
    }
    op.ctWrapEle.style.pointerEvents = active ? 'all' : 'none';
  };

  // addPatt
  // -----------------------------------------
  this.addPattObj = (caId, imgObj) => {
    imgObj.imagepath = op.dataset.images[imgObj.imageid].imagepath;
    stage.cts[caId].addImageObj(imgObj);
  };

  // addFixedPatt
  // -----------------------------------------
  const findCaIdByCfId = (cfId) => {
    let tar = null;
    Object.keys(prod.caParts).forEach((caId) => {
      if (prod.caParts[caId].cfParts 
        && prod.caParts[caId].cfParts[cfId]) {
        tar = caId;
      }
    });
    return tar;
  };

  this.addFixedPattObj = (caId, cfId, imgObj, tech) => {
    if (!caId) {
      caId = findCaIdByCfId(cfId);
    }
    imgObj.imagepath = op.dataset.images[imgObj.imageid].imagepath;
    if (caId) {
      stage.cts[caId].addFixedImageObj({
        cfId,
        pattData: imgObj,
        tech,
      });
    }
  };

  // addText
  // -----------------------------------------
  this.addText = (caId, text, font, color) => {
    stage.cts[caId].addText({
      text,
      font,
      color,
    });
  };

  this.addTextObj = (caId, textObj) => {
    stage.cts[caId].addTextObj(textObj);
  };

  // addTextPreset
  // -----------------------------------------
  this.addTextPreset = (caId, textPresetId) => {
    stage.cts[caId].addText(op.dataset.textPresets[textPresetId]);
  };

  // modify Text
  // -----------------------------------------
  this.modifyText = (pattObj, text, fontFamily, color) => {
    stage.cts[pattObj.caId].modifyText({
      uuid: pattObj.uuid,
      text,
      fontFamily,
      color,
    });
  };

  this.modifyTextObj = (pattObj, textObj) => {
    stage.cts[pattObj.caId].modifyText({
      uuid: pattObj.uuid,
      text: textObj.text,
      fontFamily: textObj.fontFamily,
      color: textObj.color,
    });
  };

  // reorder Patt
  // -----------------------------------------
  this.reorderPatt = (pattObj, dir) => stage.cts[pattObj.caId].reorderImage(pattObj.uuid, dir);

  // flip Patt
  // -----------------------------------------
  this.flipPatt = (pattObj, dir) => stage.cts[pattObj.caId].flipImage(pattObj, dir);

  // remove Patt
  // -----------------------------------------
  this.removePatt = (pattObj) => {
    stage.cts[pattObj.caId].removeImage(pattObj);
  };

  // clear Patt
  // -----------------------------------------
  this.clearPatt = (caId = null) => {
    if (caId) {
      stage.cts[caId].clear();
    } else {
      Object.keys(stage.cts).forEach((caId) => {
        stage.cts[caId].clear();
      });
    }
  };

  // limits
  // -----------------------------------------
  this.setCaLimit = (caId, limits) => {
    if (stage.cts[caId]) {
      stage.cts[caId].setLimits(limits);
    }
  };

  // set display
  // -----------------------------------------
  this.setDisplay = (display) => {
    Object.keys(stage.cts).forEach((caId) => {
      stage.cts[caId].setDisplay(display);
    });
  };

  // dev: set ct layer visible
  // -----------------------------------------
  this.setCtLayerVisible = (visible) => {
    op.ctWrapEle.className = visible ? 'cby-3dcore-ctexture-wrap test' : 'cby-3dcore-ctexture-wrap';
  };

  // 
  // ========================================
  // IMPORT & EXPORT
  // ========================================
  // 
 
  this.cachePattJSON = null;

  // import
  // -----------------------------------------
  this.loadPattFromJSON = (json) => {
    if (typeof (json) === 'string') {
      json = JSON.parse(json);
    }
    console.log('CBYC: load patt from JSON: ', json);
    Object.keys(json.caParts).forEach((caId) => {
      stage.cts[caId].loadPattFromJSON(json.caParts[caId]);
    });
  };

  // set custom preset
  this.setCustomPreset = (customPresetId, scene = 'focus', cb = null) => {
    if (op.dataset.customPresets[customPresetId]) {
      try {
        const jsonObj = op.dataset.customPresets[customPresetId].caJSON;
        console.log('CBYC: Custom Preset JSON:', jsonObj);
        setCurProd(jsonObj.productId, () => {
          this.loadPattFromJSON(jsonObj);
          if (jsonObj.colors) {
            Object.keys(jsonObj.colors).forEach((partId) => {
              this.setColor(partId, jsonObj.colors[partId]);
            });
          }
          if (scene !== null) {
            setTimeout(() => {
              this.setSence('stage', scene, cb);
            }, 10);
          }
        });
      } catch (error) {
        console.warn('CBYC: Err set custom preset', error);
      } 
    }
  };

  this.loadCustomJSON = (json) => {
    if (json) {
      try {
        let jsonObj = json;
        if (typeof (jsonObj) !== 'object') {
          jsonObj = JSON.parse(json);
        }
        console.log('CBYC: Preview load JSON:', jsonObj);
        setCurProd(jsonObj.productId, () => {
          this.setSize(jsonObj.size);
          if (jsonObj.colors) {
            Object.keys(jsonObj.colors).forEach((partId) => {
              this.setColor(partId, jsonObj.colors[partId]);
            });
          }
          this.loadPattFromJSON(jsonObj);
          this.setSence('stage', 'printPreview');
        });
      } catch (error) {
        console.warn('CBYC: Err loading JSON', error);
      }
    }
  };

  // export
  // -----------------------------------------
  this.exportCustomJSON = () => {
    const customJSON = {
      productId: prod.productId,
      modelId: prod.id,
      colors: stage.colors,
      size: stage.size,
      caParts: {},
    };
    Object.keys(stage.cts).forEach((caId) => {
      customJSON.caParts[caId] = stage.cts[caId].getExportJSON();
    });
    console.log('CBYC: export patt JSON', customJSON);
    return customJSON;
  };

  // export
  // -----------------------------------------
  // this.getExportPattJSON = () => {
  //   const exportPattJSON = {
  //     prodId: prod.id,
  //     caParts: {},
  //   };
  //   Object.keys(stage.cts).forEach((caId) => {
  //     exportPattJSON.caParts[caId] = stage.cts[caId].getExportJSON();
  //   });
  //   console.log('CBYC: export patt JSON', exportPattJSON);
  //   return exportPattJSON;
  // };

  // 
  // ========================================
  // SIZE FUNCTIONS & METHODS
  // ========================================
  // 
  this.setSize = (size) => {
    stage.size = size;
    if (stage.cts) {
      Object.keys(stage.cts).forEach((caId) => {
        if (!prod.sizes[size]) {
          console.warn('CBYC: Cannot find size data:', size);
        }
        // trans cm to inch
        stage.cts[caId].setSize(prod.sizes[size] * 0.393700787402);
      });
    }
  };

  // 
  // ========================================
  // COLOR FUNCTIONS & METHODS
  // ========================================
  // 
  
  // setColor
  // -----------------------------------------
  const setPartColor = (partId, colorId) => {
    if (op.dataset.colors[colorId]) {
      console.log('CBYC: Set color', partId, colorId);

      stage.colors[partId] = colorId;

      switch (partId) {
        case 'laces':
        case 'racingStripeUp':
        case 'racingStripeDown':
        case 'bumper':
        case 'toeCap':
          if (stage[partId]) {
            stage[partId].material.color = new Color(op.dataset.colors[colorId].color);
            stage[partId].material.color.convertSRGBToLinear();
          }
          break;
        case 'eyelets':
        case 'lacehole':
          if (stage.eyelets) {
            stage.eyelets.material.color = new Color(
              op.dataset.colors[colorId].color,
            );
            stage.eyelets.material.color.convertSRGBToLinear();
            stage.eyelets.material.metalness = op.dataset.colors[colorId].metalness 
              ? op.dataset.colors[colorId].metalness : 1;
          }
          break;
        case 'body':
          Object.keys(stage.cas).forEach((caId) => {
            stage.cts[caId].setColor(op.dataset.colors[colorId].color);
          });
          if (stage.bodyParts) {
            for (let i = 0; i < stage.bodyParts.length; i += 1) {
              stage.bodyParts[i].material.color = new Color(
                op.dataset.colors[colorId].color,
              );
              stage.bodyParts[i].material.color.convertSRGBToLinear();
            }
          }
          // add: switch label parts 
          if (prod.type === 'clothing') {
            if (op.dataset.colors[colorId].icClass) {
              switch (op.dataset.colors[colorId].icClass) {
                case 'white':
                  stage.icParts.black.forEach((ic) => {
                    ic.visible = false;
                  });
                  stage.icParts.white.forEach((ic) => {
                    ic.visible = true;
                  });
                  break;
                case 'black':
                  stage.icParts.white.forEach((ic) => {
                    ic.visible = false;
                  });
                  stage.icParts.black.forEach((ic) => {
                    ic.visible = true;
                  });
                  break;
                default:
                  break;
              }
            }
          }
          break;
        default:
          break;
      }
      stage.needsUpdateOnce = true;
    } else {
      console.warn('CBYC: color not found:', colorId);
    }
  };

  this.setColor = (partId, colorId) => {
    if (typeof (partId) !== 'object') {
      setPartColor(partId, colorId);
    } else {
      Object.keys(partId).forEach((p) => {
        setPartColor(p, partId[p]);
      });
    }
  };

  // 
  // ========================================
  // SCREEN FUNCTIONS & METHODS
  // ========================================
  // 

  // setBlur
  // -----------------------------------------
  this.setBlur = (doBlur) => {
    const blur = doBlur ? '10px' : '0px';
    op.canvasEle.style.filter = `blur(${blur})`;
  };

  // 
  // =========================================
  // DEV HELPERS
  // =========================================
  // 

  // DEV: correct ct trans
  // -----------------------------------------
  this.correctTrans = (params) => {
    stage.cts[params.caId].correctTrans(params.trans);
  };

  // DEV: log ct
  // -----------------------------------------
  this.logCt = (caId) => {
    if (caId && stage.cts[caId]) {
      stage.cts[caId].logCt();
    }
  };

  // DEV: raycaster
  // -----------------------------------------
  if (debug.enable && debug.raycaster) {
    const raycaster = new Raycaster();
    const mouse = new Vector2();
    const clickHandle = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      console.log(intersects);
      if (intersects[0]) {
        console.log(intersects[0]);
      }
      if (intersects[1]) {
        console.log(intersects[1]);
      }
    };
    op.canvasEle.addEventListener('click', clickHandle);
  }

  // DEV: Equivalent map area
  // -----------------------------------------
  let ema = {};
  if (debug.enable && debug.ema) {
    ema = {
      inited: false,
      obj: null,
      group: null,
      caId: null,
      edx: 0,
      edy: 0,
      eds: 1,
      mcache: null,
      loader: new TextureLoader(),
      testimg: './patterns/test-1000-gridtext.png',
    };
  }

  const calcEmaDis = () => {
    const cameraDir = new Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDir);
    const rc = new Raycaster(
      camera.position,
      cameraDir,
    );
    const hits = rc.intersectObject(ema.group, true);
    if (hits[0]) {
      return hits[0].distance;
    }
    return false;
  };

  const resetEmaPos = () => {
    const cameraDir = new Vector3(0, 0, -1);
    camera.getWorldDirection(cameraDir);
    const rc = new Raycaster(
      camera.position,
      cameraDir,
    );
    const hits = rc.intersectObject(stage.cas[stage.activeCaId], true);
    ema.group.position.set(hits[0].point.x,
      hits[0].point.y,
      hits[0].point.z);
  };

  const initEma = () => {
    const geometry = new PlaneGeometry(1, 1);
    const material = new MeshBasicMaterial({ 
      color: 0xffffff, 
      // side: THREE.DoubleSide, 
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    ema.obj = new Mesh(geometry, material);
    ema.group = new Group();
    ema.group.add(ema.obj);
    ema.inited = true;
    scene.add(ema.group);

    ema.loader.load(
      ema.testimg,
      (texture) => {
        ema.obj.material.map = texture;
        ema.obj.material.color = new Color('#ffff00');
        ema.obj.material.needsUpdate = true;
        stage.needsUpdateOnce = true;
      },
    );
  };

  const setEmaCaId = () => {
    if (!ema.inited) {
      initEma();
    }
    resetEmaPos();
    // set material for ca
    ema.loader.load(
      ema.testimg,
      (texture) => {
        if (stage.activeCaId) {
          stage.cas[stage.activeCaId].material.map = texture;
          stage.cas[stage.activeCaId].material.map.flipY = false;
          stage.cas[stage.activeCaId].material.color = new Color('#00ffff');
          // flipx
          if (stage.activeCaId === 'caSRI' 
          || stage.activeCaId === 'caSRO'
          || stage.activeCaId === 'caCLS'
          || stage.activeCaId === 'caCRS') {
            stage.cas[stage.activeCaId].material.map.wrapS = RepeatWrapping;
            stage.cas[stage.activeCaId].material.map.repeat.x = prod.caParts[stage.activeCaId].repeatX ? prod.caParts[stage.activeCaId].repeatX : 1;
          }
          stage.cas[stage.activeCaId].material.needsUpdate = true;
        }
        stage.needsUpdateOnce = true;
      },
    );
    ema.caId = stage.activeCaId;
    ema.edx = prod.caParts[ema.caId].trans.edx;
    ema.edy = prod.caParts[ema.caId].trans.edy;
    ema.eds = prod.caParts[ema.caId].trans.eds;
  };

  const updateEma = () => {
    if (ema.inited) {
      ema.obj.position.x = ema.edx;
      ema.obj.position.y = ema.edy;
      ema.obj.scale.x = ema.eds;
      ema.obj.scale.y = ema.eds;
      ema.group.lookAt(camera.position);
    }
  };

  this.switchEmaMode = (on) => {
    if (on) {
      ema.mcache = stage.cas[stage.activeCaId].material.map;
      setEmaCaId();
    } else {
      stage.cas[stage.activeCaId].material.map = ema.mcache;
    }
    // hide all
    for (let i = 0; i < stage.modelA.children.length; i += 1) {
      stage.modelA.children[i].visible = !on;
      if (stage.modelB) stage.modelB.children[i].visible = !on;
    }
    // 
    ema.group.visible = on;
    // display cur
    stage.cas[stage.activeCaId].visible = true;
    stage.cas[stage.activeCaId].material.transparent = on;
    stage.cas[stage.activeCaId].material.opacity = on ? 0.5 : 1;
    stage.cas[stage.activeCaId].material.needsUpdate = true;
    stage.cas[stage.activeCaId].material.depthWrite = !on;

    stage.needsUpdateOnce = true;
  };

  this.setEmaValue = (tar, step) => {
    ema[tar] += step;
    console.log('Ema Trans:', `
      "edx": ${ema.edx},
      "edy": ${ema.edy},
      "eds": ${ema.eds},
      "edis": ${calcEmaDis()}
    `);
    stage.needsUpdateOnce = true;
  };

  // DEV: get view params
  // -----------------------------------------
  this.getViewParams = () => {
    console.log('camera ptr', controls.getPolarAngle(),
      controls.getAzimuthalAngle(),
      controls.getDistance());
    console.log('camera xyz', camera.position.x,
      camera.position.y,
      camera.position.z);
    if (ema.group) {
      console.log('ema dis', calcEmaDis());
    }
  }; 

  // DEV: get renderer info
  // -----------------------------------------
  this.getRendererInfo = () => {
    console.log(renderer.info);
  };

  // 
  // ========================================
  // THUMBNAIL
  // ========================================
  // 
  const download = (src, name = 'thumbnail') => {
    const oA = document.createElement('a');
    oA.download = name;
    oA.href = src;
    document.body.appendChild(oA);
    oA.click();
    oA.remove();
  };

  this.makeThumbnail = (cb = null) => {
    controls.enable = false;
    // 
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = 1000;
    tmpCanvas.height = 1000;
    const scale = tmpCanvas.height / renderer.domElement.height;
    const tmpCanvasCtx = tmpCanvas.getContext('2d');
    tmpCanvasCtx.drawImage(renderer.domElement, 
      0, 0, renderer.domElement.width, renderer.domElement.height,
      (tmpCanvas.width - renderer.domElement.width * scale) / 2, 0, 
      renderer.domElement.width * scale, 
      tmpCanvas.height);
    stage.thumbnail = tmpCanvas.toDataURL('image/png');
    if (debug.enable) {
      download(stage.thumbnail);
    }
    if (cb) cb();
  };

  // 
  // ========================================
  // SCENE FUNCTIONS & METHODS
  // ========================================
  // 

  // tween view
  // -----------------------------------------
  let tweenView = null;
  const animateView = (sceneInfo, cb = null) => {
    const c = {
      p: 1.5707963267948966,
      t: -1.5707963267948966,
      r: 7,
      tx: 0,
      ty: 0,
      tz: 0,
    };
    const params = {
      dur: 600,
      cb: null,
      controls: 1,
    };
    Object.assign(c, sceneInfo.c);
    Object.assign(params, sceneInfo);

    if (params.dur === 0) {
      controls.dirmove = true;
      controls.dirPhi = c.p;
      controls.dirTheta = c.t;
      controls.dirDis = c.r;
      controls.target.x = c.tx;
      controls.target.y = c.ty;
      controls.target.z = c.tz;
      stage.needsUpdate = true;
      if (cb) cb();
    } else if (!tweenView) {
      tweenView = new TWEEN.Tween({
        p: controls.getPolarAngle(),
        t: controls.getAzimuthalAngle(),
        r: controls.getDistance(),
        tx: controls.target.x,
        ty: controls.target.y,
        tz: controls.target.z,
      });
      tweenView.to(c, params.dur);
      tweenView.onUpdate((obj) => {
        controls.dirPhi = obj.p;
        controls.dirTheta = obj.t;
        controls.dirDis = obj.r;
        controls.target.x = obj.tx;
        controls.target.y = obj.ty;
        controls.target.z = obj.tz;
      });
      tweenView.onComplete(() => {
        tweenView.stop();
        tweenView = null;
        controls.dirmove = false;
        stage.needsUpdate = false;
        controls.enabled = !!params.controls;
        if (params.cb) params.cb();
        if (cb) cb();
      });
      controls.dirmove = true;
      controls.enabled = false;
      stage.needsUpdate = true;
      tweenView.easing(TWEEN.Easing.Cubic.Out);
      tweenView.start();
    }
  };

  // tween prod
  // -----------------------------------------
  let tweenProd = null;
  const animateProd = (sceneInfo) => {
    const params = {
      p: {
        px: 0,
        py: 0,
        rx: 0,
      },
      dur: 500,
    };
    Object.assign(params.p, sceneInfo.p);
    params.dur = sceneInfo.dur !== undefined ? sceneInfo.dur : 500;
    if (params.dur === 0) {
      if (stage.modelA) {
        stage.modelA.position.x = params.p.px;
        stage.modelA.position.y = prod.centerOffset.y + params.p.py;
        stage.modelA.rotation.x = params.p.rx;
      }
      if (stage.modelB) {
        stage.modelB.position.x = -params.p.px;
        stage.modelB.position.y = prod.centerOffset.y + params.p.py;
        stage.modelB.rotation.x = params.p.rx;
      }
    } else if (!tweenProd && (
      stage.modelA.position.x !== params.p.px 
        || stage.modelA.position.y !== params.p.py
        || stage.modelA.rotation.x !== params.p.rx)) {
      if (stage.modelA) {
        tweenProd = new TWEEN.Tween({
          px: stage.modelA.position.x,
          py: stage.modelA.position.y - prod.centerOffset.y,
          rx: stage.modelA.rotation.x,
        });
        tweenProd.to(params.p, params.dur);
        tweenProd.onUpdate((obj) => {
          stage.modelA.position.x = obj.px;
          stage.modelA.position.y = prod.centerOffset.y + obj.py;
          stage.modelA.rotation.x = obj.rx;
          if (stage.modelB) {
            stage.modelB.position.x = -obj.px;
            stage.modelB.position.y = prod.centerOffset.y + obj.py;
            stage.modelB.rotation.x = obj.rx;
          }
        });
        tweenProd.onComplete(() => {
          tweenProd.stop();
          tweenProd = null;
        });
        tweenProd.easing(TWEEN.Easing.Cubic.Out);
        tweenProd.start();
      }
    }
  };

  // setScene
  // -----------------------------------------
  this.setSence = (type, scene, cb = null) => {
    // inactive stage.cts
    setActiveCt(false);
    // 
    if (op.dataset.scenes[prod.type][type][scene]) {
      const sceneInfo = op.dataset.scenes[prod.type][type][scene];
      setModelVisible(stage.modelA, !sceneInfo.hA);
      setModelVisible(stage.modelB, !sceneInfo.hB);
      animateView(sceneInfo, cb);
      animateProd(sceneInfo);
      if (type === 'ca') {
        setActiveCt(true, scene);
      }
      stage.activeCaId = type === 'ca' ? scene : null;
      // move
      if (sceneInfo.m) {
        op.wrapEle.style.transform = `translate3d(${sceneInfo.m.x * 100}%,0,0)`;
      } else {
        op.wrapEle.style.transform = 'translate3d(0,0,0)';
      }
      // 
      if (type === 'stage' && scene === 'finish') {
        setTimeout(() => {
          this.makeThumbnail(() => {
            op.vm.$emit('thumbnailCreated', stage.thumbnail);
          });
        }, 501);
      }
    } else {
      console.warn('CBYC: Scene not found.');
    }
  };

  // 
  // ========================================
  // DEV: RENDER SEQUENCE
  // ========================================
  // 

  let doRenderSequence = false;

  const renderOneFrame = (sequence, index, frame, loaded = false) => {
    if (doRenderSequence) {
      if (frame === 0 && !loaded) {
        // seek if has next
        index += 1;
        if (sequence[index]) {
          this.setCustomPreset(sequence[index], 'renderSequence', () => {
            setTimeout(() => {
              renderOneFrame(sequence, index, 0, true);
            }, 500);
          });
        } else {
          controls.dirmove = false;
          controls.enable = true;
          stage.needsUpdate = false;
          console.log('CBYC: render sequence finished');
        }
      } else {
        controls.dirTheta = -Math.PI + frame * Math.PI * 2 / 360;
        stage.needsUpdateOnce = true;
        controls.update();
        renderer.render(scene, camera);
        const frameImage = renderer.domElement.toDataURL('image/png');
        download(frameImage, `rs-${index}-${frame}`);
        console.log(`CBYC: render sequence: ${index}-${frame}`);
        frame += 1;
        frame %= 360;
        setTimeout(() => {
          renderOneFrame(sequence, index, frame);
        }, 10);
      }
    } else {
      controls.dirmove = false;
      controls.enable = true;
      console.log('CBYC: render sequence stoped');
    }
  };

  this.renderSequence = (cpId) => {
    if (op.dataset.customPresets[cpId]) {
      doRenderSequence = true;
      controls.enable = false;
      controls.dirmove = true;
      stage.needsUpdate = true;
      renderOneFrame([cpId], -1, 0);
    } else {
      console.warn('CBYC: render sequence: custom preset id not found');
    }
  };

  this.stopRenderSequence = () => {
    doRenderSequence = false;
  };

  // 
  // ========================================
  // CLEAR
  // ========================================
  // 
  this.clear = () => {
    // clear stage.cts
    if (Object.keys(stage.cts).length) {
      Object.keys(stage.cts).forEach((ct) => {
        stage.cts[ct].dispose();
        delete stage.cts[ct];
      });
    }
    
    while (op.ctWrapEle.firstChild) {
      op.ctWrapEle.removeChild(op.ctWrapEle.firstChild);
    }

    // clear cas links
    if (Object.keys(stage.cas).length) {
      Object.keys(stage.cas).forEach((caId) => {
        delete stage.cas[caId];
      });
    }

    // clear animate
    if (tweenView) {
      tweenView.stop();
      tweenView = null;
    }
    if (tweenProd) {
      tweenProd.stop();
      tweenProd = null;
    }
    
    // clear model links
    stage.modelA = null;
    stage.modelB = null;
    stage.laces = null;
    stage.eyelets = null;
    stage.racingStripeUp = null;
    stage.racingStripeDown = null;
    stage.bodyParts = [];
    stage.icParts = [];
    stage.colors = {};
    stage.size = null;
    stage.thumbnail = null;

    // clear states
    stage.activeCaId = null;
    
    // dispose
    resTracker.dispose();
    
    // 
    controls.enabled = true;
    stage.needsUpdateOnce = true;
    resetCameraPos();
  };
};

export default CBYC;
