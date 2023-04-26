/*
 * @Author: lby
 * @Date: 2021-08-08 13:24:36
 * @LastEditors: lby
 * @LastEditTime: 2021-11-29 16:21:56
 * @Description: file content
 */

import { fabric } from './fabric.4.6.0.edit';

const CTextureV2 = function (op) {
  // =========================================
  // Init Params
  // =========================================
  // domWrapper    canvas元素
  const domWrapper = op.domWrapper;

  // fov
  const fov = op.fov;   //轨道控制器

  // update material texture   method
  const updateOnce = op.updateOnce;  //一个跟新函数

  // debug
  // const debug = !!op.debug;

  // dataset
  const dataset = op.dataset;  //文件资源

  // emit
  const emit = op.emit;  //子传父

  // =========================================
  // Init Components
  // =========================================
  // ctSize   画布宽高
  const ctSize = {
    w: domWrapper.clientWidth,
    h: domWrapper.clientHeight,
  };

  // create ct canvas element   创建canvas并且使用fabric且宽高相同
  let ctCanvas = document.createElement('canvas');
  ctCanvas.width = ctSize.w;
  ctCanvas.height = ctSize.h;
  // ctCanvas.className = 'disabled';
  // domWrapper.appendChild(ctCanvas);

  // create ct fabric
  let ctFabric = new fabric.Canvas(ctCanvas, {
    preserveObjectStacking: true,
  });
  ctFabric.setWidth(ctSize.w);
  ctFabric.setHeight(ctSize.h);

  // texture absolute px
  // can be set by model part if needed
  const texturePx = 2048;

  // create mixer   canvas.getContext('2d') 方法返回指定画布元素的 2D 渲染上下文。
// 该上下文提供了必要的方法和属性，以在画布上进行绘制、填充、擦除和变换等操作。通过这个上下文，我们可以使用 JavaScript 绘制各种图形、图像以及创建动画等。
  let mixer = document.createElement('canvas');
  const mixerCtx = mixer.getContext('2d');
  mixer.width = texturePx;
  mixer.height = texturePx;
  this.mixer = mixer;

  // =========================================
  // Internal Caculated Vars
  // =========================================
  // display controls
  const display = {
    print: true,
    embroidery: true,
    hotPadding: true,
  };

  // F2T Transform
  const f2t = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    scale: 1,
  };

  // px per space
  let pxPerSpace;
  
  // patt DPI
  const pattDPI = 100;

  // P2F Transform
  const p2f = {
    scale: 1,
  };

  // F2R Transform
  const t2r = {
    scale: 1,
  };

  // =========================================
  // Resetable Vars
  // =========================================
  // instance data
  const insDataDefault = {
    // productId
    productId: null,

    // caId
    caId: null,
    faceId: null,
    partId: null,

    // target map
    targetMap: null,

    // innate texture
    innateMap: null,
    innateMapFlipX: false,

    // color
    color: '#ffffff',

    // limits
    limits: {
      print: 1,
      text: 1,
      embroidery: 1,
      hotPadding: 1,
    },

    // unique
    unique: {},
    
    // caData
    caData: null,

    // partData
    partData: null,

    // size
    prodSize: null,

  };

  const insData = {};

  // masks  创建矩形对象
  const maskOptions = {
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    fixed: true,
    absolutePositioned: true,
    globalCompositeOperation: 'source-atop',
    selectable: false,
    evented: false,
    isMask: true,
    excludeFromExport: true,
  };   
  // 创建矩形对象
  const masks = {
    print: {
      path: new fabric.Rect(maskOptions),
    },
    embroidery: {
      path: new fabric.Rect(maskOptions),
    },
    hotPadding: {
      path: new fabric.Rect(maskOptions),
    },
    common: {
      path: new fabric.Rect(maskOptions),
    },
  };

  // trans params for EMA
  const trans = {};
 
  // printer trans
  const printTransDefault = {
    rotate: 0,
    printerDatumPointX: 0,
    printerDatumPointY: 0,
    textureNormalizedDatumPointX: 0,
    textureNormalizedDatumPointY: 0,
  };
  const printTrans = {};

  // real size in inch
  let inch = 0;

  // pan offset
  const pan = {
    x: 0,
    y: 0,
  };

  // techs
  const techs = {
    print: 1,
    embroidery: 2,
    hotPadding: 3,
  };

  // =========================================
  // Reset All
  // =========================================
  /**
 * 描述代码功能的简短概述
 *
 * @param {object}  caData 鞋子信息位置  参数名称 - 参数描述
 * @param {String}  caId  鞋子的哪个面 
 * @param {img}  innateMap  原来的纹理图片
 * @param {Texture}  targetMap  当前的纹理
 * @returns {类型} 返回值描述
 * @example
 * 示例代码
 */

  this.reset = (op) => {
    console.log(op,'op');
    this.clear();
    // insData
    Object.assign(insData, insDataDefault, op);

    // limits
    this.setLimits();

    // unique
    insData.unique = dataset.products[insData.productId]
      .faces.find((face) => face.faceid === insData.faceId)
      .unique;

    // masks
    ctFabric.add(masks.print.path);
    ctFabric.add(masks.embroidery.path);
    ctFabric.add(masks.hotPadding.path);
    ctFabric.add(masks.common.path);

    // ema trans
    Object.assign(trans, insData.caData.trans);

    // print trans
    Object.assign(printTrans, printTransDefault, insData.caData.printTrans);
    
    this.updateTrans();
    this.update();
  };

  // =========================================
  // Update Main Params for coord trans 
  // among [S]pace [F]abric [P]att [R]eal Pri[N]ter
  // =========================================
  this.updateTrans = () => {
    // 0. Update modelinch
    // ---------------------------------------
    // inch -> texture area
    // trans.inchca -> caarea
    inch = insData.prodSize * trans.caSizePct;

    // console.log(prodSize);

    if (trans.caTexturePct) {
      inch /= trans.caTexturePct;
    }

    // Target: update f2t
    // Calc the trans for fabric darwing into mixer
    // Make sure get the correct position and size
    // fit the space prod(ema)
    // 
    // 1. Calc the emaHeightPx
    // ---------------------------------------
    // Space coord - Fabric(screen/ema) coord 
    // ---------------------------------------
    // fHeightPx: fabric height (=container height) in px
    // spaceHeight: camera visiable height in space 
    // emaHeightPx: ema height in px
    // emaSpaceHeight: ema height in space
    // -- now we have ------------------------
    // fHeightPx / spaceHeight = emaHeightPx / emaSpaceHeight

    const fHeightPx = ctSize.h;

    // edis: the distance from camera to ema object
    const spaceHeight = 2 * Math.tan((Math.PI / 180) * fov / 2) * trans.edis;

    // emaSpaceHeight
    const emaSpaceHeight = trans.eds;

    // px per space
    pxPerSpace = fHeightPx / spaceHeight;

    // calc the emaHeightPx
    const emaHeightPx = emaSpaceHeight * pxPerSpace;

    // 2. Calc the scale / width / height
    f2t.scale = texturePx / emaHeightPx;
    f2t.width = ctSize.w * f2t.scale;
    f2t.height = ctSize.h * f2t.scale;
    
    // 3. Calc the offset
    // align to screen(camera) center
    f2t.x = (texturePx - ctSize.w * f2t.scale) / 2;
    f2t.y = (texturePx - ctSize.h * f2t.scale) / 2;

    // add coord delta to align ema center
    f2t.x += -trans.edx * pxPerSpace * f2t.scale;
    f2t.y += trans.edy * pxPerSpace * f2t.scale;

    // 4. Calc scale of patt
    // -- we have ----------------------------
    // printer(realwork) crood - Fabric(screen/ema) coord 
    // texturePx / modelInch = pattTexturePx / pattInch
    // ---------------------------------------
    // pattFPx = pattTexturePx / f2t.scale
    // ---------------------------------------
    // calc progress like:
    // ---------------------------------------
    // const pattDPI = 100;
    // const pattImgWidth = 100;
    // const pattInch = pattImgWidth / pattDPI;
    // const modelInch = inch;
    // const pattTexturePx = texturePx * pattInch / modelInch;
    // const pattFPx = pattTexturePx / f2t.scale;
    // p2f.scale = pattFPx / pattImgWidth;
    p2f.scale = texturePx / pattDPI / inch;

    // 5. Calc Texture to Real Scale
    // texturePx * t2r.scale = modelInch
    t2r.scale = inch / texturePx;

    // 6. Calc Mask
    // if (mask.inchw) {
    //   // mask.width * t2r.scale = maskinch
    //   mask.width = mask.inchw / t2r.scale;
    //   mask.height = mask.inchh / t2r.scale;

    //   // set to center - top
    //   mask.x = (texturePx - mask.width) / 2;
    //   mask.y = 0;

    //   // add offset
    //   mask.x += mask.offsetX * texturePx;
    //   mask.y += mask.offsetY * texturePx;

    //   // output: Left Top Offset in inch
    //   mask.offsetXInch = mask.x * t2r.scale;
    //   mask.offsetYInch = mask.y * t2r.scale;
    // }

    // 6. Calc Fabric Internal Masks
    // set the value of mask instance directly

    // need size to be defined
    if (insData.prodSize) {
      Object.keys(techs).forEach((tech) => {
        // check every tech

        masks[tech].offsetXInch = 0;
        masks[tech].offsetYInch = 0;
        
        // check base
        if (insData.caData.masks 
          && insData.caData.masks[tech]
          && insData.caData.masks[tech].base === 'inch') {
          const maskData = insData.caData.masks[tech];
          
          // real size mask
          masks[tech].path.set('width', maskData.size.width / t2r.scale / f2t.scale);
          masks[tech].path.set('height', maskData.size.height / t2r.scale / f2t.scale);
          // calc left
          const xint = (texturePx - maskData.size.width / t2r.scale) / 2 + maskData.offset.x * texturePx;
          const xinf = (xint + (ctSize.w * f2t.scale - texturePx) / 2) / f2t.scale + insData.caData.trans.edx * pxPerSpace;
          masks[tech].path.set('left', xinf);
          masks[tech].offsetXInch = xint * t2r.scale;
          // calc top
          const yint = 0 + maskData.offset.y * texturePx;
          const yinf = (yint + (ctSize.h * f2t.scale - texturePx) / 2) / f2t.scale - insData.caData.trans.edy * pxPerSpace;
          masks[tech].path.set('top', yinf);
          masks[tech].offsetYInch = yint * t2r.scale;
          // 
        } else {
          const size = {
            width: 1,
            height: 1,
          };
          const offset = {
            x: 0,
            y: 0,
          };
          if (insData.caData.masks
            && insData.caData.masks[tech]
            && insData.caData.masks[tech].offset) {
            Object.assign(offset, insData.caData.masks[tech].offset);
          }
          if (insData.caData.masks
            && insData.caData.masks[tech]
            && insData.caData.masks[tech].size) {
            Object.assign(size, insData.caData.masks[tech].size);
          }
          // texture normalized size mask
          masks[tech].path.set('width', size.width * texturePx / f2t.scale);
          masks[tech].path.set('height', size.height * texturePx / f2t.scale);
          // calc left
          const xint = ((1 - size.width) / 2 + offset.x) * texturePx;
          const xinf = (xint + (ctSize.w * f2t.scale - texturePx) / 2) / f2t.scale + insData.caData.trans.edx * pxPerSpace;
          masks[tech].path.set('left', xinf);
          masks[tech].offsetXInch = xint * t2r.scale;
          // calc top
          const yint = 0 + offset.y * texturePx;
          const yinf = (yint + (ctSize.h * f2t.scale - texturePx) / 2) / f2t.scale - insData.caData.trans.edy * pxPerSpace;
          masks[tech].path.set('top', yinf);
          masks[tech].offsetYInch = yint * t2r.scale;
        }

        // common
        masks.common.path.set('width', texturePx / f2t.scale);
        masks.common.path.set('height', texturePx / f2t.scale);
        // calc left
        const xint = 0;
        const xinf = (xint + (ctSize.w * f2t.scale - texturePx) / 2) / f2t.scale + insData.caData.trans.edx * pxPerSpace;
        masks.common.path.set('left', xinf);
        masks.common.offsetXInch = xint * t2r.scale;
        // calc top
        const yint = 0;
        const yinf = (yint + (ctSize.h * f2t.scale - texturePx) / 2) / f2t.scale - insData.caData.trans.edy * pxPerSpace;
        masks.common.path.set('top', yinf);
        masks.common.offsetYInch = yint * t2r.scale;
      });
      ctFabric.renderAll();
    }
  };
  // calc once
  // this.updateTrans();

  // =========================================
  // Set Display
  // =========================================
  this.setDisplay = (dp) => {
    display.print = !!dp.prints;
    display.embroidery = !!dp.embroideries;
    display.hotPadding = !!dp.hotPaddings;
    // update patts in fabric
    const objects = ctFabric.getObjects();
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];
      if (!display[object.tech]) {
        object.set('opacity', 0);
      } else {
        object.set('opacity', 1);
      }
    }
    ctFabric.renderAll();
    this.update();
  };

  // =========================================
  // Set Size
  // =========================================
  this.setSize = (size) => {
    insData.prodSize = size;
    this.updateTrans();
    this.update();
  };

  this.update = () => {
    // console.log('ct update');

    // clear
    mixerCtx.clearRect(0, 0, mixer.width, mixer.height);

    // patts
    mixerCtx.drawImage(ctCanvas, 0, 0, ctCanvas.width, ctCanvas.height,
      f2t.x, f2t.y, f2t.width, f2t.height);

    // basic color
    mixerCtx.globalCompositeOperation = 'destination-over';
    mixerCtx.fillStyle = insData.color;
    mixerCtx.fillRect(0, 0, mixer.width, mixer.height);

    // basic texture
    if (insData.innateMap) {
      mixerCtx.globalCompositeOperation = 'multiply';
      if (!insData.innateMapFlipX) {
        mixerCtx.drawImage(insData.innateMap, 0, 0, mixer.width, mixer.height);
      } else {
        mixerCtx.save();
        mixerCtx.translate(mixer.width, 0);
        mixerCtx.scale(-1, 1);
        mixerCtx.drawImage(insData.innateMap, 0, 0, mixer.width, mixer.height);
        mixerCtx.restore();
      }
    }

    // request update
    if (insData.targetMap) {
      insData.targetMap.needsUpdate = true;
    }
    updateOnce();
  };

  // =========================================
  // Update Part Data
  // =========================================
  const updatePartData = (cfId) => {
    // partdata
    insData.partId = Object.values(dataset.parts)
      .find((part) => part.partcode === cfId).partid;
    insData.partData = dataset.products[insData.productId]
      .faces.find((face) => face.faceid === insData.faceId)
      .parts.find((part) => part.partid === insData.partId);
  };

  // =========================================
  // Calc Init Pos
  // =========================================
  const getInitPosJoint = (pattData, ) => {
    // structure
    const init = {
      offset: {
        x: 0,
        y: 0,
      },
      scale: {
        x: 1,
        y: 1,
        min: 0.5,
        max: 2,
      },
      rotate: 0,
      flip: {
        x: false,
        y: false,
      },
    };

    // add offset from patt data
    if (pattData.offset) {
      Object.assign(init.offset, pattData.offset);
    }

    // add offset from product data
    if (insData.partData
      && insData.partData.position) {
      init.offset.x += insData.partData.position.x;
      init.offset.y += insData.partData.position.y;
    }

    // add offset from subpart data
    if (pattData.groupPartId && pattData.subPartId) {
      init.offset.x += dataset.subparts[pattData.subPartId.toString()].offset.x;
      init.offset.y += dataset.subparts[pattData.subPartId.toString()].offset.y;
    }

    // calc offset in fabric
    init.offset.x *= texturePx / f2t.scale;
    init.offset.y *= texturePx / f2t.scale;

    // calc scale
    if (pattData.scale) {
      Object.assign(init.scale, pattData.scale);
    }
    if (init.scale.x < 0) {
      init.scale.x = -init.scale.x;
      init.flip.x = true;
    }
    if (init.scale.y < 0) {
      init.scale.y = -init.scale.y;
      init.flip.y = true;
    }

    // scale boundary
    if (init.scale.x < init.scale.min) {
      init.scale.min = init.scale.x;
    }
    if (init.scale.x > init.scale.max) {
      init.scale.max = init.scale.x;
    }

    // calc rotate
    if (pattData.rotate) {
      init.rotate = pattData.rotate;
    }
    return init;
  };

  // =========================================
  // Clip Function
  // =========================================
  function clipObject(thisObj, ctx) {
    if (thisObj.clipPath) {
      ctx.save();
      if (thisObj.clipPath.fixed) {
        const retina = thisObj.canvas.getRetinaScaling();
        ctx.setTransform(retina, 0, 0, retina, 0, 0);
        // to handle zoom
        // eslint-disable-next-line prefer-spread
        ctx.transform.apply(ctx, thisObj.canvas.viewportTransform);
        thisObj.clipPath.transform(ctx);
      }

      thisObj.clipPath._render(ctx);
      ctx.restore();
      ctx.clip();
      const x = -thisObj.width / 2;
      const y = -thisObj.height / 2;
 
      if (
        thisObj.isMoving === false
              && thisObj.resizeFilter
              && thisObj._needsResize()
      ) {
        thisObj._lastScaleX = thisObj.scaleX;
        thisObj._lastScaleY = thisObj.scaleY;
        thisObj.applyResizeFilters();
      }
      const elementToDraw = thisObj._element;
      ctx.drawImage(
        elementToDraw,
        0,
        0,
        thisObj.width,
        thisObj.height,
        x,
        y,
        thisObj.width,
        thisObj.height,
      );
      thisObj._stroke(ctx);
      thisObj._renderStroke(ctx);
    }
  }

  // =========================================
  // Add Image
  // =========================================
  const addImage = (pattData, cfId, tech, pattTrans) => {
    // console.log(insData.faceId);
    
    // controls
    const controls = {
      move: 1,
      scale: tech === 'print',
      rotate: 1,
    };
    Object.assign(controls, 
      insData.partData.imagelist[techs[tech]].controls,
      pattData.controls);
    
    // mask
    const partProp = Object.values(dataset.parts)
      .find((part) => part.partid === insData.partId);
    const applyMask = partProp.applyMask && partProp.applyMask[tech] ? tech : null;
    
    // add patt
    fabric.Image.fromURL(pattData.imagepath, (img) => {
      img.set({
        left: pattTrans.left,
        top: pattTrans.top,
        angle: pattTrans.angle,
        scaleX: pattTrans.scaleX,
        scaleY: pattTrans.scaleY,
        flipX: pattTrans.flipX,
        flipY: pattTrans.flipY,
        minScaleLimit: pattTrans.minScaleLimit,
        maxScaleLimit: pattTrans.maxScaleLimit,
        // controls
        lockRotation: !controls.rotate,
        lockScalingX: !controls.scale,
        lockScalingY: !controls.scale,
        lockMovementX: !controls.move,
        lockMovementY: !controls.move,
        // 
        originX: 'center',
        originY: 'center',
      
        padding: 10,
        // controls styles
        // centeredScaling: true,
        hasBorders: false,
        hasControls: op.pattControls,
        // 
        centeredRotation: true,
        transparentCorners: false,
        cornerStyle: 'circle',
        cornerColor: '#666',
        borderColor: '#666',
        cornerStrokeColor: '#666',
        // clipPath: masks[applyMask].path,
        // clipTo(ctx) {
        //   clipObject(this, ctx);
        // },
      });

      if (applyMask) {
        img.set({
          clipPath: masks[applyMask].path,
          clipTo(ctx) {
            clipObject(this, ctx);
          }, 
        });
      }
      
      img.setControlVisible('ml', false);
      img.setControlVisible('mr', false);
      img.setControlVisible('mb', false);
      img.setControlVisible('mt', false);
      img.setControlVisible('mtr', controls.rotate);
      //     
      img.uuid = uuid();
      img.tech = tech;
      img.cfId = cfId;
      img.applyMask = applyMask;
      // 
      img.partId = pattData.partId;
      img.groupPartId = pattData.groupPartId;
      img.subPartId = pattData.subPartId;
      // 
      img.pattId = pattData.imageid;
      img.imagepath = pattData.imagepath;

      // 
      removeMutexPatt(cfId, tech);
      // 
      console.log(ctFabric);
      ctFabric.add(img);
      // 
      img.initState = img.toJSON();
    });
  };

  // =========================================
  // Add Unify Image   
  // =========================================
  /**
 * 描述代码功能的简短概述
 *
 * @param {String} cfId  鞋子的方向   参数名称 - 参数描述
 * @param {Object} pattData  题图的一些信息
 * @param {String} tech  print   剩下连个都是没有值
 * @returns {类型} 返回值描述
 * @example
 * 示例代码
 */
  this.addUnifyImageObj = ({
    cfId, pattData, tech, groupPartId, subPartId,
  }) => {

    updatePartData(cfId);
    
    // extention for pattdata
    pattData.imagepath = dataset.images[pattData.imageid].imagepath;

    // 
    console.log('addUnifyImage', cfId, pattData, tech, groupPartId, subPartId);
    console.log(insData,'insData');
    // check unique
    if (insData.unique 
      && insData.unique[tech]) {
      const uniqueKey = insData.unique[tech];
      let uniqueValue;
      switch (uniqueKey) {
        case 'partId':
          uniqueValue = insData.partId;
          break;
        case 'groupPartId':
          uniqueValue = groupPartId;
          break;
        case 'subPartId':
          uniqueValue = subPartId;
          break;
        default:
          break;
      }
      let objects = null;
      objects = ctFabric.getObjects()
        .filter((obj) => obj[uniqueKey] !== uniqueValue
          && obj.tech === tech
          && obj.isMask !== true);
      if (objects) {
        objects.forEach((object) => {
          ctFabric.remove(object);
        });
      }
    }
    
    // console.log('limits', insData.limits);
    // check limits
    if (insData.limits[tech] !== 0) {
      const objects = ctFabric.getObjects();
      let imageCount = 0;
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        if (objects[i].type === 'image' 
          && objects[i].tech === tech) {
          imageCount += 1;
          if (imageCount + 1 > insData.limits[tech]) {
            ctFabric.remove(objects[i]);
          }
        }
      }
    }

    // append partId
    pattData.partId = insData.partId;
    // append subpart data
    pattData.groupPartId = groupPartId;
    pattData.subPartId = subPartId;
    
    // init
    const init = getInitPosJoint(pattData, cfId);

    const pattTrans = {
      left: ctSize.w / 2 + insData.caData.trans.edx * pxPerSpace + init.offset.x,
      top: ctSize.h / 2 - insData.caData.trans.edy * pxPerSpace + init.offset.y,
      angle: init.rotate,
      scaleX: init.scale.x * p2f.scale / f2t.scale,
      scaleY: init.scale.y * p2f.scale / f2t.scale,
      flipX: init.flip.x,
      flipY: init.flip.y,
      minScaleLimit: init.scale.min * p2f.scale / f2t.scale,
      maxScaleLimit: init.scale.max * p2f.scale / f2t.scale,
    };

    addImage(pattData, cfId, tech, pattTrans);
  };

  // =========================================
  // Add Text
  // =========================================
  const addText = (textData, cfId, tech = 'print', textTrans) => {
    // controls
    const controls = {
      move: 1,
      scale: tech === 'print',
      rotate: 1,
    };
    Object.assign(controls, 
      insData.partData.imagelist[techs[tech]].controls,
      textData.controls);
    
    // mask
    const partProp = Object.values(dataset.parts)
      .find((part) => part.partid === insData.partId);
    const applyMask = partProp.applyMask && partProp.applyMask[tech] ? tech : null;

    // const texts = textData.text.splice('\n');

    const textobj = new fabric.Text(textData.text, 
      {
        left: textTrans.left,
        top: textTrans.top,
        scaleX: textTrans.scaleX,
        scaleY: textTrans.scaleY,
        angle: textTrans.angle,
        flipX: textTrans.flipX,
        flipY: textTrans.flipY,
        minScaleLimit: textTrans.minScaleLimit,
        maxScaleLimit: textTrans.maxScaleLimit,

        fontSize: textData.fontSize,
        fill: textData.color,
        fontFamily: textData.fontFamily,
        lineHeight: 0.8,
        textAlign: 'center',

        // controls
        lockRotation: !controls.rotate,
        lockScalingX: !controls.scale,
        lockScalingY: !controls.scale,
        lockMovementX: !controls.move,
        lockMovementY: !controls.move,
        lockScalingFlip: true,
        // 
        originX: 'center',
        originY: 'center',

        padding: 10,

        hasBorders: false,
        hasControls: op.pattControls,
        // centeredScaling: true,
        centeredRotation: true,
        transparentCorners: false,
        cornerStyle: 'circle',
        cornerColor: '#666',
        borderColor: '#666',
        cornerStrokeColor: '#666',
        // 
        applyMask,
        
      });
    if (applyMask) {
      textobj.set({
        clipPath: masks[applyMask].path,
        clipTo(ctx) {
          clipObject(this, ctx);
        },
      });
    }
    textobj.setControlVisible('ml', false);
    textobj.setControlVisible('mr', false);
    textobj.setControlVisible('mb', false);
    textobj.setControlVisible('mt', false);
    textobj.setControlVisible('mtr', controls.rotate);
    // 
    textobj.uuid = uuid();
    textobj.tech = tech;
    textobj.cfId = cfId;
    // 
    textobj.fontId = textData.fontid;
    // 
    textobj.partId = textData.partId;

    removeMutexPatt(cfId, tech);
    // add to fabric
    ctFabric.add(textobj);

    // save init state
    textobj.initState = textobj.toJSON();
  };

  this.addUnifyTextObj = ({
    cfId, textData, tech = 'print', 
  }) => {
    updatePartData(cfId);
    
    // check limits
    if (insData.limits.text !== 0) {
      const objects = ctFabric.getObjects();
      let textCount = 0;
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        if (objects[i].type === 'text') {
          textCount += 1;
          if (textCount + 1 > insData.limits.text) {
            ctFabric.remove(objects[i]);
          }
        }
      }
    }

    // append partId
    textData.partId = insData.partId;

    const textOriData = insData.partData.fontlist.fonts
      .find((item) => item.fontid === textData.fontid);
    if (textOriData && textOriData) {
      Object.assign(textData, textOriData);
    }

    // text info
    textData.text = textData.text 
      ? textData.text : '';
    textData.color = textData.color 
      ? textData.color : '#000000';
    textData.fontFamily = textData.fontFamily 
      ? textData.fontFamily : 'proximanova-medium';
    textData.fontSize = textData.fontSize 
      ? textData.fontSize : 200;

    console.log(textData);

    updatePartData(cfId);
    // init pos
    const init = getInitPosJoint(textData, cfId);

    const textTrans = {
      left: ctSize.w / 2 + insData.caData.trans.edx * pxPerSpace + init.offset.x,
      top: ctSize.h / 2 - insData.caData.trans.edy * pxPerSpace + init.offset.y,
      angle: init.rotate,
      scaleX: init.scale.x * p2f.scale / f2t.scale,
      scaleY: init.scale.y * p2f.scale / f2t.scale,
      flipX: init.flip.x,
      flipY: init.flip.y,
      minScaleLimit: init.scale.min * p2f.scale / f2t.scale,
      maxScaleLimit: init.scale.max * p2f.scale / f2t.scale,
    };

    // console.log(textTrans);

    addText(textData, cfId, tech, textTrans);
  };

  // =========================================
  // Modify Text
  // =========================================
  this.modifyText = ({
    uuid, text = '', fontFamily = '', color = '', 
  }) => {
    const objects = ctFabric.getObjects();
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];
      if (object.uuid === uuid) {
        if (text) {
          object.set('text', text);
        }
        if (color) {
          object.set('fill', color);
        }
        if (fontFamily) {
          object.set('fontFamily', fontFamily);
        }
        ctFabric.renderAll();
        break;
      }
    }
  };

  // =========================================
  // Reset Image
  // =========================================
  this.resetPatt = ({ uuid }) => {
    const object = ctFabric.getObjects().find((obj) => obj.uuid === uuid);
    if (object && object.initState) {
      object.setOptions(object.initState);
      object.setCoords(); 
      ctFabric.renderAll();
    }
  };

  // =========================================
  // Remove Patt
  // =========================================
  this.removePatt = ({ uuid }) => {
    const object = ctFabric.getObjects()
      .find((obj) => obj.uuid === uuid);
    if (object) {
      ctFabric.remove(object);
    }
  };

  // =========================================
  // Remove Patt by Part
  // =========================================
  this.removePattByPart = (cfId, groupPartId, subPartId) => {
    let objects = null;
    if (groupPartId && subPartId) {
      objects = ctFabric.getObjects()
        .filter((obj) => obj.cfId === cfId 
        && obj.groupPartId === groupPartId
        && obj.subPartId === subPartId);
    } else {
      objects = ctFabric.getObjects()
        .filter((obj) => obj.cfId === cfId);
    }
    if (objects) {
      objects.forEach((object) => {
        ctFabric.remove(object);
      });
    }
  };

  // =========================================
  // Remove Mutex Patt
  // =========================================
  const removeMutexPatt = (cfId, tech) => {
    const objects = ctFabric.getObjects()
      .filter((obj) => obj.cfId === cfId && obj.tech !== tech);
    if (objects) {
      objects.forEach((object) => {
        ctFabric.remove(object);
      });
    }
  };

  // =========================================
  // Reorder Image
  // =========================================
  this.reorderImage = (uuid, dir) => {
    const objects = ctFabric.getObjects();
    let to = 0;
    const maskCount = Object.keys(masks).length;
    for (let i = objects.length - 1; i >= maskCount; i -= 1) {
      const object = objects[i];
      if (object.uuid === uuid) {
        to = dir === 'up' ? i + 1 : i - 1;
        object.moveTo(to);
        break;
      }
    }    
    return {
      allowUp: to < objects.length - 1,
      allowDown: to > maskCount,
    };
  };

  // =========================================
  // Flip Image
  // =========================================
  this.flipImage = ({ uuid }, dir) => {
    const object = ctFabric.getObjects().find((obj) => obj.uuid === uuid);
    if (object) {
      if (dir === 'x') {
        object.toggle('flipX');
      } else if (dir === 'y') {
        object.toggle('flipY');
      }
      ctFabric.renderAll();
      this.update();
    }
  };

  // =========================================
  // Align Image
  // =========================================
  this.alignPatt = ({ uuid }, { x, y }) => {
    // console.log(uuid, x, y);
    const object = ctFabric.getObjects().find((obj) => obj.uuid === uuid);
    if (object && object.applyMask) {
      switch (x) {
        case 'left':
          object.set('left', masks[object.tech].path.left 
            + object.width * object.scaleX / 2);
          break;
        case 'center':
          object.set('left', masks[object.tech].path.left 
            + masks[object.tech].path.width / 2);
          break;
        case 'right':
          object.set('left', masks[object.tech].path.left 
            + masks[object.tech].path.width 
            - object.width * object.scaleX / 2);
          break;
        default:
          break;
      }
      switch (y) {
        case 'top':
          object.set('top', masks[object.tech].path.top 
            + object.height * object.scaleY / 2);
          break;
        case 'center':
          object.set('top', masks[object.tech].path.top + masks[object.tech].path.height / 2);
          break;
        case 'bottom':
          object.set('top', masks[object.tech].path.top 
            + masks[object.tech].path.height 
            - object.height * object.scaleY / 2);
          break;
        default:
          break;
      }
      ctFabric.renderAll();
    }
  };

  // =========================================
  // Set Color
  // =========================================
  this.setColor = (color) => {
    insData.color = color;
    this.update();
  };

  // =========================================
  // Set active
  // =========================================
  this.setActive = (active) => {
    if (active) {
      domWrapper.appendChild(ctFabric.wrapperEl);
    }    
    // ctCanvas.parentNode.className = active ? 'canvas-container' : 'canvas-container disabled';
  };

  // =========================================
  // IMPORT & EXPORT - Coords Transform
  // =========================================

  // fabric coord to textrue coord
  // -----------------------------------------
  const f2tCroodTrans = (f) => ({
    x: (f.left - insData.caData.trans.edx * pxPerSpace) * f2t.scale 
      - (ctSize.w * f2t.scale - texturePx) / 2,
    y: (f.top + insData.caData.trans.edy * pxPerSpace) * f2t.scale 
      - (ctSize.h * f2t.scale - texturePx) / 2,
    // scale: f.scaleX * f2t.scale / p2f.scale,
    scaleX: f.scaleX * f2t.scale / p2f.scale * (f.flipX ? -1 : 1),
    scaleY: f.scaleY * f2t.scale / p2f.scale * (f.flipY ? -1 : 1),
    rotate: f.angle,
    // width: f.width * p2f.scale,
    // height: f.height * p2f.scale,
  });

  // texture coord to real coord
  // origin point at LEFT TOP
  // -----------------------------------------
  // const t2rCroodTrans = (t) => ({
  //   // x: t.y * t2r.scale + (9.47 - 5),
  //   x: t.x * t2r.scale,
  //   // y: inch - t.x * t2r.scale + (9.43 - 5),
  //   y: t.y * t2r.scale,
  //   scale: t.scale,
  //   rotate: t.rotate,
  //   // width: t.width * t2r.scale,
  //   // height: t.height * t2r.scale,
  // });

  const sincosAlpha = (alpha) => {
    const radian = {
      sin: 0,
      cos: 0,
    };
    switch (alpha) {
      case 90:
        radian.sin = 1;
        radian.cos = 0;
        break;
      case -90:
        radian.sin = -1;
        radian.cos = 0;
        break;
      default:
        radian.sin = Math.sin(printTrans.rotate * Math.PI / 180);
        radian.cos = Math.cos(printTrans.rotate * Math.PI / 180);
        break;
    }
    return radian;
  };

  // real coord to pri[N]ter coord
  // -----------------------------------------
  const t2nCroodTrans = (t) => {
    const rx = (t.x - printTrans.textureNormalizedDatumPointX * texturePx) 
      * t2r.scale;
    const ry = (t.y - printTrans.textureNormalizedDatumPointY * texturePx) 
      * t2r.scale;
    const radian = sincosAlpha(printTrans.rotate);

    return {
      x: rx * radian.cos
        - ry * radian.sin
        + printTrans.printerDatumPointX,
      y: rx * radian.sin
        + ry * radian.cos
        + printTrans.printerDatumPointY,
      scaleX: t.scaleX,
      scaleY: t.scaleY,
      rotate: t.rotate,
      noX: (t.x - texturePx / 2) / texturePx,
      noY: (t.y - texturePx / 2) / texturePx,
      // height: r.height,
      // width: r.width,
    };
  };

  const n2tCoordTrans = (n) => {
    const tx = n.x - printTrans.printerDatumPointX;
    const ty = n.y - printTrans.printerDatumPointY;
    const radian = sincosAlpha(-printTrans.rotate);
    return {
      x: (tx * radian.cos - ty * radian.sin) / t2r.scale + printTrans.textureNormalizedDatumPointX * texturePx,
      y: (tx * radian.sin + ty * radian.cos) / t2r.scale + printTrans.textureNormalizedDatumPointY * texturePx,
      scaleX: n.scaleX,
      scaleY: n.scaleY,
      rotate: n.rotate,
    };
  };

  // textrue coord to fabric coord
  // -----------------------------------------
  const t2fCroodTrans = (t) => {
    const flipX = t.scaleX < 0;
    const flipY = t.scaleY < 0;
    return {
      left: (t.x + (ctSize.w * f2t.scale - texturePx) / 2) / f2t.scale + insData.caData.trans.edx * pxPerSpace,
      top: (t.y + (ctSize.h * f2t.scale - texturePx) / 2) / f2t.scale - insData.caData.trans.edy * pxPerSpace,
      scaleX: Math.abs(t.scaleX) * p2f.scale / f2t.scale,
      scaleY: Math.abs(t.scaleY) * p2f.scale / f2t.scale,
      angle: t.rotate,
      flipX,
      flipY,
      // width: t.width / p2f.scale,
      // height: t.height / p2f.scale,
    };
  };

  // real coord to texture coord
  // -----------------------------------------
  // const r2tCroodTrans = (r) => ({
  //   x: r.x / t2r.scale,
  //   y: (inch - r.y) / t2r.scale,
  //   scale: r.scale,
  //   rotate: r.rotate,
  //   // width: r.width / t2r.scale,
  //   // height: r.height / t2r.scale,
  // });

  // =========================================
  // IMPORT & EXPORT - Parse JSON
  // =========================================
  const t2ts = {
    embroidery: 'embroideries',
    hotPadding: 'hotPaddings',
    print: 'prints',
  };
  // const ts2t = {
  //   embroideries: 'embroidery',
  //   hotPaddings: 'hotPadding',
  //   prints: 'print',
  // };
  // const getPartidByPartcode = (partcode) => {
  //   let partId = '';
  //   Object.keys(dataset.parts).forEach((partid) => {
  //     if (dataset.parts[partid].partcode === partcode) {
  //       partId = dataset.parts[partid].partid;
  //     }
  //   });
  //   return partId;
  // };

  // fabric JSON to real JSON
  // -----------------------------------------
  const fJSON2rJSON = (json) => {
    const rJSON = {};

    // const mainCfId = insData.caId.replace(/ca/, 'cf');

    // get prints from fabric
    if (json.objects.length > 0) {
      // main -> prints
      // if (!rJSON[mainCfId]) {
      //   rJSON[mainCfId] = {
      //     partid: getPartidByPartcode(mainCfId),
      //   };
      // }

      // add prints
      for (let i = 0; i < json.objects.length; i += 1) {
        // console.log(json.objects[i]);

        const cfId = json.objects[i].cfId;
        const tech = json.objects[i].tech;
        const tobj = f2tCroodTrans(json.objects[i]);
        const nobj = t2nCroodTrans(tobj);

        // console.log(json.objects[i]);

        // patt type
        nobj.pattType = json.objects[i].type;

        // cfId
        nobj.cfId = json.objects[i].cfId;

        // partId
        nobj.partId = json.objects[i].partId;

        // content props
        if (nobj.pattType === 'image') {
          nobj.pattId = json.objects[i].pattId;
          nobj.imagepath = json.objects[i].imagepath;
        } else if (nobj.pattType === 'text') {
          nobj.fontId = json.objects[i].fontId;
          nobj.text = json.objects[i].text;
          nobj.fontFamily = json.objects[i].fontFamily;
          nobj.color = json.objects[i].fill;
          // calc equal fontsize
          nobj.fontSize = json.objects[i].fontSize * nobj.scaleX;
        }

        // nobj.originWidth = json.objects[i].width;
        // nobj.originHeight = json.objects[i].height;

        // mask offset
        nobj.applyMask = json.objects[i].applyMask;
        if (json.objects[i].applyMask) {
          nobj.x -= masks[tech].offsetXInch;
          nobj.y -= masks[tech].offsetYInch;
        }

        // subpart
        if (json.objects[i].groupPartId && json.objects[i].subPartId) {
          nobj.groupPartId = json.objects[i].groupPartId;
          nobj.subPartId = json.objects[i].subPartId;
        }
        
        if (!rJSON[cfId]) {
          rJSON[cfId] = {};
        }
        if (!rJSON[cfId][t2ts[tech]]) {
          rJSON[cfId][t2ts[tech]] = [];
        }
        rJSON[cfId][t2ts[tech]].push(nobj);
      }
    }
    return rJSON;
  };

  // real JSON to fabric JSON
  // -----------------------------------------
  const r2fAddPatt = (pattJsonData, tech) => {
    // mask
    if (pattJsonData.applyMask) {
      pattJsonData.x += masks[tech].offsetXInch;
      pattJsonData.y += masks[tech].offsetYInch;
    }
    // 
    const tobj = n2tCoordTrans(pattJsonData);

    const fobj = t2fCroodTrans(tobj);

    updatePartData(pattJsonData.cfId);

    if (pattJsonData.pattType === 'image') {
      const pattData = {
        imageid: pattJsonData.pattId,
        imagepath: dataset.images[pattJsonData.pattId].imagepath,
        groupPartId: pattJsonData.groupPartId,
        subPartId: pattJsonData.subPartId,
        partId: pattJsonData.partId,
      };

      const scaleLimits = {
        min: 0.5,
        max: 2,
      };

      const pattOriData = insData.partData.imagelist[techs[tech]].images
        .find((item) => item.imageid === pattJsonData.pattId);
      if (pattOriData && pattOriData.scale) {
        Object.assign(scaleLimits, pattOriData.scale);
      }

      const pattTrans = {
        left: fobj.left,
        top: fobj.top,
        angle: fobj.angle,
        scaleX: fobj.scaleX,
        scaleY: fobj.scaleY,
        flipX: fobj.flipX,
        flipY: fobj.flipY,
        minScaleLimit: scaleLimits.min,
        maxScaleLimit: scaleLimits.max,
      };

      addImage(pattData, pattJsonData.cfId, tech, pattTrans);
    } else if (pattJsonData.pattType === 'text') {
      const textData = {
        fontFamily: pattJsonData.fontFamily,
        color: pattJsonData.color,
        text: pattJsonData.text,
        fontSize: pattJsonData.fontSize / pattJsonData.scaleX,
        partId: pattJsonData.partId,
      };

      const scaleLimits = {
        min: 0.5,
        max: 2,
      };
      const textOriData = insData.partData.fontlist.fonts
        .find((item) => item.fontid === pattJsonData.fontId);
      if (textOriData && textOriData.scale) {
        Object.assign(scaleLimits, textOriData.scale);
      }

      const textTrans = {
        left: fobj.left,
        top: fobj.top,
        angle: fobj.angle,
        scaleX: fobj.scaleX,
        scaleY: fobj.scaleY,
        flipX: fobj.flipX,
        flipY: fobj.flipY,
        minScaleLimit: scaleLimits.min,
        maxScaleLimit: scaleLimits.max,
      };

      addText(textData, pattJsonData.cfId, 'print', textTrans);
    }
  };

  // real JSON to fabric JSON
  // -----------------------------------------
  const rJSON2fJSON = (caJSON) => {
    // const fJSON = {
    //   objects: [],
    //   version: '4.4.0',
    // };

    Object.keys(caJSON).forEach((cfId) => {
      const json = caJSON[cfId];

      if (json.prints) {
        json.prints.forEach((pattJsonData) => {
          r2fAddPatt(pattJsonData, 'print');
        });
      }
      if (json.embroideries) {
        json.embroideries.forEach((pattJsonData) => {
          r2fAddPatt(pattJsonData, 'embroidery');
        });
      }
      if (json.hotPaddings) {
        json.hotPaddings.forEach((pattJsonData) => {
          r2fAddPatt(pattJsonData, 'hotPadding');
        });
      }
    });
    // return fJSON;
  };

  // =========================================
  // IMPORT & EXPORT 
  // =========================================
  this.getExportJSON = () => {
    const fabricJSON = ctFabric.toJSON(['pattId', 'fontId', 'imagepath', 'cfId', 'tech', 'isMask', 'initState', 'applyMask', 'groupPartId', 'subPartId', 'partId']);
    const exportJSON = {};
    exportJSON[insData.caId] = fJSON2rJSON(fabricJSON);
    return exportJSON;
  };

  this.loadPattFromJSON = (json) => {
    rJSON2fJSON(json);
    this.update();
  };

  // =========================================
  // ASSIST
  // =========================================

  // create UUID
  // -----------------------------------------
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // clear patt
  // -----------------------------------------
  this.clearPatt = () => {
    const objects = ctFabric.getObjects();
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      if (!objects[i].isMask) {
        ctFabric.remove(objects[i]);
      }
    }
  };

  // clear all
  // -----------------------------------------
  this.clear = () => {
    // clear patts
    this.clearPatt();
    if (insData) {
      Object.keys(insData).forEach((id) => {
        delete (insData[id]);
      });
    }
    if (printTrans) {
      Object.keys(printTrans).forEach((id) => {
        delete (printTrans[id]);
      });
    }
    if (trans) {
      Object.keys(trans).forEach((id) => {
        delete (trans[id]);
      });
    }
  };

  // dispose all images & events
  // -----------------------------------------
  this.dispose = () => {
    ctFabric.dispose();
    ctFabric = null;
    ctCanvas = null;
    mixer = null;
  };

  // limits
  // -----------------------------------------
  this.setLimits = () => {
    // console.log(limits);
    // add limits
    if (!insData.limits) {
      insData.limits = {
        print: 1,
        embroidery: 1,
        hotPadding: 1,
        text: 1,
      };
    }
    if (insData.faceId 
      && typeof (dataset.sides[insData.faceId.toString()].limits) === 'object') {
      Object.assign(insData.limits, dataset.sides[insData.faceId.toString()].limits);
    }
  };

  // pan offset
  // -----------------------------------------
  this.setPanOffset = (x, y) => {
    pan.x = x;
    pan.y = y;
  };

  // show mask
  // -----------------------------------------
  this.setMaskMode = (showMask = false) => {
    const strokeColors = {
      print: 'rgba(255,0,0,.3)',
      embroidery: 'rgba(0,255,0,.3)',
      hotPadding: 'rgba(0,0,255,.3)',
    };
    Object.keys(masks).forEach((tech) => {
      if (showMask) {
        masks[tech].path.set('fill', strokeColors[tech]);
        masks[tech].path.globalCompositeOperation = 'multiple';
      } else {
        masks[tech].path.set('fill', '#000');
        masks[tech].path.globalCompositeOperation = 'source-atop';
      }
    });
    ctFabric.renderAll();
    // this.update();
  };

  // =========================================
  // DEV HELPER
  // =========================================
  const downLoad = (url) => {
    const oA = document.createElement('a');
    oA.download = 'mixer';
    oA.href = url;
    document.body.appendChild(oA);
    oA.click();
    oA.remove();
  };
  
  this.logCt = () => {
    console.log('%c+',
      `font-size: 1px;
      padding: 80px 80px;
      background-image: url('${mixer.toDataURL('image/png')}');
      background-size: contain;
      background-repeat: no-repeat;
      color: transparent;`);
    downLoad(mixer.toDataURL('image/png'));
  };

  // =========================================
  // EVENTS
  // =========================================

  // update  
  // -----------------------------------------
//   在初始化 Canvas 对象时；
// 在通过 fabric.Canvas.add() 或 fabric.Canvas.insertAt() 方法向 Canvas 对象中添加新对象时；
// 在调用 fabric.Canvas.renderAll() 或 fabric.Canvas.requestRenderAll() 方法时；
// 在 Canvas 对象上进行元素更新、移动、删除等操作后，需要重新渲染时。
// 通过监听 after:render 事件，可以在 Canvas 完成渲染后进行一些后续处理，例如更新画布上的某些元素、重新计算画布上的布局等。
  ctFabric.on('after:render', () => {
    console.log(22222222222222222222222);
    this.update();
  });
  // ctFabric.on('object:moving', () => {
  //   this.preUpdate();
  // });
  // ctFabric.on('object:scaling', () => {
  //   this.preUpdate();
  // });
  // ctFabric.on('object:rotating', () => {
  //   this.preUpdate();
  // });

  // rotate helper
  // -----------------------------------------

//   当使用 set() 方法或直接修改 angle 属性旋转对象时；
// 当调用 rotate() 方法旋转对象时；
// 当对象在被其他操作（例如缩放、剪切、移动等）中旋转时。
  ctFabric.on('object:rotated', (e) => {
    const degRange = 7;
    if (e.target) {
      if (e.target.angle < degRange || 360 - e.target.angle < degRange) {
        e.target.angle = 0;
      } else if (Math.abs(e.target.angle - 90) < degRange) {
        e.target.angle = 90;
      } else if (Math.abs(e.target.angle - 180) < degRange) {
        e.target.angle = 180;
      } else if (Math.abs(e.target.angle - 270) < degRange) {
        e.target.angle = 270;
      }
    }
    ctFabric.renderAll();
  });

  // touch patt
//   当在触摸设备上长按屏幕一定时间时；
// 当用户在长按期间移动手指时，也会触发 touch:longpress 事件。
  // -----------------------------------------
  ctFabric.on('touch:longpress', (e) => {
    const pointer = ctFabric.getPointer(e.e);
    const objects = ctFabric.getObjects();

    const outputPointer = {
      x: pointer.x + pan.x,
      y: pointer.y + pan.y,
    };

    const maskCount = Object.keys(masks).length;

    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];
      if (!object.isMask && object.containsPoint(pointer)) {
        // console.log(object);
        const params = {
          caId: insData.caId,
          uuid: object.uuid,
          type: object.type,
          tech: object.tech,
          pattId: object.pattId,
          allowUp: i < objects.length - 1,
          allowDown: i > maskCount,
          pointer: outputPointer,
          applyMask: object.applyMask,
          partId: object.partId,
          groupPartId: object.groupPartId,
          subPartId: object.subPartId,
        };
        if (object.type === 'text') {
          params.text = object.text;
          params.fontFamily = object.fontFamily;
          params.color = object.fill;
          params.fontSize = object.fontSize;
        }
        emit('pattTouched', params);
        break;
      }
    }
  });
};

export default CTextureV2;
