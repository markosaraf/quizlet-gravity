import {CreateGame} from '@/components/discovery/Discovery';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CreateGame sourceId={id}/>;}
