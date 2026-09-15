import {operationData} from '@/services/operations';
import {choices,list} from '@/lib/operations';
import {OpHeader} from '@/components/operations-pages';
import {ImportForm} from '@/components/import-form';
export default async function Page(){const {data,canWrite}=await operationData('settings');return <main className="content finance-content"><OpHeader title="Importação" description="Traga seus dados em lote, confira a prévia e veja o resultado de cada registro."/>{canWrite?<ImportForm channels={choices(list(data.channels))} accounts={choices(list(data.accounts))} categories={choices(list(data.categories))}/>:<p className="notice">Seu perfil permite apenas consulta.</p>}</main>;}
