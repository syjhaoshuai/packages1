/*
 * @Author: lby
 * @Date: 2021-08-08 13:24:36
 * @LastEditors: lby
 * @LastEditTime: 2021-09-21 16:49:19
 * @Description: file content
 */

// import { obj } from 'pumpify';
import { fabric } from './fabric';

const CTexture = function (op) {
  // =========================================
  // Init Params
  // =========================================
  // domWrapper
  const domWrapper = op.domWrapper;

  // fov
  const fov = op.fov;

  // update material texture
  const updateOnce = op.updateOnce;

  // debug
  const debug = !!op.debug;

  // mask
  const showMask = !!op.showMask;

  // dataset
  const dataset = op.dataset;

  // emit
  const emit = op.emit;

  // =========================================
  // Init Components
  // =========================================
  // ctSize
  const ctSize = {
    w: domWrapper.clientWidth,
    h: domWrapper.clientHeight,
  };

  // create ct canvas element
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

  // create mixer
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
    // caId
    caId: null,

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

    // caData
    caData: null,

    // size
    prodSize: null,
  };
  const insData = {};

  // mask params
  const maskDefault = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    // output
    offsetXInch: 0,
    offsetYInch: 0,
  };
  let mask = {};

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

  // cfs
  const cfs = {};

  // =========================================
  // Reset All
  // =========================================
  this.reset = (op) => {
    // console.log(op,'op11111111111111111111111111111');
    this.clear();
    Object.assign(insData, insDataDefault, op);
    // limits
    insData.limits = {
      print: 1,
      text: 1,
      embroidery: 1,
      hotPadding: 1,
    };
    // console.log(insData)
    mask = {};
    Object.assign(mask, maskDefault, insData.caData.mask);
    Object.assign(trans, insData.caData.trans);
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
    if (mask.inchw) {
      // mask.width * t2r.scale = maskinch
      mask.width = mask.inchw / t2r.scale;
      mask.height = mask.inchh / t2r.scale;

      // set to center - top
      mask.x = (texturePx - mask.width) / 2;
      mask.y = 0;

      // add offset
      mask.x += mask.offsetX * texturePx;
      mask.y += mask.offsetY * texturePx;

      // output: Left Top Offset in inch
      mask.offsetXInch = mask.x * t2r.scale;
      mask.offsetYInch = mask.y * t2r.scale;
    }
  };
  // calc once
  this.updateTrans();

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
    ctFabric.requestRenderAll();
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

  // =========================================
  // Update Mixer
  // =========================================
  this.update = () => {
    mixerCtx.clearRect(0, 0, mixer.width, mixer.height);

    // print
    // if (display.print) {
    // patts
    mixerCtx.drawImage(ctCanvas, 0, 0, ctCanvas.width, ctCanvas.height,
      f2t.x, f2t.y, f2t.width, f2t.height);
      
    // add mask
    if (mask.inchw) {
      // mixerCtx.fillStyle = '#000000';
      mixerCtx.globalCompositeOperation = 'destination-in';
      mixerCtx.fillRect(mask.x, mask.y, mask.width, mask.height);
    }

    // add mask board
    if (showMask && mask.inchw) {
      mixerCtx.globalCompositeOperation = 'source-over';
      mixerCtx.strokeStyle = '#000000';
      mixerCtx.lineWidth = 5;
      mixerCtx.strokeRect(mask.x, mask.y, mask.width, mask.height);
    }
    // }

    // basic color
    mixerCtx.globalCompositeOperation = 'destination-over';
    mixerCtx.fillStyle = insData.color;
    mixerCtx.fillRect(0, 0, mixer.width, mixer.height);

    // add fixed patts
    if (cfs) {
      mixerCtx.globalCompositeOperation = 'source-over';
      Object.keys(cfs).forEach((cfId) => {
        if (display[cfs[cfId].tech]) { 
          // no rotate
          if (!cfs[cfId].rotate) {
            mixerCtx.drawImage(cfs[cfId].img, cfs[cfId].x, 
              cfs[cfId].y, cfs[cfId].width, cfs[cfId].height);
          } else {
            mixerCtx.save();
            mixerCtx.translate(cfs[cfId].x + cfs[cfId].width / 2, cfs[cfId].y + cfs[cfId].height / 2);
            mixerCtx.rotate(Math.PI / 180 * cfs[cfId].rotate);
            // flip
            if (cfs[cfId].flipX || cfs[cfId].flipY) {
              const fx = cfs[cfId].flipX ? -1 : 1;
              const fy = cfs[cfId].flipY ? -1 : 1;
              mixerCtx.scale(fx, fy);
            }
            mixerCtx.drawImage(cfs[cfId].img, -cfs[cfId].width / 2, 
              -cfs[cfId].height / 2, cfs[cfId].width, cfs[cfId].height);
            mixerCtx.restore();
          }
        }
      });
    }

    // add texture
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

  const getInitPosJoint = (pattData) => {
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

    // calc offset
    if (pattData.offset) {
      Object.assign(init.offset, pattData.offset);
    }
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
  // Add Image
  // =========================================
  this.addImageObj = ({ cfId, pattData, tech }) => {
    // console.log('addImage', cfId, pattData, tech);
    
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
      if (cfs) {
        Object.keys(cfs).forEach((cfId) => {
          if (cfs[cfId].tech === tech) {
            imageCount += 1;
            if (imageCount + 1 > insData.limits[tech]) {
              delete (cfs[cfId]);
            }
          }
        });
      }
    }

    // add patt
    fabric.Image.fromURL(pattData.imagepath, (img) => {
      // init
      const init = getInitPosJoint(pattData);
      // 
      img.set({
        left: ctSize.w / 2 + insData.caData.trans.edx * pxPerSpace + init.offset.x,
        top: ctSize.h / 2 - insData.caData.trans.edy * pxPerSpace + init.offset.y,
        angle: init.rotate,
        originX: 'center',
        originY: 'center',
        scaleX: init.scale.x * p2f.scale / f2t.scale,
        scaleY: init.scale.y * p2f.scale / f2t.scale,
        flipX: init.flip.x,
        flipY: init.flip.y,
        minScaleLimit: init.scale.min * p2f.scale / f2t.scale,
        maxScaleLimit: init.scale.max * p2f.scale / f2t.scale,
      });
      img.hasBorders = debug;
      img.hasControls = debug;
      img.pattId = pattData.imageid;
      img.uuid = uuid();
      img.tech = tech;
      img.isCustom = 1;
      img.imagepath = pattData.imagepath;
      img.cfId = cfId;
      ctFabric.add(img).setActiveObject(img);

      // console.log(img);
    });
  };

  // =========================================
  // Add Text
  // =========================================
  this.addTextObj = (cfId, textData) => {
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

    // text info
    textData.text = textData.text ? textData.text : '';
    textData.color = textData.color ? textData.color : '#000000';
    textData.fontFamily = textData.fontFamily ? textData.fontFamily : 'proximanova-medium';
    textData.fontSize = textData.fontSize ? textData.fontSize : 200;

    // init pos
    const init = getInitPosJoint(textData);

    // 
    const textobj = new fabric.Text(textData.text, 
      {
        left: ctSize.w / 2 + insData.caData.trans.edx * pxPerSpace + init.offset.x,
        top: ctSize.h / 2 - insData.caData.trans.edy * pxPerSpace + init.offset.y,
        angle: init.rotate,
        originX: 'center',
        originY: 'center',
        fontSize: textData.fontSize,
        fill: textData.color,
        fontFamily: textData.fontFamily,
        minScaleLimit: init.scale.min * p2f.scale / f2t.scale,
        maxScaleLimit: init.scale.max * p2f.scale / f2t.scale,
      });
    textobj.scale(1 * p2f.scale / f2t.scale);
    textobj.hasBorders = debug;
    textobj.hasControls = debug;
    textobj.uuid = uuid();
    textobj.tech = 'print';
    textobj.isCustom = 1;
    textobj.cfId = cfId;
    ctFabric.add(textobj).setActiveObject(textobj);
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
        ctFabric.requestRenderAll();
        break;
      }
    }
  };
  // =========================================
  // Add Fixed Patt
  // =========================================
  this.addFixedImageObj = ({ cfId, pattData, tech }) => {
    console.log('addImage', cfId, pattData, tech);
    
    if (insData.caData.cfParts && insData.caData.cfParts[cfId]) {
      // limit
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
        if (cfs) {
          Object.keys(cfs).forEach((cfId) => {
            if (cfs[cfId].tech === tech) {
              imageCount += 1;
              if (imageCount + 1 > insData.limits[tech]) {
                delete (cfs[cfId]);
              }
            }
          });
        }
      }
      // add patt
      const cfTrans = insData.caData.cfParts[cfId];
      const img = new Image();
      img.src = pattData.imagepath;
      // console.log(img.src);
      img.onload = () => {
        const init = getInitPosJoint(pattData);
        // console.log(init);
        // calc the coords in texture
        const width = img.width / pattDPI / t2r.scale * init.scale.x;
        const height = img.height / pattDPI / t2r.scale * init.scale.y;
        const x = mixer.width / 2 - width / 2 + cfTrans.edx * texturePx + init.offset.x * f2t.scale;
        const y = mixer.height / 2 - height / 2 + cfTrans.edy * texturePx + init.offset.y * f2t.scale;
        const rotate = init.rotate;
        cfs[cfId] = {
          img,
          x,
          y,
          width,
          height,
          rotate,
          pattId: pattData.imageid,
          imagepath: pattData.imagepath,
          tech,
          type: 'fixedImage',
          noX: init.offset.x * f2t.scale / texturePx,
          noY: init.offset.y * f2t.scale / texturePx,
          scaleX: init.scale.x,
          scaleY: init.scale.y,
          flipX: init.flip.x,
          flipY: init.flip.y,
          uuid: uuid(),
          isCustom: 0,
          pattType: 'image',
        };

        // console.log(cfs[cfId]);

        // calc the coords in fabric
        // for hint test
        const finf = t2fCroodTrans({
          x,
          y,
        });
        cfs[cfId].fx = finf.left;
        cfs[cfId].fy = finf.top;
        cfs[cfId].fwidth = width / f2t.scale;
        cfs[cfId].fheight = height / f2t.scale;
        this.update();
      };
    } else {
      console.log('CBYC: Cannot find cfid info');
    }
  };

  // =========================================
  // Remove Image
  // =========================================
  this.removeImage = ({ type, cfId, uuid }) => {
    if (type === 'fixedImage') {
      if (cfs[cfId]) {
        delete (cfs[cfId]);
        this.update();
      }
    } else {
      const objects = ctFabric.getObjects();
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i];
        if (object.uuid === uuid) {
          ctFabric.remove(object);
          break;
        }
      }
    }
  };

  // =========================================
  // Reorder Image
  // =========================================
  this.reorderImage = (uuid, dir) => {
    const objects = ctFabric.getObjects();
    let to = 0;
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];
      if (object.uuid === uuid) {
        to = dir === 'up' ? i + 1 : i - 1;
        object.moveTo(to);
        break;
      }
    }
    return {
      allowUp: to < objects.length - 1,
      allowDown: to > 0,
    };
  };

  // =========================================
  // Flip Image
  // =========================================
  this.flipImage = (pattObj, dir) => {
    if (pattObj.type !== 'fixedImage') {
      const objects = ctFabric.getObjects();
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i];
        if (object.uuid === pattObj.uuid) {
          if (dir === 'x') {
            object.toggle('flipX');
          } else if (dir === 'y') {
            object.toggle('flipY');
          }
          break;
        }
      }
      ctFabric.requestRenderAll();
    } else if (cfs) {
      Object.keys(cfs).forEach((cfId) => {
        console.log(cfs[cfId].uuid);
        if (cfs[cfId].uuid === pattObj.uuid) {
          if (dir === 'x') {
            cfs[cfId].flipX = !cfs[cfId].flipX;
          } else if (dir === 'y') {
            cfs[cfId].flipY = !cfs[cfId].flipY;
          }
        }
      });
    }
    
    this.update();
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
  const ts2t = {
    embroideries: 'embroidery',
    hotPaddings: 'hotPadding',
    prints: 'print',
  };
  const getPartidByPartcode = (partcode) => {
    let partId = '';
    Object.keys(dataset.parts).forEach((partid) => {
      if (dataset.parts[partid].partcode === partcode) {
        partId = dataset.parts[partid].partid;
      }
    });
    return partId;
  };

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
        const tobj = f2tCroodTrans(json.objects[i]);
        const nobj = t2nCroodTrans(tobj);
        // console.log(nobj);
        nobj.pattType = json.objects[i].type;
        nobj.isCustom = json.objects[i].isCustom;
        nobj.cfId = json.objects[i].cfId;
        if (nobj.pattType === 'image') {
          nobj.pattId = json.objects[i].pattId;
          nobj.imagepath = json.objects[i].imagepath;
        } else if (nobj.pattType === 'text') {
          nobj.text = json.objects[i].text;
          nobj.fontFamily = json.objects[i].fontFamily;
          nobj.color = json.objects[i].fill;
          // calc equal fontsize
          nobj.fontSize = json.objects[i].fontSize * nobj.scaleX;
        }
        // nobj.originWidth = json.objects[i].width;
        // nobj.originHeight = json.objects[i].height;
        // mask
        if (mask.inchw) {
          nobj.x -= mask.offsetXInch;
          nobj.y -= mask.offsetYInch;
        }
        const cfId = json.objects[i].cfId;
        if (!rJSON[cfId]) {
          rJSON[cfId] = {};
        }
        if (!rJSON[cfId].prints) {
          rJSON[cfId].prints = [];
        }
        const tech = json.objects[i].tech;
        if (!rJSON[cfId][t2ts[tech]]) {
          rJSON[cfId][t2ts[tech]] = [];
        }
        rJSON[cfId][t2ts[tech]].push(nobj);
      }
    }

    // get fixed images
    // including embroideries and hotPaddings

    if (cfs) {
      Object.keys(cfs).forEach((cfId) => {
        if (!rJSON[cfId]) {
          rJSON[cfId] = {
            partid: getPartidByPartcode(cfId),
          };
        }
        if (!rJSON[cfId][t2ts[cfs[cfId].tech]]) {
          rJSON[cfId][t2ts[cfs[cfId].tech]] = [];
        }
        rJSON[cfId][t2ts[cfs[cfId].tech]].push({
          pattId: cfs[cfId].pattId,
          imagepath: cfs[cfId].imagepath,
          scaleX: cfs[cfId].scaleX * (cfs[cfId].flipX ? -1 : 1),
          scaleY: cfs[cfId].scaleY * (cfs[cfId].flipY ? -1 : 1),
          rotate: cfs[cfId].rotate,
          oX: cfs[cfId].noX * texturePx * t2r.scale,
          oY: cfs[cfId].noY * texturePx * t2r.scale,
          noX: cfs[cfId].noX,
          noY: cfs[cfId].noY,
          cfId,
          isCustom: 0,
          pattType: cfs[cfId].pattType,
        });
      });
    }
    return rJSON;
  };

  // real JSON to fabric JSON
  // -----------------------------------------
  const r2fAddPatt = (cf, tech, fJSON) => {
    if (cf.isCustom) {
      // cf
      let cfId = cf.cfId;
      if (!cfId) cfId = insData.caId.replace(/ca/, 'cf');
      // mask
      if (mask.inchw) {
        cf.x += mask.offsetXInch;
        cf.y += mask.offsetYInch;
      }
      // 
      const tobj = n2tCoordTrans(cf);
      // console.log(tobj);
      const fobj = t2fCroodTrans(tobj);
      const add = {
        backgroundColor: '',
        cropX: 0,
        cropY: 0,
        crossOrigin: true,
        erasable: true,
        fill: 'rgb(0,0,0)',
        fillRule: 'nonzero',
        filters: [],
        globalCompositeOperation: 'source-over',
        opacity: 1,
        originX: 'center',
        originY: 'center',
        paintFirst: 'fill',
        pattId: cf.pattId,
        shadow: null,
        skewX: 0,
        skewY: 0,
        stroke: null,
        strokeWidth: 0,
        strokeDashArray: null,
        strokeLineCap: 'butt',
        strokeDashOffset: 0,
        strokeLineJoin: 'miter',
        strokeUniform: false,
        strokeMiterLimit: 4,
        type: cf.pattType,
        version: '4.4.0',
        visible: true,
        hasBorders: false,
        hasControls: false,
        uuid: uuid(),
        tech,
        isCustom: 1,
        cfId,
      };
      if (cf.pattType === 'image') {
        Object.assign(add, {
          src: dataset.images[cf.pattId].imagepath,
          imagepath: dataset.images[cf.pattId].imagepath,
        });
      } else if (cf.pattType === 'text') {
        Object.assign(add, {
          fontFamily: cf.fontFamily,
          fill: cf.color,
          text: cf.text,
          fontSize: cf.fontSize / cf.scaleX,
        });
      }
      // console.log(add);
      Object.assign(fobj, add);
      fJSON.objects.push(fobj);
    } else {
      // console.log(cf.pattId);
      this.addFixedImageObj({
        cfId: cf.cfId, 
        pattData: {
          imageid: cf.pattId,
          imagepath: dataset.images[cf.pattId].imagepath,
          scale: {
            x: cf.scaleX,
            y: cf.scaleY,
          },
          offset: {
            x: cf.noX,
            y: cf.noY,
          },
          rotate: cf.rotate,
        }, 
        uuid: uuid(),
        tech,
      });
    }
  };

  // real JSON to fabric JSON
  // -----------------------------------------
  const rJSON2fJSON = (caJSON) => {
    const fJSON = {
      objects: [],
      version: '4.4.0',
    };

    Object.keys(caJSON).forEach((cfId) => {
      const json = caJSON[cfId];

      if (json.prints) {
        json.prints.forEach((cf) => {
        // console.log(cf);
          r2fAddPatt(cf, 'print', fJSON);
        });
      }

      if (json.embroideries) {
        json.embroideries.forEach((cf) => {
        // console.log(cf);
          r2fAddPatt(cf, 'embroidery', fJSON);
        });
      }
      if (json.hotPaddings) {
        json.hotPaddings.forEach((cf) => {
        // console.log(cf);
          r2fAddPatt(cf, 'hotPadding', fJSON);
        });
      }
    });
    return fJSON;
  };

  // =========================================
  // IMPORT & EXPORT 
  // =========================================
  this.getExportJSON = () => {
    const fabricJSON = ctFabric.toJSON(['pattId', 'imagepath', 'isCustom', 'cfId', 'tech']);
    const exportJSON = {};
    exportJSON[insData.caId] = fJSON2rJSON(fabricJSON);
    return exportJSON;
  };

  this.loadPattFromJSON = (json) => {
    const fabricJSON = rJSON2fJSON(json);
    ctFabric.loadFromJSON(fabricJSON);
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

  // clear images
  // -----------------------------------------
  this.clear = () => {
    ctFabric.clear();
    if (cfs) {
      Object.keys(cfs).forEach((cfId) => {
        delete (cfs[cfId]);
      });
    }
    if (mask) {
      Object.keys(mask).forEach((id) => {
        delete (mask[id]);
      });
    }
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
  this.setLimits = (limits) => {
    // add limits
    if (!insData.limits) {
      insData.limits = {};
    }
    if (limits && typeof (limits) === 'object') {
      insData.limits.print = (limits.print !== undefined) ? limits.print : 1;
      insData.limits.text = (limits.text !== undefined) ? limits.text : 1;
      insData.limits.embroidery = (limits.embroidery !== undefined) ? limits.embroidery : 1;
      insData.limits.hotPadding = (limits.hotPadding !== undefined) ? limits.hotPadding : 1;
    }
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
  ctFabric.on('after:render', () => {
    this.update();
  });

  // touch patt
  // -----------------------------------------
  ctFabric.on('touch:longpress', (e) => {
    const pointer = ctFabric.getPointer(e.e);
    const objects = ctFabric.getObjects();
    let hint = false;

    // hint test for fixed patts
    if (cfs) {
      Object.keys(cfs).forEach((cfId) => {
        if (pointer.x >= cfs[cfId].fx
          && pointer.x <= cfs[cfId].fx + cfs[cfId].fwidth
          && pointer.y >= cfs[cfId].fy
          && pointer.y <= cfs[cfId].fy + cfs[cfId].fheight) {
          // console.log('hint');
          hint = true;
          emit('pattTouched', {
            caId: insData.caId,
            cfId,
            tech: cfs[cfId].tech,
            type: 'fixedImage',
            uuid: cfs[cfId].uuid,
            pointer,
          });
        }
      });
    }

    // hint test for prints
    if (!hint) {
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i];
        if (object.containsPoint(pointer)) {
          // console.log(object);
          hint = true;
          emit('pattTouched', {
            caId: insData.caId,
            uuid: object.uuid,
            type: object.type,
            tech: object.tech,
            text: object.text,
            fontFamily: object.fontFamily,
            color: object.fill,
            pattId: object.pattId,
            allowUp: i < objects.length - 1,
            allowDown: i > 0,
            pointer,
          });
          break;
        }
      }
    }
  });
};

export default CTexture;
