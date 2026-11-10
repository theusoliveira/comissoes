import { logado } from "@/lib/auth";
import { listar } from "@/actions/lancamentos";
import Login from "@/components/Login";
import Comissoes from "@/components/Comissoes";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await logado())) return <Login />;
  const inicial = await listar();
  return <Comissoes inicial={inicial} />;
}
