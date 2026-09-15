"use client";
import {useActionState} from "react";
import {uploadDocument} from "@/app/documents/actions";
import {Button} from "@/components/ui/button";
export function DocumentForm(){const [state,action,pending]=useActionState(uploadDocument,{message:""});return <form action={action} className="flex flex-wrap items-center gap-4"><label className="text-sm">Documento da empresa<input className="mt-2 block max-w-full text-sm" type="file" name="file" accept="application/pdf,image/png,image/jpeg" required disabled={pending}/></label><Button type="submit" disabled={pending}>{pending?"Enviando…":"Guardar documento"}</Button><p className="w-full text-sm text-zinc-600" role="status">{state.message||"PDF, PNG ou JPEG · até 10 MB · acesso privado"}</p></form>;}
