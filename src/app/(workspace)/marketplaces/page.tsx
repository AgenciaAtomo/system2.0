import {ChannelsPage} from '@/components/operations-pages';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <ChannelsPage params={await searchParams}/>;}
