'use client';
import {useState} from 'react';
export function CardImagePicker({label,image,onChange,disabled=false}:{label:string;image?:string;disabled?:boolean;onChange:(image:string|undefined)=>void}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function upload(file:File){
  setError('');if(file.size>4*1024*1024){setError('Choose an image smaller than 4 MB.');return;}
  setBusy(true);
  try{const response=await fetch('/api/set-images',{method:'POST',headers:{'Content-Type':file.type||'image/jpeg'},body:file});const result=await response.json();if(!response.ok)throw Error(result.error||'Upload failed.');onChange(result.url);}
  catch(e){setError(e instanceof Error?e.message:'Upload failed. Please retry.');}finally{setBusy(false);}
 }
 return <div className="GravityCardImagePicker">
  {image&&<img src={image} alt={`${label} image`} loading="lazy"/>}
  <label className="GravityCardImagePicker-upload">{busy?'Uploading…':image?'Replace image':'+ Add image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label={`${label}: add image`} disabled={busy||disabled} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label>
  {image&&<button type="button" disabled={busy||disabled} onClick={()=>onChange(undefined)}>Remove image</button>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
