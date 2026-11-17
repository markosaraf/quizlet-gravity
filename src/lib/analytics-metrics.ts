export type MetricKey='registered'|'guests'|'played'|'created';
export function changeLabel(current:number,previous:number|null){
 if(previous===null)return 'No comparison';
 if(previous===0)return current===0?'0%':'New';
 const change=(current-previous)/previous*100;
 return `${change>0?'+':''}${new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(change)}%`;
}
export type AnalyticsPoint={date:string;value:number;previous:number|null;previousDate:string};
export type AnalyticsMetric={key:string;label:string;value:number;current:number;previous:number|null;note:string;chartLabel:string;points:AnalyticsPoint[]};
