import { Leaf } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

// Política de Privacidad pública. Google Play exige que esté accesible en una
// URL pública sin iniciar sesión (la web no fuerza login, solo la app nativa),
// y que describa con exactitud qué se recolecta y cómo pedir el borrado.
// Última revisión de contenido contra el comportamiento real del código:
// 19 de julio de 2026.

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold text-foreground mt-8 mb-2">{children}</h2>
);

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TINKUYHUB</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-bold text-foreground">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground mt-2">Última actualización: 19 de julio de 2026</p>

        <p className="text-muted-foreground mt-6 leading-relaxed">
          TinkuyHub es una plataforma de voluntariado comunitario que conecta a personas
          voluntarias con organizaciones que publican eventos. Esta política explica qué
          datos recogemos cuando usas nuestro sitio web (eventos.tinkuyhub.com) o nuestra
          aplicación para Android, para qué los usamos y cómo puedes eliminarlos. Aplica
          por igual a la web y a la app.
        </p>

        <SectionTitle>1. Datos que recogemos</SectionTitle>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2 leading-relaxed">
          <li>
            <span className="font-medium text-foreground">Datos de cuenta:</span> correo
            electrónico, nombre completo, teléfono y contraseña (almacenada cifrada). Si
            inicias sesión con Google, recibimos tu nombre, correo y foto de perfil de
            Google.
          </li>
          <li>
            <span className="font-medium text-foreground">Perfil de voluntario:</span> foto
            de perfil, biografía y enlaces a redes sociales que decidas agregar, además de
            tus puntos, insignias y racha de participación generados al asistir a eventos.
          </li>
          <li>
            <span className="font-medium text-foreground">Datos de organizaciones:</span> si
            registras una ONG o empresa, pedimos datos adicionales como razón social, RUC,
            representante legal, sector y dirección fiscal.
          </li>
          <li>
            <span className="font-medium text-foreground">Encuesta de bienvenida:</span>{" "}
            intereses de voluntariado, disponibilidad, distrito preferido y habilidades,
            si decides completarla.
          </li>
          <li>
            <span className="font-medium text-foreground">Ubicación:</span> usamos tu
            ubicación aproximada o precisa (con tu permiso) para mostrarte eventos cercanos
            en el mapa y, si activas las notificaciones de proximidad, guardamos tu última
            ubicación para avisarte de eventos cerca de ti. Puedes negar o revocar este
            permiso en cualquier momento desde tu dispositivo.
          </li>
          <li>
            <span className="font-medium text-foreground">Fotos:</span> las fotos que subas
            a un evento o como foto de perfil.
          </li>
          <li>
            <span className="font-medium text-foreground">Notificaciones push:</span> en la
            app de Android, un identificador técnico del dispositivo (token) para poder
            enviarte notificaciones, solo si las activas.
          </li>
          <li>
            <span className="font-medium text-foreground">Inscripciones y asistencia:</span>{" "}
            los eventos a los que te inscribes y tu asistencia confirmada por el organizador.
          </li>
        </ul>

        <SectionTitle>2. Para qué usamos tus datos</SectionTitle>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2 leading-relaxed">
          <li>Crear y administrar tu cuenta, y permitirte iniciar sesión.</li>
          <li>Mostrarte eventos, gestionar tus inscripciones y confirmar tu asistencia.</li>
          <li>Calcular tus puntos, insignias, nivel y posición en el ranking.</li>
          <li>Enviarte correos transaccionales (por ejemplo, confirmación de inscripción a un evento).</li>
          <li>Enviarte notificaciones que hayas activado, incluidas las de eventos cercanos.</li>
          <li>Permitir a los organizadores gestionar la asistencia de sus eventos.</li>
        </ul>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          No vendemos tus datos personales ni los usamos para publicidad.
        </p>

        <SectionTitle>3. Qué información es visible para otros</SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          TinkuyHub es una plataforma comunitaria: tu nombre, foto de perfil, biografía,
          redes sociales que agregues, puntos, insignias y participación en eventos son
          visibles para otras personas dentro de la plataforma (por ejemplo, en el ranking,
          en tu perfil público y en los eventos en los que participas). Los perfiles de
          organizaciones, incluidos sus eventos publicados, también son públicos. Te
          recomendamos no incluir en tu biografía información que no quieras hacer pública.
        </p>

        <SectionTitle>4. Servicios de terceros que usamos</SectionTitle>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2 leading-relaxed">
          <li>
            <span className="font-medium text-foreground">Supabase</span> — aloja nuestra
            base de datos, autenticación y archivos.
          </li>
          <li>
            <span className="font-medium text-foreground">Google</span> — inicio de sesión
            con Google (si lo eliges) y Firebase Cloud Messaging para notificaciones push
            en Android.
          </li>
          <li>
            <span className="font-medium text-foreground">Cloudinary</span> — almacena las
            fotos de eventos que subes.
          </li>
          <li>
            <span className="font-medium text-foreground">Resend</span> — envía nuestros
            correos transaccionales.
          </li>
          <li>
            <span className="font-medium text-foreground">OpenStreetMap / Nominatim</span> —
            muestra el mapa de eventos y convierte direcciones en coordenadas.
          </li>
        </ul>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Estos proveedores procesan datos únicamente para prestarnos su servicio y están
          sujetos a sus propias políticas de privacidad.
        </p>

        <SectionTitle>5. Cuánto tiempo conservamos tus datos</SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta, se
          borran de forma permanente tu perfil, inscripciones, puntos, insignias, fotos y
          eventos creados. Las solicitudes de eliminación enviadas sin sesión iniciada se
          procesan en un plazo máximo de 30 días.
        </p>

        <SectionTitle>6. Cómo eliminar tu cuenta y tus datos</SectionTitle>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2 leading-relaxed">
          <li>
            <span className="font-medium text-foreground">Desde la app o la web:</span> entra
            a tu perfil y usa la opción <span className="font-medium">"Eliminar cuenta"</span>.
            El borrado es inmediato e irreversible.
          </li>
          <li>
            <span className="font-medium text-foreground">Sin iniciar sesión:</span> visita{" "}
            <Link to="/eliminar-cuenta" className="text-primary hover:underline">
              eventos.tinkuyhub.com/eliminar-cuenta
            </Link>{" "}
            y envía la solicitud con el correo de tu cuenta.
          </li>
        </ul>

        <SectionTitle>7. Seguridad</SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          Los datos se transmiten cifrados (HTTPS) y las contraseñas se almacenan usando
          algoritmos de cifrado estándar de la industria. El acceso a los datos está
          controlado mediante reglas de autorización a nivel de base de datos.
        </p>

        <SectionTitle>8. Menores de edad</SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          TinkuyHub no está dirigido a menores de 13 años y no recogemos deliberadamente
          datos de menores de esa edad. Si crees que un menor nos ha proporcionado datos
          personales, contáctanos para eliminarlos.
        </p>

        <SectionTitle>9. Cambios a esta política</SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          Si hacemos cambios relevantes a esta política, actualizaremos la fecha de "última
          actualización" y, cuando el cambio sea significativo, te lo comunicaremos dentro
          de la plataforma.
        </p>

        <SectionTitle>10. Contacto</SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          Para cualquier consulta sobre privacidad o tus datos, escríbenos a{" "}
          <a href="mailto:soporte@tinkuyhub.com" className="text-primary hover:underline">
            soporte@tinkuyhub.com
          </a>
          .
        </p>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
