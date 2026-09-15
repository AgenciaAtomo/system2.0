import {SalesPage} from '@/components/operations-pages';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <SalesPage params={await searchParams} receivables/>;}
