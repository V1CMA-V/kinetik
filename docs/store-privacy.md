# Privacidad para las tiendas

Respuestas para los formularios de privacidad de App Store Connect y Google Play, según lo que la app guarda hoy. Si agregas analítica, reportes de errores, anuncios u otro proveedor, actualiza este documento, `src/features/legal/privacy-policy.ts` y los formularios.

## Pendientes

- [ ] **URL pública de la política de privacidad.** La piden las dos tiendas. Cuando exista, ponla en `PRIVACY_POLICY_URL` (`src/features/legal/constants.ts`) y en las fichas de las tiendas. El texto ya está en `src/features/legal/privacy-policy.ts`.
- [ ] **URL para solicitar el borrado de la cuenta sin la app** (Google Play, sección "Eliminación de datos"). Puede ser una página que explique los pasos en la app y el correo de contacto (vicmarc30@gmail.com). Ponla en `ACCOUNT_DELETION_URL`.
- [ ] **iOS: Iniciar sesión con Apple** (guía 4.8 de la App Store). Si la app ofrece "Continuar con Google" en iPhone, también debe ofrecer una opción de acceso equivalente que proteja la privacidad, normalmente "Iniciar sesión con Apple". Sin ella, Apple puede rechazar la app.
- [x] Eliminar la cuenta desde la app: Perfil > Cuenta > Eliminar cuenta (función `delete_my_account`).
- [x] Aviso de privacidad dentro de la app: Perfil > Privacidad > Aviso de privacidad, y desde el inicio de sesión.

## Qué guarda la app

| Dato | Dónde | Obligatorio | Para qué |
| --- | --- | --- | --- |
| Correo electrónico | Supabase Auth | Sí | Cuenta e inicio de sesión |
| Contraseña (cifrada) | Supabase Auth | Sí, salvo con Google | Inicio de sesión |
| Nombre | Supabase Auth (`display_name`) / Google | No | Saludo y modo pareja |
| ID de usuario, identidad de Google | Supabase Auth | Sí | Cuenta |
| Cuentas, movimientos, suscripciones, presupuestos, metas, categorías personalizadas | Supabase (Postgres) | Sí, para usar la app | Funcionalidad |
| Ingreso por pago, frecuencia, días de pago, cuenta de depósito, extras estimados | Supabase (`income_profiles`, solo visible para su dueño) | No | Proyección de pagos, avisos de día de pago, análisis y sugerencias de presupuesto |
| Hogar, integrantes, invitaciones | Supabase | No (modo pareja) | Compartir con la pareja |
| Token de notificaciones y plataforma | Supabase (`push_tokens`) | No | Avisos de actividad de la pareja |
| Preferencias, sesión, recordatorios, avisos de presupuesto, resumen del widget | Solo en el teléfono | — | Funcionalidad |
| CSV exportado | Caché del teléfono; el usuario elige con quién compartirlo | — | Exportar movimientos |
| Plataforma, versión de la app, ID aleatorio de la instalación (`EAS-Client-ID`) | Expo (EAS Update) | Sí | Descargar actualizaciones OTA |
| Biometría | La valida el sistema; la app no la recibe | — | Bloqueo de la app |

La app no tiene analítica, reportes de errores, anuncios ni rastreo, no se conecta a bancos y no pide ubicación, contactos, fotos ni micrófono.

Proveedores (encargados, no "terceros" para estos formularios): Supabase, Google (Sign-In y Firebase Cloud Messaging), Expo (servicio de notificaciones push y EAS Update) y Apple (APNs).

## App Store Connect: App Privacy

**¿Recopilas datos?** Sí.

**¿Se usan para rastreo (tracking)?** No, ninguno. No hace falta App Tracking Transparency.

Tipos de datos que se declaran. Todos están **vinculados a la identidad del usuario**, **no se usan para rastreo** y su único propósito es **Funcionalidad de la app**:

| Categoría de Apple | Tipo | Notas |
| --- | --- | --- |
| Información de contacto | Dirección de correo electrónico | Cuenta |
| Información de contacto | Nombre | Opcional |
| Información financiera | Otra información financiera | Saldos, movimientos, límites de crédito, presupuestos, metas, ingresos (opcional) |
| Identificadores | ID de usuario | ID de la cuenta en Supabase |
| Identificadores | ID del dispositivo | ID aleatorio de la instalación que `expo-updates` envía a Expo para buscar actualizaciones. **No vinculado** a la identidad del usuario |

No se declaran: ubicación, contactos, historial de navegación o búsqueda, datos de uso, diagnósticos, compras ni datos sensibles. El token de notificaciones push no es un "ID de dispositivo" en los términos de Apple; el ID de instalación de EAS Update se declara por precaución.

**URL de la política de privacidad:** pendiente.

## Google Play: Seguridad de los datos

**¿La app recopila o comparte alguno de los tipos de datos requeridos?** Sí.

**¿Todos los datos se encriptan en tránsito?** Sí (HTTPS).

**¿Ofreces una forma de solicitar la eliminación de los datos?** Sí: dentro de la app y por la URL (pendiente).

**¿Compartes datos con terceros?** No. Los proveedores que procesan datos en tu nombre no cuentan como "compartir", y lo que se comparte con la pareja lo elige cada persona dentro de la app.

Datos **recopilados** (ninguno es efímero; ninguno se usa para publicidad ni analítica):

| Categoría de Google | Tipo | Obligatorio | Propósitos |
| --- | --- | --- | --- |
| Información personal | Nombre | Opcional | Funcionalidad de la app, Administración de la cuenta |
| Información personal | Dirección de correo electrónico | Obligatorio | Funcionalidad de la app, Administración de la cuenta |
| Información personal | IDs de usuario | Obligatorio | Funcionalidad de la app, Administración de la cuenta |
| Información financiera | Otra información financiera | Obligatorio | Funcionalidad de la app |
| Dispositivo u otros IDs | Dispositivo u otros IDs | Obligatorio | Funcionalidad de la app (ID de instalación para EAS Update; token de notificaciones si se activan) |

**URL de la política de privacidad:** pendiente.

**URL de eliminación de la cuenta:** pendiente.

## Permisos del sistema

- **Notificaciones:** recordatorios de pagos y suscripciones, y avisos de la pareja. Se pide al activarlas en Perfil.
- **Face ID / huella** (`NSFaceIDUsageDescription` en `app.json`): bloqueo opcional de la app.
