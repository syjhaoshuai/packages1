/*
 * @Author: lby
 * @Date: 2021-08-02 11:18:48
 * @LastEditors: lby
 * @LastEditTime: 2021-08-02 13:12:10
 * @Description: file content
 */

import CBY3DCore from './src/main.vue';

CBY3DCore.install = function (Vue) {
  Vue.component(CBY3DCore.name, CBY3DCore);
};

export default CBY3DCore;
