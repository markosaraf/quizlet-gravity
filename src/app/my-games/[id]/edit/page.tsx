import {CreateGame} from '@/components/discovery/Discovery';
export const metadata={title:'Edit your game | Quizlet Gravity',robots:{index:false,follow:false}};
export default async function EditOwnedGame({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <CreateGame key={id} editId={id}/>;
}
