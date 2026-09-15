"use client";
import {useActionState} from "react";
import {login} from "@/app/auth/actions";
import {Button} from "@/components/ui/button";
export function LoginForm({configured}:{configured:boolean}){
 const [state,action,pending]=useActionState(login,{error:""});
 return <form action={action} className="login-form">
 <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} disabled={!configured||pending}/>
 <label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={!configured||pending}/>
 {state.error&&<p role="alert" className="notice">{state.error}</p>}
 <Button disabled={!configured||pending} type="submit">{pending?"Entrando…":"Entrar"}</Button>
 </form>;
}
