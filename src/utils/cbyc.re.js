/*
 * @Author: lby
 * @Date: 2021-08-02 15:48:15
 * @LastEditors: lby
 * @LastEditTime: 2022-01-11 14:26:30
 * @Description: Converse By You - 3D Core
 */
import * as TWEEN from '@tweenjs/tween.js';
// import * as THREE from 'three';
import {
  Vector2, Vector3, PerspectiveCamera, Scene, AmbientLight, DirectionalLight, WebGLRenderer, sRGBEncoding, CanvasTexture, RepeatWrapping, MirroredRepeatWrapping, TextureLoader, PlaneGeometry, MeshBasicMaterial, Mesh, Group, Color, Raycaster, AxesHelper, DirectionalLightHelper,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as Stats from 'stats.js';
import OrbitControls from './OrbitControls';
import ResourceTracker from './ResourceTracker';
// import CTexture from './CTexture.re';
import CTextureV2 from './CTexture.re.v2';

const CBYC = function (op) {
  // 
  // =========================================
  // INIT
  // =========================================
  // 

  // debug
  const debug = {
    enable: !!op.debug,  //true
    stats: true,
    axes: true,
    raycaster: false,
    ctLayer: false,
    ema: true,
    pattControls: false,
    fabricBoard: true,
    fabricMask: true,
    lightHelper: true,
  };
  //不会触发传下的是个布尔值
  if (typeof (op.debug) === 'object') {
    Object.assign(debug, op.debug);
  }

  // loader
  const loader = new GLTFLoader();
  loader.setCrossOrigin(true);//跨域共享资源

  // cache
  const cache = {};

  // use cache
  const useCache = op.useCache === true;

  // force free res
  const forceFreeRes = op.forceFreeRes !== false;

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

  // ctres
  const ctRes = [];

  // resTracker
  //总的来说，ResourceTracker 类可以有效地追踪 three.js 库中的资源对象，并在不需要使用它们时进行清理，从而避免内存泄漏等问题。
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
  
  // const dlRightTarget = new THREE.Object3D();
  // dlRightTarget.name = 'dlLightTarget';
  // dlRightTarget.position.set(0, 0.8, -1.2);
  // dlRight.target = dlRightTarget;
  // dlRight.target.updateMatrixWorld();
  // scene.add(dlRight.target);
  const lights = {
    top: new DirectionalLight(0xffffff, 0.5),
    bottom: new DirectionalLight(0xffffff, 0.5),
    left: new DirectionalLight(0xffffff, 0.5),
    right: new DirectionalLight(0xffffff, 0.5),
    front: new DirectionalLight(0xffffff, 0.5),
    back: new DirectionalLight(0xffffff, 0.5),
    ambient: new AmbientLight(0xffffff, 0.1),
  };

  const lightHelper = {};
  Object.keys(lights).forEach((light) => {
    scene.add(lights[light]);
    if (debug.enable && debug.lightHelper) {
      if (light !== 'ambient') {
        lightHelper[light] = new DirectionalLightHelper(lights[light], 0.2);
        scene.add(lightHelper[light]);
      }
    }
  });
  
  // #endregion

  // renderer
  // -----------------------------------------
  const renderer = new WebGLRenderer({
    antialias: true,//：开启抗锯齿，可以让渲染的图像更加平滑
    canvas: op.canvasEle,//指定渲染器要渲染到的 HTML5 Canvas 元素。
    alpha: true,  //开启透明度支持，可以让场景中的元素透过其他元素看到后面的内容
    preserveDrawingBuffer: true, //开启绘图缓冲区保留，可以让我们在渲染完成后获取渲染结果的快照。
  });
  renderer.setPixelRatio(window.devicePixelRatio);// 设置了设备像素比，这是为了在高 DPI 的屏幕上渲染更清晰的图像。
  renderer.setSize(stage.w, stage.h);
  renderer.outputEncoding = sRGBEncoding;//将输出编码设置为 sRGB 编码，这是为了在显示颜色时保证颜色的准确性。

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
  let stats = null;   //性能动画库
  if (debug.enable && debug.stats) {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
  }

  // axesHelper
  // -----------------------------------------
  if (debug.enable && debug.axes) {
    const axesHelper = new AxesHelper(5);  //辅助对象
    scene.add(axesHelper);
  }
  
  // 
  // =========================================
  // MAIN LOOP
  // =========================================
  //  渲染
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
  // CTextures
  // =========================================
  // 
  const updateOnce = () => {
    stage.needsUpdateOnce = true;
  };
  const emit = (event, payload) => {
    op.vm.$emit(event, payload);
  };

  const initCtres = () => {
    for (let i = 0; i < 4; i += 1) {
      // ctRes[i] = new CTexture({
      //   domWrapper: op.ctWrapEle,
      //   fov: controls.object.fov,
      //   dataset: op.dataset,
      //   debug: debug.enable && debug.fabricBoard,
      //   showMask: debug.enable && debug.fabricMask,
      //   updateOnce,
      //   emit,
      // });
      ctRes[i] = new CTextureV2({
        dataset: op.dataset,   //所有的资源
        domWrapper: op.ctWrapEle,  //canvas元素
        fov: controls.object.fov,
        debug: debug.enable && debug.fabricBoard,
        showMask: debug.enable && debug.fabricMask,
        pattControls: debug.enable && debug.pattControls,
        updateOnce,
        emit,
      });
    }
   
  };
  initCtres();
 
  // =========================================
  // PROD FUNCTIONS & METHODS
  // =========================================
  // 
  const mountProd = (modelData) => {
    //  console.log(modelData,'modelData');
    // link the model parts
    // -------------------------------------
    stage.modelA = modelData.modelA;
    stage.modelA.position.y = prod.centerOffset.y;
    stage.modelB = modelData.modelB;
    if (stage.modelB) {
      stage.modelB.position.y = prod.centerOffset.y;
    }



    const caIds = {
      shoes: ['caSLO', 'caSRO', 'caSLI', 'caSRI'],
      clothing: ['caCFT', 'caCBK', 'caCLS', 'caCRS'],
      // clothing: ['caCFT', 'caCLS', 'caCRS', 'caCBK'],
    };

    // const product = op.dataset.products[prod.productId];
    
    switch (prod.type) {
      case 'shoes':
        stage.laces = modelData.laces;
        stage.eyelets = modelData.eyelets;
        stage.racingStripeUp = modelData.racingStripeUp;
        stage.racingStripeDown = modelData.racingStripeDown;
        stage.bodyParts = modelData.bodyParts;
        stage.cas = modelData.cas;
        // for (let i = 0; i < product.faces.length; i += 1) {
        //   const face = product.faces[i];
        //   const caId = Object.values(op.dataset.sides)
        //     .find((item) => item.sideid === face.faceid).sidecode;
        //   ctRes[i].reset({
        //     productId: prod.productId,
        //     faceId: face.faceid,
        //     caId,
        //     targetMap: modelData.cas[caId].material.map,
        //     innateMap: modelData.cas[caId].innateMap,
        //     innateMapFlipX: !!modelData.cas[caId].innateMapFlipX,
        //     caData: prod.caParts[caId],
        //     size: null,
        //   });
        //   stage.cts[caId] = ctRes[i];
        // }
        for (let i = 0; i < caIds.shoes.length; i += 1) {
          ctRes[i].reset({
            productId: prod.productId,
            faceId: Object.values(op.dataset.sides)
              .find((item) => item.sidecode === caIds.shoes[i]).sideid,
            caId: caIds.shoes[i],
            targetMap: modelData.cas[caIds.shoes[i]].material.map,
            innateMap: modelData.cas[caIds.shoes[i]].innateMap,
            innateMapFlipX: !!modelData.cas[caIds.shoes[i]].innateMapFlipX,
            caData: prod.caParts[caIds.shoes[i]],
            size: null,
          });
          stage.cts[caIds.shoes[i]] = ctRes[i];
        }
        break;
      case 'clothing':
        stage.bodyParts = modelData.bodyParts;
        stage.cas = modelData.cas;
        stage.icParts = modelData.icParts;

        // for (let i = 0; i < product.faces.length; i += 1) {
        //   const face = product.faces[i];
        //   const curCaId = Object.values(op.dataset.sides)
        //     .find((item) => item.sideid === face.faceid).sidecode;
        //   console.log(curCaId);
        //   const params = {
        //     productId: prod.productId,
        //     // faceId: face.faceid,
        //     caId: curCaId,
        //     targetMap: modelData.cas[curCaId].material.map,
        //     innateMap: modelData.cas[curCaId].innateMap,
        //     innateMapFlipX: !!modelData.cas[curCaId].innateMapFlipX,
        //     caData: prod.caParts[curCaId],
        //     size: null,
        //   };
        //   ctRes[i].reset(params);
        //   console.log(params);
        //   stage.cts[curCaId] = ctRes[i];
        // }

        for (let i = 0; i < caIds.clothing.length; i += 1) {
          // console.log(prod.caParts[caIds.clothing[i]]);
          const params = {
            productId: prod.productId,
            caId: caIds.clothing[i],
            faceId: Object.values(op.dataset.sides)
              .find((item) => item.sidecode === caIds.clothing[i]).sideid,
            targetMap: modelData.cas[caIds.clothing[i]].material.map,
            innateMap: modelData.cas[caIds.clothing[i]].innateMap,
            innateMapFlipX: !!modelData.cas[caIds.clothing[i]].innateMapFlipX,
            caData: prod.caParts[caIds.clothing[i]],
            size: null,
          };
          // console.log(params);
          ctRes[i].reset(params);
          stage.cts[caIds.clothing[i]] = ctRes[i];
        }
        break;
      default:
        break;
    }

    // set default color
    if (prod.customColorParts) {
      Object.keys(prod.customColorParts).forEach((partId) => {
        setPartColor(
          partId,
          prod.customColorParts[partId],
        );
      });
    }

    // add to scene

    
    if (forceFreeRes) {
      scene.add(track(stage.modelA));
      if (stage.modelB) {
        scene.add(track(stage.modelB));  
      }
    } else {
      scene.add(stage.modelA);
      if (stage.modelB) {
        scene.add(stage.modelB);  
      }
    }

    controls.enabled = true;
    stage.needsUpdateOnce = true;
  };

  const preTreatmentProd = (prodId, gltf) => {
    const prodInfo = op.dataset.prods[prodId];
    console.log(prodInfo,'prodInfo');
    const modelData = {
      type: prodInfo.type,
      // models
      modelA: null,
      modelB: null,
      // colorparts
      laces: null,
      eyelets: null,
      racingStripeUp: null,
      racingStripeDown: null,
      bodyParts: [],
      // inverse color parts
      icParts: {
        white: [],
        black: [],
      },
      // ca parts
      cas: {},
      // default colors
      colors: {},
    };

    // prod parts
    const prodParts = {};
    Object.assign(
      prodParts, 
      op.dataset.standardProdParts[prodInfo.type].prodParts, 
      prodInfo.prodParts,
    );
    console.log(prodParts,'prodParts');

    // set innate part colors
    if (prodInfo.innateColorParts) {
      Object.keys(prodInfo.innateColorParts).forEach((partId) => {
        const cur = gltf.scene.children.find((item) => item.name === prodParts[partId]);
        if (cur) {
          if (cur.type && cur.type === 'Group') {
            cur.children.forEach((c) => {
              c.material.color = new Color(op.dataset.colors[prodInfo.innateColorParts[partId]].color);
              c.material.color.convertSRGBToLinear();
            });
          } else {
            cur.material.color = new Color(op.dataset.colors[prodInfo.innateColorParts[partId]].color);
            cur.material.color.convertSRGBToLinear();
          }
        } else {
          console.warn(`CBYC: ${partId} not found`);
        }
      });
    }

    // set basic position
    gltf.scene.position.set(
      prodInfo.centerOffset.x,
      prodInfo.centerOffset.y,
      prodInfo.centerOffset.z,
    );
    
    // deal with the model parts
    let crt = null;
    switch (prodInfo.type) {
      case 'shoes':
        // models
        modelData.modelA = gltf.scene;
        modelData.modelA.name = 'modelA';
        modelData.modelA.rotation.y = prodInfo.rotationY;
        modelData.modelA.position.x = 0;

        modelData.modelB = gltf.scene.clone();
        modelData.modelB.name = 'modelB';
        modelData.modelB.rotation.y = -prodInfo.rotationY;
        modelData.modelB.scale.x = -1;
        modelData.modelB.visible = false;

        // model parts
        for (let i = 0; i < modelData.modelA.children.length; i += 1) {
          // console.log(stage.modelA.children[i].name);
          crt = modelData.modelA.children[i];
        
          switch (crt.name) {
            case prodParts.outside:   //左边鞋子
              // caSLO
              // --------------------------------
              modelData.cas.caSLO = crt;
              modelData.cas.caSLO.innateMap = crt.material.map.image;
              modelData.cas.caSLO.material.map.dispose();
              modelData.cas.caSLO.material.map = new CanvasTexture(ctRes[0].mixer);
              modelData.cas.caSLO.material.map.encoding = sRGBEncoding;
              modelData.cas.caSLO.material.map.flipY = false;
              modelData.cas.caSLO.material.map.needsUpdate = true;
              // 
              // caSRO
              // --------------------------------
              modelData.cas.caSRO = modelData.modelB.children[i];
              modelData.cas.caSRO.innateMap = modelData.cas.caSLO.innateMap;
              modelData.cas.caSRO.innateMapFlipX = true;
              modelData.cas.caSRO.material = crt.material.clone();
              modelData.cas.caSRO.material.map.dispose();
              modelData.cas.caSRO.material.map = new CanvasTexture(ctRes[1].mixer);
              modelData.cas.caSRO.material.map.encoding = sRGBEncoding;
              modelData.cas.caSRO.material.map.wrapS = RepeatWrapping;
              modelData.cas.caSRO.material.map.repeat.x = -1;
              modelData.cas.caSRO.material.map.flipY = false;
              modelData.cas.caSRO.material.map.needsUpdate = true;
              modelData.cas.caSRO.material.normalMap.wrapS = MirroredRepeatWrapping;
              break;
            case prodParts.inside:  //右边鞋子
              // caSLI
              // --------------------------------
              modelData.cas.caSLI = crt;
              modelData.cas.caSLI.innateMap = crt.material.map.image;
              modelData.cas.caSLI.material.map.dispose();
              modelData.cas.caSLI.material.map = new CanvasTexture(ctRes[2].mixer);
              modelData.cas.caSLI.material.map.encoding = sRGBEncoding;
              modelData.cas.caSLI.material.map.flipY = false;
              modelData.cas.caSLI.material.map.needsUpdate = true;

              // caSRI
              // --------------------------------
              modelData.cas.caSRI = modelData.modelB.children[i];
              modelData.cas.caSRI.innateMap = modelData.cas.caSLI.innateMap;
              modelData.cas.caSRI.innateMapFlipX = true;
              modelData.cas.caSRI.material = crt.material.clone();
              modelData.cas.caSRI.material.map.dispose();
              modelData.cas.caSRI.material.map = new CanvasTexture(ctRes[3].mixer);
              modelData.cas.caSRI.material.map.encoding = sRGBEncoding;
              modelData.cas.caSRI.material.map.wrapS = RepeatWrapping;
              modelData.cas.caSRI.material.map.repeat.x = -1;
              modelData.cas.caSRI.material.map.flipY = false;
              modelData.cas.caSRI.material.map.needsUpdate = true;
              modelData.cas.caSRI.material.normalMap.wrapS = MirroredRepeatWrapping;

              break;
            case prodParts.laces:
              modelData.laces = crt;
              modelData.modelB.children[i].material = crt.material;     
              break;
            case prodParts.eyelets:
              modelData.eyelets = crt;
              modelData.modelB.children[i].material = crt.material;
              break;
            case prodParts.racingStripeUp:
              modelData.racingStripeUp = crt;
              modelData.modelB.children[i].material = crt.material;
              break;
            case prodParts.racingStripeDown:
              modelData.racingStripeDown = crt;
              modelData.modelB.children[i].material = crt.material;     
              break;
            case prodParts.heel:
            case prodParts.tongue:
            case prodParts.inner:
              modelData.bodyParts.push(crt);
              modelData.modelB.children[i].material = crt.material;
              break;
            case prodParts.roundLabel:
            case prodParts.heelLabel:
            case prodParts.tongueLabel:
            case prodParts.insole:
              modelData.modelB.children[i].material = crt.material.clone();
              modelData.modelB.children[i].material.map = modelData.modelB.children[i].material.map.clone();
              modelData.modelB.children[i].material.map.repeat.x = -1;
              modelData.modelB.children[i].material.map.needsUpdate = true;
              break;
            default:
              break;
          }
        }
        break;
      case 'clothing':
        // models
        modelData.modelA = gltf.scene;
        modelData.modelA.name = 'modelA';
        if (prodInfo.scale) {
          modelData.modelA.scale.x = prodInfo.scale;
          modelData.modelA.scale.y = prodInfo.scale;
          modelData.modelA.scale.z = prodInfo.scale;
        }

        // model parts
        for (let i = 0; i < modelData.modelA.children.length; i += 1) {
          // console.log(stage.modelA.children[i].name);
          crt = modelData.modelA.children[i];

          switch (crt.name) {
            case prodParts.front:
              // caCFT
              // --------------------------------
              modelData.cas.caCFT = crt;
              modelData.cas.caCFT.innateMap = crt.material.map.image;
              modelData.cas.caCFT.material.map = new CanvasTexture(ctRes[0].mixer);
              modelData.cas.caCFT.material.map.encoding = sRGBEncoding;
              modelData.cas.caCFT.material.map.flipY = false;
              modelData.cas.caCFT.material.map.needsUpdate = true;
              break;
            case prodParts.back:
              // caCBK
              // --------------------------------
              modelData.cas.caCBK = crt;
              modelData.cas.caCBK.innateMap = crt.material.map.image;
              modelData.cas.caCBK.material.map = new CanvasTexture(ctRes[1].mixer);
              modelData.cas.caCBK.material.map.encoding = sRGBEncoding;
              modelData.cas.caCBK.material.map.flipY = false;
              modelData.cas.caCBK.material.map.needsUpdate = true;
              break;
            case prodParts.left:
              // caCLS
              // --------------------------------
              modelData.cas.caCLS = crt;
              modelData.cas.caCLS.innateMap = crt.material.map.image;
              modelData.cas.caCLS.material.map = new CanvasTexture(ctRes[2].mixer);
              modelData.cas.caCLS.material.map.encoding = sRGBEncoding;
              modelData.cas.caCLS.material.map.flipY = false;
              modelData.cas.caCLS.material.map.needsUpdate = true;
              break;
            case prodParts.right:
              // caCRS
              // --------------------------------
              modelData.cas.caCRS = crt;
              modelData.cas.caCRS.innateMap = crt.material.map.image;
              modelData.cas.caCRS.material.map = new CanvasTexture(ctRes[3].mixer);
              modelData.cas.caCRS.material.map.encoding = sRGBEncoding;
              modelData.cas.caCRS.material.map.wrapS = RepeatWrapping;
              modelData.cas.caCRS.material.map.repeat.x = prodInfo.caParts.caCRS.repeatX ? prodInfo.caParts.caCRS.repeatX : 1;
              modelData.cas.caCRS.material.map.flipY = false;
              modelData.cas.caCRS.material.map.needsUpdate = true;
              break;
            case prodParts.collar:
            case prodParts.inner:
            case prodParts.elastic:
            case prodParts.hood:
            case prodParts.pocket:
            case prodParts.rope:
            case prodParts.gromet:
              modelData.bodyParts.push(crt);
              break;
            case prodParts.labelAtWhite:
              crt.visible = false;
              modelData.icParts.white.push(crt);
              break;
            case prodParts.labelAtBlack:
              crt.visible = false;
              modelData.icParts.black.push(crt);
              break;
            default:
              break;
          }
        }
        break;
      default:
        break;
    }
   
    return modelData;
  };

  const loadProd = (prodId, cb = null) => {
    const loadTarget = op.dataset.prods[prodId];
    if (loadTarget) {
      cache[prodId] = 'loading';
      loader.load(
        loadTarget.model,
        (gltf) => {
          // console.log(`CBYC: Loaded ${prodId}`);

          // pre treatment & save to cache
          cache[prodId] = preTreatmentProd(prodId, gltf);
          // if (useCache) {
          //   cache[prodId] = preTreatmentProd(prodId, gltf);
          // } else {
          //   cache[prodId] = null;
          // }

          // callback  //
          if (cb) cb(); // mountProd(cache[prodId]);
        },
        () => {
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
    // clear stage
    this.clear();
    
    const prodId = op.dataset.products[productId].modelid;
    prod = op.dataset.prods[prodId];
    prod.id = prodId;
    prod.productId = productId;
    console.log(prod,'prod');
    if (!prod) {
      console.warn('CBYC: No prod data founded');
    } else {
      // console.log(`CBYC: Set prod to ${prodId}`, prod);
      //鞋子"shoes"
      // set lights
      switch (prod.type) {
        case 'shoes':

          // console.log(prod.id);
          
          // if (prod.id === 99) {
          // old
          lights.top.position.set(0, 3, 0);
          lights.bottom.position.set(1, -2, 1);
          lights.left.position.set(2, 1.5, -0.3);
          lights.right.position.set(-2, 1.5, -0.3);
          lights.front.position.set(0, -0.5, 3);
          lights.back.position.set(0, 0, -3);
          // 
          lights.front.intensity = 0.1;
          lights.back.intensity = 0.2;
          lights.left.intensity = 0.9;
          lights.right.intensity = 0.9;
          lights.top.intensity = 0.1;
          lights.bottom.intensity = 0.3;
          lights.ambient.intensity = 0.05;
          // } else {
          //   // new
          //   lights.top.position.set(0, 3, 3);
          //   lights.bottom.position.set(1, -2, 1);
          //   lights.left.position.set(2, 1, -0.3);
          //   lights.right.position.set(-2, 1, -0.3);
          //   lights.front.position.set(0, -0.5, 3);
          //   lights.back.position.set(0, 0, -3);
          //   // 
          //   lights.front.intensity = 0.1;
          //   lights.back.intensity = 0.2;
          //   lights.left.intensity = 0.7;
          //   lights.right.intensity = 0.7;
          //   lights.top.intensity = 0.1;
          //   lights.bottom.intensity = 0.1;
          //   lights.ambient.intensity = 0.27;
          // }

          // 
          // setControlsLimit('shoes');
          
          break;
        case 'clothing':
          lights.top.position.set(0, 3, 0);
          lights.bottom.position.set(1, -2, 1);
          lights.left.position.set(3, 0.6, 0.4);
          lights.right.position.set(-3, 0.6, 0.4);
          lights.front.position.set(0, 0, 3);
          lights.back.position.set(0, 0, -3);
          // 
          lights.front.intensity = 0.4;
          lights.back.intensity = 0.5;
          lights.left.intensity = 0.4;
          lights.right.intensity = 0.4;
          lights.top.intensity = 0.1;
          lights.bottom.intensity = 0;
          lights.ambient.intensity = 0.5;
          // 
          
          break;
        default:
          break;
      }

      if (debug.enable && debug.lightHelper) {
        Object.keys(lightHelper).forEach((light) => {
          // console.log(lightHelper[light]);
          lightHelper[light].update();
        });
      }
      console.log(stage,'stage22');
      // reset camera  调整相机
      resetCameraPos();
      console.log(stage,'stage111');
      // load model
      if (cache[prodId] && useCache) {   //首次不会加载
        if (cache[prodId] !== 'loading') {
          mountProd(cache[prodId]);
          if (cb) cb();
        } else {
          setTimeout(() => {
            setCurProd(productId, cb);
          }, 100);
        }
      } else {
        //进入
        loadProd(prodId, () => {
          if (productId === prod.productId) {
            mountProd(cache[prodId]);
            if (cb) cb();//调整相机位置
          }
        });
      }
    }
  };

  // setProd
  // -----------------------------------------
  this.setProd = (productId, scene = 'focus') => {
    // console.log(productId,scene,'scene' );  鞋子  2 focus 
    debug.timestart = new Date().getTime();
    setCurProd(productId, () => {
      debug.timeend = new Date().getTime();
      // console.log('CBYC: Mount model cost', debug.timeend - debug.timestart);
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
    this.setSence('stage', 'reset');
  };

  // set camera limit
  const setControlsLimit = (type) => {
    switch (type) {
      case 'shoes':
        controls.minDistance = 9.2;
        controls.maxDistance = 14;
        controls.maxPolarAngle = Math.PI;
        controls.minPolarAngle = 0;
        controls.enableZoom = true;
        controls.enablePan = false;
        break;
      case 'clothing':
        controls.minDistance = 7.5;
        controls.maxDistance = 12;
        controls.maxPolarAngle = Math.PI / 2 + 0.6;
        controls.minPolarAngle = Math.PI / 2 - 0.6;
        controls.enableZoom = true;
        controls.enablePan = false;
        break;
      case 'finish':
        controls.maxPolarAngle = Math.PI / 2;
        controls.minPolarAngle = Math.PI / 2;
        controls.enableZoom = false;
        controls.enablePan = false;
        break;
      case 'printPreview':
        controls.maxPolarAngle = Math.PI;
        controls.minPolarAngle = 0;
        controls.minDistance = 3;
        controls.maxDistance = 14;
        controls.enableZoom = true;
        controls.enablePan = true;
        break;
      default:
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
      emit('preloadFinished');
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
  if (op.preload !== false && useCache) {
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
    while (op.ctWrapEle.firstChild) {
      op.ctWrapEle.removeChild(op.ctWrapEle.firstChild);
    }
    if (caId && stage.cts[caId]) {
      stage.cts[caId].setActive(active);
    } 
    op.ctWrapEle.style.pointerEvents = active ? 'all' : 'none';
  };

  // addPatt
  // -----------------------------------------
  // this.addPattObj = (caId, cfId, imgObj, tech) => {
  //   imgObj.imagepath = op.dataset.images[imgObj.imageid].imagepath;
  //   // console.log(caId);
  //   stage.cts[caId].addImageObj({
  //     cfId,
  //     pattData: imgObj,
  //     tech,
  //   });
  // };

  // addFixedPatt
  // -----------------------------------------
  // const findCaIdByCfId = (cfId) => {
  //   let tar = null;
  //   Object.keys(prod.caParts).forEach((caId) => {
  //     if (prod.caParts[caId].cfParts 
  //       && prod.caParts[caId].cfParts[cfId]) {
  //       tar = caId;
  //     }
  //   });
  //   return tar;
  // };

  // this.addFixedPattObj = (caId, cfId, imgObj, tech) => {
  //   if (!caId) {
  //     caId = findCaIdByCfId(cfId);
  //   }
  //   imgObj.imagepath = op.dataset.images[imgObj.imageid].imagepath;
  //   if (caId) {
  //     stage.cts[caId].addFixedImageObj({
  //       cfId,
  //       pattData: imgObj,
  //       tech,
  //     });
  //   }
  // };

  const techNames = {
    1: 'print',
    2: 'embroidery',
    3: 'hotPadding',
  };


  //添加图片
  this.addPattObjToPart = (faceId, partId, imgObj, techid, groupPartId, subPartId) => {
    // 
    const cfId = op.dataset.parts[partId].partcode;
    const caId = op.dataset.sides[faceId].sidecode;
    // techid
    if (techid === 'print') techid = 1;
    if (techid === 'embroidery') techid = 2;
    if (techid === 'hotPadding') techid = 3;
    // add unify patt
    console.log(imgObj,'imgObj');
    stage.cts[caId].addUnifyImageObj({
      cfId,
      pattData: imgObj,
      tech: techNames[techid],
      groupPartId,
      subPartId,
    });
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

  // this.addTextObj = (caId, textObj) => {
  //   const cfId = caId.replace(/ca/, 'cf');
  //   stage.cts[caId].addTextObj(cfId, textObj);
  // };

  this.addTextObjToPart = (faceId, partId, textObj, techid) => {
    const cfId = op.dataset.parts[partId].partcode;
    const caId = op.dataset.sides[faceId].sidecode;
    // console.log(cfId);
    // techid
    if (techid === 'print') techid = 1;
    if (techid === 'embroidery') techid = 2;
    if (techid === 'hotPadding') techid = 3;
    // techname
    const techName = techNames[techid]; 

    stage.cts[caId].addUnifyTextObj({
      cfId, 
      textData: textObj, 
      tech: techName,
    });
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

  // align Patt
  // -----------------------------------------
  this.alignPatt = (pattObj, options) => stage.cts[pattObj.caId].alignPatt(pattObj, options);

  // remove Patt
  // -----------------------------------------
  this.removePatt = (pattObj) => {
    stage.cts[pattObj.caId].removePatt(pattObj);
  };

  // remove Patt by Part
  // -----------------------------------------
  this.removePattByPart = (faceId, partId, groupPartId, subPartId) => {
    const cfId = op.dataset.parts[partId].partcode;
    const caId = op.dataset.sides[faceId].sidecode;
    stage.cts[caId].removePattByPart(cfId, groupPartId, subPartId);
  };

  // reset Patt
  // -----------------------------------------
  this.resetPatt = (pattObj) => {
    stage.cts[pattObj.caId].resetPatt(pattObj);
  };
  
  // clear Patt
  // -----------------------------------------
  this.clearPatt = (caId = null) => {
    if (caId) {
      stage.cts[caId].clearPatt();
    } else {
      Object.keys(stage.cts).forEach((caId) => {
        stage.cts[caId].clearPatt();
      });
    }
  };

  // limits
  // -----------------------------------------
  // this.setCaLimit = (caId, limits) => {
  //   if (stage.cts[caId]) {
  //     stage.cts[caId].setLimits(limits);
  //   }
  // };

  // set mask mode
  // -----------------------------------------
  this.setMaskMode = (showMask = false) => {
    Object.keys(stage.cts).forEach((caId) => {
      stage.cts[caId].setMaskMode(showMask);
    });
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
    // const formatJSON = {};
    // Object.keys(json.caParts).forEach((cxId) => {
    //   if (cxId.substr(0, 2) === 'ca') {
    //     if (!formatJSON[cxId]) {
    //       formatJSON[cxId] = json.caParts[cxId];
    //     } else {
    //       Object.assign(formatJSON[cxId], json.caParts[cxId]);
    //     }
    //   } else {
    //     const caId = findCaIdByCfId(cxId);
    //     if (!formatJSON[caId]) {
    //       formatJSON[caId] = {};
    //     }
    //     if (!formatJSON[caId].cfs) {
    //       formatJSON[caId].cfs = {};
    //     } 
    //     formatJSON[caId].cfs[cxId] = json.caParts[cxId];
    //   }
    // });
    // Object.keys(formatJSON).forEach((caId) => {
    //   stage.cts[caId].loadPattFromJSON(formatJSON[caId]);
    // });
    Object.keys(json.caParts).forEach((caId) => {
      // console.log(caId);
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

  this.loadCustomJSON = (json, scene = 'printPreview', cb = null) => {
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

          // stage
          if (scene.substr(0, 2) === 'ca') {
            let tarScene = scene;
            if (scene === 'caDefault') {
              switch (prod.type) {
                case 'shoes':
                  tarScene = 'caSLI';
                  break;
                case 'clothing':
                  tarScene = 'caCFT';
                  break;
                default:
                  console.log('CBYC: Cannot find scene', scene);
                  break;
              }
            }
            this.setSence('ca', tarScene, cb);
          } else {
            this.setSence('stage', scene, cb);
          }
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
      Object.assign(customJSON.caParts, stage.cts[caId].getExportJSON());
      // customJSON.caParts[caId] = stage.cts[caId].getExportJSON();
    });
    console.log('CBYC: export patt JSON', customJSON);
    return customJSON;
  };

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
              ? op.dataset.colors[colorId].metalness : 0.6;
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

  // setBlur  //设置canvas的透明度和滤镜
  // -----------------------------------------
  this.setBlur = (doBlur) => {
    const blur = doBlur ? '10px' : '0px';
    const opacity = doBlur ? 0.4 : 1;
    op.canvasEle.style.filter = `blur(${blur})`;
    op.canvasEle.style.opacity = opacity;
  };

  // 
  // =========================================
  // SET VISIABLE
  // =========================================
  // 
  this.setVisibleByModelPartName = (partName, visible) => {
    if (op.dataset.standardProdParts[prod.type].prodParts
      && op.dataset.standardProdParts[prod.type].prodParts[partName]) {
      const modelPartName = op.dataset.standardProdParts[prod.type].prodParts[partName];

      if (stage.modelA) {
        for (let i = 0; i < stage.modelA.children.length; i += 1) {
          if (stage.modelA.children[i].name === modelPartName) {
            stage.modelA.children[i].visible = visible;
            stage.needsUpdateOnce = true;
          }
        }
      }
      if (stage.modelB) {
        for (let i = 0; i < stage.modelB.children.length; i += 1) {
          if (stage.modelB.children[i].name === modelPartName) {
            stage.modelB.children[i].visible = visible;
            stage.needsUpdateOnce = true;
          }
        }
      }
    }
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

  // 
  // ========================================
  // EMA: Equivalent map area
  // ========================================
  // 
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
    let hits = rc.intersectObject(stage.cas[stage.activeCaId], true);
    // console.log(stage.cas[stage.activeCaId]);

    while (!hits.length > 0 && cameraDir.y < 0.5) {
      cameraDir.y += 0.001;
      cameraDir.normalize();
      console.log('CBYC: EMA ray offseted');
      rc.set(
        camera.position,
        cameraDir,
      );
      hits = rc.intersectObject(stage.cas[stage.activeCaId], true);
    }
    ema.group.position.set(hits[0].point.x,
      hits[0].point.y,
      hits[0].point.z);
  };

  const initEma = () => {
    const geometry = new PlaneGeometry(1, 1);
    const material = new MeshBasicMaterial({ 
      color: 0xffffff, 
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
          || stage.activeCaId === 'caSRO') {
            stage.cas[stage.activeCaId].material.map.wrapS = RepeatWrapping;
            stage.cas[stage.activeCaId].material.map.repeat.x = prod.caParts[stage.activeCaId].repeatX ? prod.caParts[stage.activeCaId].repeatX : -1;
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

  this.screenShot = () => {
    download(renderer.domElement.toDataURL('image/png'));
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
        pz: 0,
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
        stage.modelA.position.z = prod.centerOffset.z + params.p.pz;
        stage.modelA.rotation.x = params.p.rx;
      }
      if (stage.modelB) {
        stage.modelB.position.x = -params.p.px;
        stage.modelB.position.y = prod.centerOffset.y + params.p.py;
        stage.modelB.position.z = prod.centerOffset.z + params.p.pz;
        stage.modelB.rotation.x = params.p.rx;
      }
    } else if (!tweenProd && stage.modelA && (
      stage.modelA.position.x !== params.p.px 
        || stage.modelA.position.y - prod.centerOffset.y !== params.p.py
        || stage.modelA.position.z - prod.centerOffset.z !== params.p.pz
        || stage.modelA.rotation.x !== params.p.rx)) {
      if (stage.modelA) {
        tweenProd = new TWEEN.Tween({
          px: stage.modelA.position.x,
          py: stage.modelA.position.y - prod.centerOffset.y,
          pz: stage.modelA.position.z - prod.centerOffset.z,
          rx: stage.modelA.rotation.x,
        });
        tweenProd.to(params.p, params.dur);
        tweenProd.onUpdate((obj) => {
          stage.modelA.position.x = obj.px;
          stage.modelA.position.y = prod.centerOffset.y + obj.py;
          stage.modelA.position.z = prod.centerOffset.z + obj.pz;
          stage.modelA.rotation.x = obj.rx;
          if (stage.modelB) {
            stage.modelB.position.x = -obj.px;
            stage.modelB.position.y = prod.centerOffset.y + obj.py;
            stage.modelB.position.z = prod.centerOffset.z + obj.pz;
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
    //初始化   this.setSence('stage', 'reset');
    // inactive stage.cts
    // setActiveCt(false);
    // 
    if (op.dataset.scenes[prod.type][type][scene]) {
      // clear
      if (tweenView) {
        tweenView.stop();
        tweenView = null;
      }
      if (tweenProd) {
        tweenProd.stop();
        tweenProd = null;
      }
      
      const sceneInfo = op.dataset.scenes[prod.type][type][scene];
      setModelVisible(stage.modelA, !sceneInfo.hA);
      setModelVisible(stage.modelB, !sceneInfo.hB);
      animateView(sceneInfo, cb);
      animateProd(sceneInfo);
      if (type === 'ca') {
        setActiveCt(true, scene);
      } else {
        setActiveCt(false);
      }
      stage.activeCaId = type === 'ca' ? scene : null;
      // move
      const pan = {
        x: 0,
        y: 0,
        xpx: 0,
        ypx: 0,
      };
      if (sceneInfo.m) {
        pan.x = sceneInfo.m.x ? sceneInfo.m.x : 0;
        pan.y = sceneInfo.m.y ? sceneInfo.m.y : 0;
        pan.xpx = op.wrapEle.clientWidth * pan.x;
        pan.ypx = op.wrapEle.clientHeight * pan.y;
      }
      op.wrapEle.style.transform = `translate3d(${pan.x * 100}%,${pan.y * 100}%,0)`;
      // 
      ctRes.forEach((ct) => {
        ct.setPanOffset(pan.xpx, pan.ypx);
      });
      
      // 
      if (type === 'stage' && scene === 'finish') {
        setTimeout(() => {
          this.makeThumbnail(() => {
            op.vm.$emit('thumbnailCreated', stage.thumbnail);
          });
        }, 601);
      }
      // 
      if (scene === 'finish') {
        setControlsLimit('finish');
      } else if (scene === 'printPreview') {
        setControlsLimit('printPreview');
      } else {
        setControlsLimit(prod.type);
      }

      // set ca limits
      // if (type === 'ca') {
      //   Object.keys(op.dataset.sides).forEach((sideid) => {
      //     if (op.dataset.sides[sideid].sidecode === scene) {
      //       this.setCaLimit(scene, op.dataset.sides[sideid].limits);
      //     }
      //   });
      // }
      
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
          this.loadCustomJSON(op.dataset.customPresets[sequence[index]].caJSON, 'renderSequence', () => {
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
    while (op.ctWrapEle.firstChild) {
      op.ctWrapEle.removeChild(op.ctWrapEle.firstChild);
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

    // clear scene products
    if (scene.children) {
      for (let i = scene.children.length - 1; i >= 0; i -= 1) {
        if (scene.children[i].name === 'modelA' 
          || scene.children[i].name === 'modelB') {
          scene.remove(scene.children[i]);
        }
      }
    }

    // clear cts
    ctRes.forEach((ct) => {
      ct.clear();
    });
    
    // clear stage links
    stage.bodyParts = [];
    stage.icParts = [];
    stage.colors = {};
    stage.size = null;
    stage.thumbnail = null;
    stage.cas = {};
    stage.cts = {};

    // clear size
    stage.size = null;

    // clear states
    stage.activeCaId = null;

    // dispose
    if (forceFreeRes) {
      resTracker.dispose();
    }

    // clear cache
    if (!useCache) {      
      Object.keys(cache).forEach((key) => {
        delete (cache[key]);
      });
    }

    // reset wrapper translate
    op.wrapEle.style.transform = 'translate3d(0,0,0)';
    
    // 
    controls.enabled = true;
    stage.needsUpdateOnce = true;
  };
};

export default CBYC;
