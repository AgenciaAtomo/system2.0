import {ReportPage} from '@/components/report-pages';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <ReportPage params={await searchParams}/>;}
