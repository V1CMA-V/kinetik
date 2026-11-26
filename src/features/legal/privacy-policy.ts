/**
 * Privacy policy text (Spanish), shared by the in-app screen and, later, the public
 * web page. Keep it in sync with what the app actually stores (see docs/store-privacy.md).
 */
import { CONTACT_EMAIL, CONTROLLER_NAME } from './constants';

export type PolicySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export const PRIVACY_POLICY_INTRO = `${CONTROLLER_NAME} es una app para llevar tus finanzas personales y en pareja. Este aviso explica qué datos guardamos, para qué los usamos y cómo puedes eliminarlos.`;

export const PRIVACY_POLICY: PolicySection[] = [
  {
    title: 'Responsable',
    paragraphs: [
      `${CONTROLLER_NAME} es responsable del tratamiento de tus datos. Para cualquier tema de privacidad escríbenos a ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Datos que guardamos',
    items: [
      'Datos de tu cuenta: correo electrónico, nombre (opcional) y contraseña cifrada. Si entras con Google, recibimos tu nombre, tu correo y tu identificador de Google.',
      'Información financiera que tú registras: cuentas (nombre, tipo, banco, saldo, límite de crédito, día de corte y de pago), movimientos (monto, categoría, descripción y fecha), suscripciones, presupuestos y metas de ahorro.',
      'Modo pareja: el hogar al que perteneces, sus integrantes y los códigos de invitación.',
      'Notificaciones: el identificador para enviar notificaciones a tu teléfono y el tipo de sistema (Android o iOS).',
    ],
  },
  {
    title: 'Datos que se quedan en tu teléfono',
    paragraphs: [
      'Tus preferencias (tema, ocultar montos, recordatorios), tu sesión, los recordatorios programados y el resumen que muestra el widget se guardan solo en tu teléfono.',
      'Si activas Face ID o huella, la verificación la hace tu teléfono: nunca recibimos tus datos biométricos.',
    ],
  },
  {
    title: 'Lo que no hacemos',
    items: [
      'No nos conectamos a tus bancos ni te pedimos sus contraseñas: solo guardamos lo que tú capturas.',
      'No vendemos tus datos ni los usamos para publicidad.',
      'No te rastreamos entre apps o sitios, ni usamos herramientas de analítica.',
      'No accedemos a tu ubicación, contactos, fotos ni micrófono.',
    ],
  },
  {
    title: 'Para qué usamos tus datos',
    items: [
      'Darte el servicio: mostrar tus saldos, cortes, presupuestos, análisis y metas, y sincronizarlos entre tus dispositivos.',
      'Compartir con tu pareja solo lo que tú marcas como compartido, si usas el modo pareja.',
      'Enviarte recordatorios y avisos de actividad en cuentas compartidas, si los activas.',
      'Mantener tu cuenta segura e iniciar tu sesión.',
    ],
  },
  {
    title: 'Con quién se comparten',
    paragraphs: [
      'Solo con proveedores que nos ayudan a operar la app y que procesan los datos por nuestra cuenta:',
    ],
    items: [
      'Supabase: base de datos, inicio de sesión y funciones del servidor.',
      'Google: inicio de sesión con Google y entrega de notificaciones en Android (Firebase Cloud Messaging).',
      'Expo: servicio de envío de notificaciones.',
      'Apple: entrega de notificaciones en iPhone.',
      'Tu pareja ve las cuentas, los movimientos y las metas que compartes, y tu nombre.',
    ],
  },
  {
    title: 'Seguridad',
    paragraphs: [
      'Tus datos viajan cifrados (HTTPS) y la base de datos solo permite que cada persona vea su propia información y la que su pareja le comparte. Puedes proteger la app con Face ID o huella y ocultar los montos en pantalla.',
    ],
  },
  {
    title: 'Cuánto tiempo los guardamos',
    paragraphs: [
      'Mientras tengas tu cuenta. Al eliminarla se borran de inmediato de nuestra base de datos; las copias de seguridad automáticas del proveedor se reemplazan en su ciclo normal.',
    ],
  },
  {
    title: 'Tus derechos y cómo eliminar tu cuenta',
    items: [
      'Puedes ver y corregir tu información en cualquier momento dentro de la app.',
      'Puedes eliminar tu cuenta y todos tus datos desde Perfil > Cuenta > Eliminar cuenta.',
      `Si no tienes acceso a la app, o quieres ejercer tus derechos de acceso, rectificación, cancelación u oposición (ARCO), escribe a ${CONTACT_EMAIL} desde el correo de tu cuenta. Respondemos en un máximo de 20 días hábiles.`,
    ],
  },
  {
    title: 'Menores de edad',
    paragraphs: ['La app no está dirigida a menores de 18 años.'],
  },
  {
    title: 'Cambios a este aviso',
    paragraphs: [
      'Si cambiamos este aviso actualizaremos la fecha de abajo y, si el cambio es importante, te lo diremos en la app.',
    ],
  },
];
