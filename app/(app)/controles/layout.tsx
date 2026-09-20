import { GuardiaModulo } from "@/components/sistema/GuardiaModulo";

export default function ControlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuardiaModulo codigo="riesgos" nombre="Controles">
      {children}
    </GuardiaModulo>
  );
}
