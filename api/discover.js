'use strict';
/** AFTERGLOW Qloo integration — server only. Never ship QLOO_API_KEY client-side. */
const HOST=process.env.QLOO_BASE_URL||'https://hackathon.api.qloo.com';
const TYPES={movie:'urn:entity:movie',artist:'urn:entity:artist',book:'urn:entity:book'};
function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))}
async function getQloo(route,params,apiKey){const url=new URL(route,HOST);for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null)url.searchParams.set(key,String(value));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(url,{method:'GET',headers:{'X-Api-Key':apiKey,'Accept':'application/json'},signal:controller.signal});const text=await response.text();let body;try{body=JSON.parse(text)}catch{throw new Error('Qloo returned a non-JSON response')}
 if(!response.ok){if(response.status===401||response.status===403)throw new Error('Qloo access was rejected. Check the event-issued credential.');if(response.status===429)throw new Error('Qloo rate limit reached. Try again later.');throw new Error('Qloo request failed (HTTP '+response.status+').')}
 return body;}catch(error){if(error.name==='AbortError')throw new Error('Qloo request timed out.');throw error}finally{clearTimeout(timer)}}
function extractEntities(data){if(Array.isArray(data?.results?.entities))return data.results.entities;if(Array.isArray(data?.results))return data.results;if(Array.isArray(data?.entities))return data.entities;if(Array.isArray(data?.data))return data.data;return []}
function entityId(e){return String(e?.entity_id||e?.id||e?.entity?.entity_id||e?.entity?.id||'')}
function entityName(e){return String(e?.name||e?.title||e?.entity?.name||e?.properties?.name||'').trim()}
function explanationFor(e){const items=e?.query?.explainability||e?.explainability||{};if(items&&typeof items==='object'){const input=Object.keys(items).filter(k=>items[k]&&typeof items[k]==='number');if(input.length)return 'Cultural affinity contributions available from Qloo ('+input.length+' signals).'}return null}
function validate(body){if(!body||typeof body!=='object'||Array.isArray(body))return 'Provide a valid JSON request.';if(!Array.isArray(body.favorites)||body.favorites.length<2||body.favorites.length>4)return 'Add 2–4 cultural favorites.';if(!TYPES[body.category])return 'Choose films, music or books.';if(!['familiar','surprising'].includes(body.depth))return 'Invalid discovery style.';for(const item of body.favorites){if(!item||!TYPES[item.type]||typeof item.name!=='string'||!item.name.trim()||item.name.length>70)return 'Each favorite must have a supported type and a short name.';}return null}
async function handler(req,res){if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST to discover cultural recommendations.'})}
 const key=process.env.QLOO_API_KEY;if(!key)return send(res,503,{error:'Qloo live access is not connected yet. Add an event-issued QLOO_API_KEY securely on the server to enable discoveries.'});
 let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch{return send(res,400,{error:'Invalid JSON.'})}}if(!body||typeof body!=='object')return send(res,400,{error:'Invalid body.'});
 const error=validate(body);if(error)return send(res,400,{error});
 try{
 const seeds=body.favorites.map(item=>({...item,name:item.name.trim()}));
 const found=await Promise.all(seeds.map(async item=>{const result=await getQloo('/search',{query:item.name,types:TYPES[item.type],take:5},key);const candidates=extractEntities(result);const candidate=candidates.find(e=>entityId(e)&&entityName(e).toLowerCase()===item.name.toLowerCase())||candidates.find(e=>entityId(e)&&entityName(e));return candidate?{name:item.name,match:entityName(candidate),id:entityId(candidate),type:item.type}:null}));
 const resolved=found.filter(Boolean),unresolved=seeds.filter((_,i)=>!found[i]).map(s=>s.name);
 if(!resolved.length)return send(res,422,{error:'Qloo could not resolve your favorites. Use specific artist, book or film titles.'});
 const idList=[...new Set(resolved.map(x=>x.id))];
 const insights=await getQloo('/v2/insights',{'filter.type':TYPES[body.category],'signal.interests.entities':idList.join(','),'filter.exclude.entities':idList.join(','),'feature.explainability':'true','take':body.depth==='surprising'?16:8},key);
 const candidates=extractEntities(insights);
 const seen=new Set(idList),picks=[];
 for(const e of candidates){const id=entityId(e),name=entityName(e);if(!id||!name||seen.has(id))continue;seen.add(id);picks.push({id,name,explanation:explanationFor(e)});}
 const ranked=body.depth==='surprising'?picks.slice(3,9):picks.slice(0,6);
 return send(res,200,{source:'Qloo Insights API',category:body.category,depth:body.depth,resolved:resolved.map(({name,match,type})=>({name,match,type})),unresolved,picks:ranked});
 }catch(error){return send(res,502,{error:(error&&error.message)||'The Qloo request failed.'})}
}
module.exports=handler;
module.exports._internal={validate,extractEntities,entityId,entityName};