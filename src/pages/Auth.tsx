import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Leaf, Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle2, Phone, Building2, Briefcase, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate } from "react-router-dom";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = "0x4AAAAAACoJ-5sWnCgxSlI4";

type AuthMode = "login" | "register" | "forgot";
type AccountType = "persona_natural" | "ong" | "empresa";

const ACCOUNT_TYPES: { value: AccountType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "persona_natural", label: "Persona Natural", description: "Voluntario individual", icon: <User className="w-6 h-6" /> },
  { value: "ong", label: "ONG / Organización", description: "Organización sin fines de lucro", icon: <Building2 className="w-6 h-6" /> },
  { value: "empresa", label: "Empresa", description: "Empresa o corporación", icon: <Briefcase className="w-6 h-6" /> },
];

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const navigate = useNavigate();

  // Account type selection step
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(true);

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Persona Natural
  const [fullName, setFullName] = useState("");

  // ONG
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [legalRep, setLegalRep] = useState("");
  const [ruc, setRuc] = useState("");
  const [country, setCountry] = useState("");
  const [fiscalDistrict, setFiscalDistrict] = useState("");

  // Empresa
  const [businessName, setBusinessName] = useState("");
  const [businessRuc, setBusinessRuc] = useState("");
  const [businessSector, setBusinessSector] = useState("");
  const [businessContact, setBusinessContact] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const resetForm = () => {
    setEmail(""); setPassword(""); setConfirmPassword(""); setPhone("");
    setFullName(""); setOrgName(""); setOrgType(""); setLegalRep("");
    setRuc(""); setCountry(""); setFiscalDistrict("");
    setBusinessName(""); setBusinessRuc(""); setBusinessSector("");
    setBusinessContact(""); setFiscalAddress("");
    setAccountType(null); setShowAccountTypeSelector(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Completa todos los campos"); return; }
    if (!captchaToken) { toast.error("Completa la verificación de seguridad"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    setLoading(false);
    resetCaptcha();
    if (error) { toast.error(error.message); } else { toast.success("¡Bienvenido de vuelta!"); navigate("/"); }
  };

  const validateRegister = (): boolean => {
    if (!email || !password || !phone) { toast.error("Completa todos los campos obligatorios"); return false; }
    if (password !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return false; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return false; }
    if (!captchaToken) { toast.error("Completa la verificación de seguridad"); return false; }

    if (accountType === "persona_natural" && !fullName) { toast.error("Ingresa tu nombre completo"); return false; }
    if (accountType === "ong") {
      if (!orgName || !orgType || !legalRep || !country || !fiscalDistrict) { toast.error("Completa todos los campos obligatorios de la organización"); return false; }
    }
    if (accountType === "empresa") {
      if (!businessName || !businessRuc || !businessSector || !businessContact || !fiscalAddress) { toast.error("Completa todos los campos obligatorios de la empresa"); return false; }
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    const displayName = accountType === "persona_natural" ? fullName : accountType === "ong" ? orgName : businessName;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: window.location.origin,
        captchaToken,
      },
    });
    setLoading(false);
    resetCaptcha();

    if (error) { toast.error(error.message); return; }

    // Update profile with extra fields
    if (data.user) {
      const profileData: Record<string, any> = {
        account_type: accountType,
        phone,
      };
      if (accountType === "persona_natural") {
        profileData.full_name = fullName;
      } else if (accountType === "ong") {
        profileData.organization_name = orgName;
        profileData.organization_type = orgType;
        profileData.legal_representative = legalRep;
        profileData.ruc = ruc || null;
        profileData.country = country;
        profileData.fiscal_district = fiscalDistrict;
        profileData.full_name = orgName;
      } else if (accountType === "empresa") {
        profileData.business_name = businessName;
        profileData.ruc = businessRuc;
        profileData.business_sector = businessSector;
        profileData.legal_representative = businessContact;
        profileData.fiscal_address = fiscalAddress;
        profileData.full_name = businessName;
      }

      await supabase.from("profiles").update(profileData as any).eq("id", data.user.id);
    }

    setRegisteredEmail(email);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Ingresa tu email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) { toast.error(error.message); } else { toast.success("Te enviamos un enlace para restablecer tu contraseña."); }
  };

  const handleSelectAccountType = (type: AccountType) => {
    setAccountType(type);
    setShowAccountTypeSelector(false);
  };

  // --- Success screen ---
  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-3xl -z-10" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="mb-6">
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">TINKUYHUB</span>
            </button>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-card p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">¡Cuenta creada con éxito!</h1>
            <p className="text-sm text-muted-foreground mb-4">Hemos enviado un enlace de confirmación a:</p>
            <p className="text-sm font-semibold text-foreground bg-muted rounded-lg px-4 py-2 mb-4">{registeredEmail}</p>
            <p className="text-sm text-muted-foreground mb-6">Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.</p>
            <div className="space-y-3">
              <Button onClick={() => { setRegisteredEmail(null); setMode("login"); resetForm(); }} className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90 h-11">
                <Mail className="w-4 h-4 mr-2" /> Ya confirmé, ir a iniciar sesión
              </Button>
              <button onClick={() => navigate("/onboarding")} className="text-sm text-primary hover:underline">
                Mientras tanto, completar encuesta de bienvenida →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Account type selector (register mode only) ---
  const renderAccountTypeSelector = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <p className="text-sm text-muted-foreground text-center mb-4">Selecciona el tipo de cuenta que deseas crear</p>
      {ACCOUNT_TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => handleSelectAccountType(type.value)}
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {type.icon}
          </div>
          <div>
            <p className="font-semibold text-foreground">{type.label}</p>
            <p className="text-xs text-muted-foreground">{type.description}</p>
          </div>
        </button>
      ))}
    </motion.div>
  );

  // --- Dynamic register fields ---
  const renderRegisterFields = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <button
        type="button"
        onClick={() => { setShowAccountTypeSelector(true); setAccountType(null); }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Cambiar tipo de cuenta
      </button>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium mb-4">
        {ACCOUNT_TYPES.find(t => t.value === accountType)?.icon}
        {ACCOUNT_TYPES.find(t => t.value === accountType)?.label}
      </div>

      <form onSubmit={handleRegister}>
        <div className="space-y-3">
          {accountType === "persona_natural" && (
            <FieldWithIcon icon={<User className="w-4 h-4" />} label="Nombre completo" id="fullName" value={fullName} onChange={setFullName} placeholder="Tu nombre completo" />
          )}

          {accountType === "ong" && (
            <>
              <FieldWithIcon icon={<Building2 className="w-4 h-4" />} label="Nombre de la organización" id="orgName" value={orgName} onChange={setOrgName} placeholder="Nombre de la ONG" />
              <FieldWithIcon icon={<Building2 className="w-4 h-4" />} label="Tipo de organización" id="orgType" value={orgType} onChange={setOrgType} placeholder="Ej: Educación, Salud, Ambiente" />
              <FieldWithIcon icon={<User className="w-4 h-4" />} label="Representante legal" id="legalRep" value={legalRep} onChange={setLegalRep} placeholder="Nombre del representante" />
              <FieldWithIcon icon={<Briefcase className="w-4 h-4" />} label="RUC (opcional)" id="ruc" value={ruc} onChange={setRuc} placeholder="RUC de la organización" required={false} />
              <FieldWithIcon icon={<MapPin className="w-4 h-4" />} label="País" id="country" value={country} onChange={setCountry} placeholder="País" />
              <FieldWithIcon icon={<MapPin className="w-4 h-4" />} label="Distrito fiscal" id="fiscalDistrict" value={fiscalDistrict} onChange={setFiscalDistrict} placeholder="Distrito fiscal" />
            </>
          )}

          {accountType === "empresa" && (
            <>
              <FieldWithIcon icon={<Briefcase className="w-4 h-4" />} label="Razón social" id="businessName" value={businessName} onChange={setBusinessName} placeholder="Razón social de la empresa" />
              <FieldWithIcon icon={<Briefcase className="w-4 h-4" />} label="RUC" id="businessRuc" value={businessRuc} onChange={setBusinessRuc} placeholder="RUC de la empresa" />
              <FieldWithIcon icon={<Briefcase className="w-4 h-4" />} label="Rubro o sector" id="businessSector" value={businessSector} onChange={setBusinessSector} placeholder="Ej: Tecnología, Retail" />
              <FieldWithIcon icon={<User className="w-4 h-4" />} label="Representante o contacto" id="businessContact" value={businessContact} onChange={setBusinessContact} placeholder="Nombre del contacto" />
              <FieldWithIcon icon={<MapPin className="w-4 h-4" />} label="Dirección fiscal" id="fiscalAddress" value={fiscalAddress} onChange={setFiscalAddress} placeholder="Dirección fiscal" />
            </>
          )}

          {/* Common fields */}
          <FieldWithIcon icon={<Mail className="w-4 h-4" />} label={accountType === "ong" ? "Correo institucional" : accountType === "empresa" ? "Correo corporativo" : "Correo electrónico"} id="email" type="email" value={email} onChange={setEmail} placeholder="correo@ejemplo.com" />
          <FieldWithIcon icon={<Phone className="w-4 h-4" />} label="Teléfono" id="phone" value={phone} onChange={setPhone} placeholder="+51 999 999 999" />

          <div>
            <Label htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirmar contraseña</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="flex justify-center">
            <Turnstile ref={turnstileRef} siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} options={{ theme: "light", size: "normal" }} />
          </div>

          <Button type="submit" disabled={loading || !captchaToken} className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90 h-11">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </div>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">o continúa con</span></div>
      </div>

      <Button type="button" variant="outline" className="w-full h-11" onClick={async () => {
        const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
        if (error) toast.error(error.message);
      }}>
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </Button>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <button onClick={() => { setMode("login"); resetForm(); resetCaptcha(); }} className="text-primary font-semibold hover:underline">
          Inicia sesión
        </button>
      </div>
    </motion.div>
  );

  // --- Main render ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-3xl -z-10" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">TINKUYHUB</span>
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login" && "Inicia sesión"}
            {mode === "register" && (showAccountTypeSelector ? "Crea tu cuenta" : "Completa tu registro")}
            {mode === "forgot" && "Recuperar contraseña"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" && "Continúa generando impacto"}
            {mode === "register" && (showAccountTypeSelector ? "Elige el tipo de cuenta" : "Ingresa tus datos")}
            {mode === "forgot" && "Te enviaremos un enlace a tu email"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-8 max-h-[70vh] overflow-y-auto">
          {mode === "forgot" && (
            <button onClick={() => setMode("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Volver al login
            </button>
          )}

          {/* Login / Forgot forms */}
          {(mode === "login" || mode === "forgot") && (
            <form onSubmit={mode === "login" ? handleLogin : handleForgotPassword}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>

                {mode === "login" && (
                  <>
                    <div>
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">Contraseña</Label>
                      <div className="relative mt-1.5">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                    </div>
                  </>
                )}

                {mode === "login" && (
                  <div className="flex justify-center">
                    <Turnstile ref={turnstileRef} siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} options={{ theme: "light", size: "normal" }} />
                  </div>
                )}

                <Button type="submit" disabled={loading || (mode === "login" && !captchaToken)} className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90 h-11">
                  {loading ? "Cargando..." : mode === "login" ? "Iniciar sesión" : "Enviar enlace"}
                </Button>
              </div>
            </form>
          )}

          {/* Register flow */}
          {mode === "register" && (
            <AnimatePresence mode="wait">
              {showAccountTypeSelector ? renderAccountTypeSelector() : renderRegisterFields()}
            </AnimatePresence>
          )}

          {/* Google + switch mode (login only) */}
          {mode === "login" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">o continúa con</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full h-11" onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (error) toast.error(error.message);
              }}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <button onClick={() => { setMode("register"); resetForm(); resetCaptcha(); }} className="text-primary font-semibold hover:underline">
                  Regístrate gratis
                </button>
              </div>
            </>
          )}

          {mode === "forgot" && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                Volver a iniciar sesión
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Reusable field component
const FieldWithIcon = ({ icon, label, id, value, onChange, placeholder, type = "text", required = true }: {
  icon: React.ReactNode; label: string; id: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; required?: boolean;
}) => (
  <div>
    <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}{required && " *"}</Label>
    <div className="relative mt-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <Input id={id} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="pl-10" required={required} />
    </div>
  </div>
);

export default Auth;
