# Sobres de recuerdos (documentado, NO implementado)

Nombre provisorio. Función futura para que alguien que no tiene acceso a la
app privada pueda compartir fotos de la mascota con el dueño, sin poder
publicar nada por su cuenta.

## Flujo

1. Alguien escanea el QR físico de la mascota (superficie pública `tag.*`,
   la misma que hoy muestra el perfil de emergencia).
2. En esa página pública aparece una opción: "Tengo fotos de {nombre}".
3. Esa persona sube algunas fotos, sin necesidad de crear cuenta ni entrar a
   la app privada.
4. Al dueño le llega una notificación: "🎁 {nombre} recibió un nuevo sobre".
5. Al entrar a la app privada, el dueño ve un sobre cerrado. Lo abre con una
   animación (coherente con la estética álbum/tapa física ya usada en
   Recuerdos).
6. Las fotos aparecen de a una, como recuerdos sueltos ("figuritas").
7. Por cada foto, el dueño elige: guardarla en Recuerdos, agregarla al
   Álbum 3D, o descartarla.

## Regla que no se negocia

Las imágenes subidas por terceros SIEMPRE quedan en un estado de
"pendiente de aprobación" y NUNCA se incorporan automáticamente a contenido
privado o publicado. Ni a Recuerdos, ni al Álbum, ni a ningún otro lugar
visible. La única forma de que una foto de un sobre pase a ser contenido
real de la mascota es que el dueño la apruebe explícitamente, una por una.

Esto es así aunque el dueño tenga configurada alguna preferencia de
"aprobar todo automáticamente" en el futuro — si esa opción llega a existir
algún día, tiene que ser una decisión aparte y explícita, nunca el
comportamiento por defecto.

## Boceto de modelo de datos (a definir con más detalle cuando se implemente)

- `envelope` (el "sobre"): `id`, `pet_id`, `submitted_by_contact` (opcional,
  sin cuenta), `status` (`unopened` | `opened`), `created_at`.
- `envelope_item` (cada foto dentro del sobre): `id`, `envelope_id`,
  `storage_key`, `status` (`pending_review` | `approved_to_recuerdos` |
  `approved_to_album` | `discarded`), `reviewed_at`.

Ninguna fila en `envelope_item` con `status = 'pending_review'` debe ser
visible en Recuerdos ni en el Álbum bajo ninguna circunstancia — el filtro
por estado aprobado tiene que estar en la consulta misma, no solo en la UI.

## Fuera de alcance de esta documentación

No se define todavía: límite de fotos por sobre, moderación de contenido
inapropiado, límite de sobres por período, ni la UI pública de subida. Se
diseña recién cuando se implemente esta función.
