import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Leaf, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CONFIRM_WORD = "ELIMINAR";

// Definido fuera de DeleteAccount a propósito: si viviera adentro, cada
// keystroke re-renderiza DeleteAccount y React trataría a Shell como un
// componente nuevo en cada render, desmontando el <Input> y perdiendo el
// foco (por eso se escondía el teclado al escribir).
const Shell = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 mb-6 mx-auto flex-col w-full">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">TINKUYHUB</span>
          </div>
        </button>
        {children}
      </div>
    </div>
  );
};

// Página pública de eliminación de cuenta/datos, exigida por la política de
// Google Play. Funciona en dos modos:
//  - Con sesión iniciada: borra la cuenta ahora mismo (Edge Function
//    delete-account, que usa auth.admin.deleteUser del lado del servidor).
//  - Sin sesión (o sin la app instalada, solo con el link): registra una
//    solicitud por email en account_deletion_requests para procesarla manualmente.
const DeleteAccount = () => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const [requestEmail, setRequestEmail] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleDeleteNow = async () => {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) {
      toast.error(`Escribe "${CONFIRM_WORD}" para confirmar`);
      return;
    }

    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account");
    setDeleting(false);

    if (error) {
      toast.error(error.message ?? "No se pudo eliminar tu cuenta. Inténtalo de nuevo.");
      return;
    }

    setDeleted(true);
    await signOut();
    toast.success("Tu cuenta fue eliminada.");
    setTimeout(() => navigate("/"), 2500);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) {
      toast.error("Ingresa el correo de tu cuenta");
      return;
    }

    setSubmittingRequest(true);
    const { error } = await supabase
      .from("account_deletion_requests" as any)
      .insert({ email: requestEmail.trim(), reason: requestReason.trim() } as any);
    setSubmittingRequest(false);

    if (error) {
      toast.error("No se pudo enviar tu solicitud. Escríbenos a soporte@tinkuyhub.com");
      return;
    }

    setRequestSent(true);
  };

  // --- Sesión iniciada: borrado directo ---
  if (session && user) {
    if (deleted) {
      return (
        <Shell>
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Cuenta eliminada</h1>
            <p className="text-sm text-muted-foreground">Tus datos fueron borrados. Te redirigimos al inicio…</p>
          </div>
        </Shell>
      );
    }

    return (
      <Shell>
        <div className="bg-card rounded-2xl border border-destructive/30 shadow-card p-8">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground text-center mb-2">Eliminar tu cuenta</h1>
          <p className="text-sm text-muted-foreground text-center mb-5">
            Cuenta: <span className="font-medium text-foreground">{user.email}</span>
          </p>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground mb-5">
            <p className="font-medium text-foreground mb-2">Esto borra permanentemente:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tu perfil, foto y datos de contacto</li>
              <li>Puntos, racha, nivel e insignias ganadas</li>
              <li>Tus inscripciones a eventos y fotos subidas</li>
              <li>Si publicaste eventos como organización, también se eliminan</li>
            </ul>
            <p className="mt-3">Esta acción no se puede deshacer.</p>
          </div>

          <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
            Escribe <span className="font-mono font-bold">{CONFIRM_WORD}</span> para confirmar
          </Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="mt-1.5 mb-5"
            disabled={deleting}
          />

          <Button
            variant="destructive"
            className="w-full h-11"
            disabled={deleting || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
            onClick={handleDeleteNow}
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {deleting ? "Eliminando..." : "Eliminar mi cuenta definitivamente"}
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4"
          >
            Cancelar y volver
          </button>
        </div>
      </Shell>
    );
  }

  // --- Sin sesión: formulario de solicitud por email (accesible sin instalar la app) ---
  if (requestSent) {
    return (
      <Shell>
        <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Solicitud recibida</h1>
          <p className="text-sm text-muted-foreground">
            Vamos a verificar la cuenta asociada a ese correo y eliminar sus datos en un plazo de hasta 30 días.
            Te confirmaremos por email cuando quede completado.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="bg-card rounded-2xl border border-border shadow-card p-8">
        <h1 className="text-xl font-bold text-foreground text-center mb-2">Solicitar eliminación de cuenta</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          ¿Ya tienes cuenta pero no puedes iniciar sesión? Déjanos tu correo y procesamos la eliminación manualmente.
          Si puedes iniciar sesión, hazlo primero: el borrado es inmediato desde tu perfil.
        </p>

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div>
            <Label htmlFor="requestEmail">Correo de tu cuenta</Label>
            <Input
              id="requestEmail"
              type="email"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={submittingRequest}
            />
          </div>
          <div>
            <Label htmlFor="requestReason">Motivo (opcional)</Label>
            <Textarea
              id="requestReason"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Cuéntanos brevemente por qué quieres eliminar tu cuenta"
              rows={3}
              disabled={submittingRequest}
            />
          </div>
          <Button type="submit" variant="destructive" className="w-full h-11" disabled={submittingRequest}>
            {submittingRequest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {submittingRequest ? "Enviando..." : "Solicitar eliminación"}
          </Button>
        </form>

        <button onClick={() => navigate("/auth")} className="w-full text-center text-sm text-primary hover:underline mt-6">
          Mejor inicio sesión para eliminarla al instante
        </button>
      </div>
    </Shell>
  );
};

export default DeleteAccount;
