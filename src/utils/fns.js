/*
 * @Author: lby
 * @Date: 2021-08-03 10:38:14
 * @LastEditors: lby
 * @LastEditTime: 2021-08-05 21:25:05
 * @Description: file content
 */
import axios from 'axios';

const loadConf = (url) => new Promise((resolve, reject) => {
  axios.get(url)
    .then((response) => {
      resolve(response.data);
    })
    .catch((error) => {
      console.log('CBYC: Error loading Config File ', error);
    });
});

const lglt2xyz = (lg, lt, radius) => {
  const y = radius * Math.sin(lt);
  const temp = radius * Math.cos(lt);
  const x = temp * Math.sin(lg);
  const z = temp * Math.cos(lg);
  return { x, y, z };
};

const xyz2lglt = (pos) => ({});

export { loadConf, lglt2xyz, xyz2lglt };
