import{c as i}from"./index-BAHomTSj.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polygon",{points:"10 8 16 12 10 16 10 8",key:"1cimsy"}]],b=i("CirclePlay",l);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],f=i("ExternalLink",h);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],v=i("FileText",p);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]],k=i("Video",y);function _(t){if(!t||!t.trim())return{type:"empty",embedUrl:null,rawUrl:""};const e=t.trim(),s=/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i,c=e.match(s);if(c&&c[1])return{type:"youtube",embedUrl:`https://www.youtube-nocookie.com/embed/${c[1]}?rel=0&modestbranding=1`,rawUrl:e};const d=e.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)||e.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);if(d&&d[1])return{type:"google_drive",embedUrl:`https://drive.google.com/file/d/${d[1]}/preview`,rawUrl:e};const o=e.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i);if(o&&o[1]&&o[2]){const r=o[1],m=o[2];return{type:"google_drive",embedUrl:`https://docs.google.com/${r}/d/${m}/preview`,rawUrl:e}}const a=e.match(/loom\.com\/share\/([a-zA-Z0-9]+)/i);return a&&a[1]?{type:"loom",embedUrl:`https://www.loom.com/embed/${a[1]}`,rawUrl:e}:/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(e)?{type:"direct_video",embedUrl:n(e),rawUrl:e}:{type:"external_doc",embedUrl:null,rawUrl:n(e)}}function n(t){if(!t||!t.trim())return"#";const e=t.trim();return/^https?:\/\//i.test(e)||e.startsWith("mailto:")||e.startsWith("tel:")?e:`https://${e}`}export{b as C,f as E,v as F,k as V,n as e,_ as g};
