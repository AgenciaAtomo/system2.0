import {StockPage} from '@/components/operations-pages';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <StockPage params={await searchParams}/>;}
