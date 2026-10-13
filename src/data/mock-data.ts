export type Deal={id:string,name:string,customer:string,rep:string,stage:string,value:number,close:string,margin:number,tag:string};
export const mockDeals:Deal[]=[
 {id:'TM-042',name:'Die tooling programme',customer:'Tata Motors',rep:'Abhinav',stage:'In negotiation',value:15000000,close:'28 Oct',margin:46,tag:'Automotive'},
 {id:'PR-118',name:'EV battery enclosure line',customer:'Prism Auto',rep:'Priya',stage:'Quote submitted',value:8600000,close:'04 Nov',margin:42,tag:'Manufacturing'},
 {id:'AC-071',name:'Plant quality analytics',customer:'Apex Components',rep:'Rahul',stage:'Technical sizing',value:6200000,close:'12 Nov',margin:49,tag:'Software'},
 {id:'NV-209',name:'CNC retrofit & tooling',customer:'Nova Precision',rep:'Abhishek',stage:'Internal rationalization',value:4700000,close:'18 Nov',margin:37,tag:'Industrial'},
 {id:'OR-033',name:'Supplier portal rollout',customer:'Orion Mobility',rep:'Priya',stage:'In negotiation',value:9200000,close:'22 Nov',margin:32,tag:'Software'}
];
export const reps=['All reps','Abhinav','Abhishek','Priya','Rahul'];
