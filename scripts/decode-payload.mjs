/** Decode the reference's flattened Nuxt data for offline extraction only. */
export function decodePayload(values){
 const cache=new Map();
 function decode(index){
  if(index===-1)return undefined;if(index===-2)return NaN;if(index===-3)return Infinity;if(index===-4)return -Infinity;if(index===-5)return -0;if(index===-6)return undefined;
  if(cache.has(index))return cache.get(index);
  const value=values[index];if(!value||typeof value!=='object')return value;
  if(Array.isArray(value)&&typeof value[0]==='string'){
   if(['Reactive','ShallowReactive','Ref','ShallowRef'].includes(value[0]))return decode(value[1]);
   if(value[0]==='Set')return value.slice(1).map(decode);
  }
  const result=Array.isArray(value)?[]:{};cache.set(index,result);for(const k in value)result[k]=decode(value[k]);return result;
 }
 return decode(0);
}
