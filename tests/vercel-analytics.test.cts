import assert from 'node:assert/strict';
import {test} from 'node:test';
import {vercelAnalytics} from '../src/lib/community/vercel-analytics';
test('Vercel traffic preserves period visitor deduplication and authenticates only to Vercel',async()=>{
 const original=global.fetch,token=process.env.VERCEL_ANALYTICS_TOKEN;process.env.VERCEL_ANALYTICS_TOKEN='test-credential';
 const calls:URL[]=[];
 global.fetch=async(input,init)=>{
  const url=new URL(String(input));calls.push(url);assert.equal(url.origin,'https://api.vercel.com');
  assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-credential');
  assert.equal(url.searchParams.get('projectId'),'prj_R6u5AFA00O4splXf4tj5JQh3chL2');
  const grouped=url.searchParams.get('by')==='environment';
  return Response.json({data:grouped?[{environment:'production',visitors:5,pageviews:12}]:[{timestamp:url.searchParams.get('since')+'T00:00:00.000Z',visitors:4,pageviews:6}]});
 };
 try{const result=await vercelAnalytics(7);assert.equal(result.metrics[0].value,5);assert.equal(result.metrics[0].points.length,7);assert.equal(calls.length,4);assert(!JSON.stringify(result).includes('test-credential'));assert(calls.filter(u=>u.searchParams.get('by')==='environment').every(u=>u.searchParams.get('until')!.includes('T')));}
 finally{global.fetch=original;if(token)process.env.VERCEL_ANALYTICS_TOKEN=token;else delete process.env.VERCEL_ANALYTICS_TOKEN;}
});
