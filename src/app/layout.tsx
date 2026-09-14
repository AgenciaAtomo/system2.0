import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Bueno Express | Gestão",description:"Gestão financeira e operacional da Bueno Express."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
