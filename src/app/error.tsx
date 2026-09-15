"use client";import {Button} from "@/components/ui/button";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="fallback"><h1>Não foi possível carregar</h1><p>Tente novamente. Se o problema continuar, procure o administrador.</p><Button onClick={reset}>Tentar novamente</Button></main>;}
