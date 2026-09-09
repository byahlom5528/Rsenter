import{c as r}from"./index-Bsonji7F.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]],c=r("Award",s);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],y=r("Check",e);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]],u=r("PenLine",p);function f(o){if(!o||!o.trim())return[];try{const i=JSON.parse(o);if(Array.isArray(i))return i.map((t,n)=>({id:t.id||`bq_${n+1}`,question:typeof t.question=="string"?t.question.trim():"",option1:typeof t.option1=="string"&&t.option1.trim()?t.option1.trim():"אפשרות 1",option2:typeof t.option2=="string"&&t.option2.trim()?t.option2.trim():"אפשרות 2"}));if(i&&typeof i=="object"&&Array.isArray(i.questions))return i.questions.map((t,n)=>({id:t.id||`bq_${n+1}`,question:typeof t.question=="string"?t.question.trim():"",option1:typeof t.option1=="string"&&t.option1.trim()?t.option1.trim():"אפשרות 1",option2:typeof t.option2=="string"&&t.option2.trim()?t.option2.trim():"אפשרות 2"}))}catch{if(o.trim())return[{id:"bq_1",question:o.trim(),option1:"אפשרות 1",option2:"אפשרות 2"}]}return[]}function d(o){const i=o.filter(t=>t.option1.trim().length>0&&t.option2.trim().length>0).map((t,n)=>({id:t.id||`bq_${n+1}`,question:t.question.trim(),option1:t.option1.trim(),option2:t.option2.trim()}));return JSON.stringify(i)}function l(o){if(!o||!o.trim())return{};try{const i=JSON.parse(o);if(i&&typeof i=="object"&&!Array.isArray(i))return i}catch{}return{}}function g(o){return JSON.stringify(o)}export{c as A,y as C,u as P,f as a,d as b,l as p,g as s};
