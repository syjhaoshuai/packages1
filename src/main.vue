<!--
 * @Author: lby
 * @Date: 2021-08-02 11:18:57
 * @LastEditors: lby
 * @LastEditTime: 2021-09-18 14:25:53
 * @Description: file content
-->
<template>
  <div class="cby-3dcore" ref="cby-3dcore" @touchstart="$emit('touchstart')">
    <canvas ref="cby-3dcore-canvas" class="cby-3dcore-canvas"></canvas>
    <div class="cby-3dcore-ctexture-wrap" ref="cby-3dcore-ctexture-wrap"></div>
  </div>
</template>

<script>
import Vue from "vue";
// import CBYC from './utils/cbyc';
import CBYC from "./utils/cbyc.re";
import { loadConf } from "./utils/fns";

let vm = null;
export default {
  name: "CBY3DCore",
  props: ["options"],
  mounted() {
    try {
      vm = this;
      if (!this.$cbyc) {
        const dataset = loadConf("./config/cby-dataset.json");
        Promise.all([dataset]).then((json) => {
          const options = {
            dataset: json[0],
            canvasEle: this.$refs["cby-3dcore-canvas"],
            wrapEle: this.$refs["cby-3dcore"],
            ctWrapEle: this.$refs["cby-3dcore-ctexture-wrap"],
            vm,
            debug: true,
            preload: true,
            preloadList: [],
          };
          Object.assign(options, this.options);
          Vue.prototype.$cbyc = new CBYC(options);
          this.$emit("CBYCMounted", true);
        });
      }
      // preload font
      // const fontProximaNovaBold = new FontFace('proximanova-bold', 'url(/fonts/proximanova-bold.ttf)', { style: 'normal', weight: 'normal' });
      // const fontProximaNovaMedium = new FontFace('proximanova-medium', 'url(/fonts/proximanova-medium.ttf)', { style: 'normal', weight: 'normal' });
    } catch (error) {
      console.warn(error);
    }
  },
};
</script>

<style lang="css">
@import "./cby-3dcore.css";
</style>
