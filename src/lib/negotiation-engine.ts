import { floorPrice, margin } from './pricing-rules';
export function negotiate(counter:number,base:number,target:number){
 const floor=floorPrice(base), gap=target-counter;
 if(counter<floor) return {blocked:true,floor,offer:floor,steps:[],reason:'Counter sits below the approved 35% contribution margin floor.'};
 const steps=[target-500000,target-900000,target-1200000,floor].filter((v,i,a)=>v>=floor&&v<target&&a.indexOf(v)===i);
 const offer=Math.max(floor,Math.min(target-500000,counter+Math.min(gap*.18,500000)));
 const topics=gap>5000000?['Phased scope','Tooling precision','Lifecycle reliability']:gap>2000000?['Testing & quality','Phased scope']:['Quality assurance','Delivery assurance'];
 return {blocked:false,floor,offer,steps,margin:margin(offer,base),topics,reason:'Trade price movement for a documented scope or payment commitment.'};
}
export function technicalResponse(topics:string[]){return topics.map(t=>t==='Tooling precision'?'Automotive die tolerances require validated tooling iterations and metrology sign-off; reducing engineering effort raises rework and fitment risk.':t==='Testing & quality'?'Retain the planned QA cycles and dimensional checks to catch failure modes before production handover.':t==='Lifecycle reliability'?'Protect maintenance documentation and reliability validation to reduce unplanned line downtime across the tool lifecycle.':'Offer a phased release: preserve safety and acceptance criteria, then schedule non-critical enhancements as a separately priced phase.');}
