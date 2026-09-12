-- Poster (frame fijo) de cada video comprimido, para mostrar algo al
-- instante mientras el video de verdad carga de fondo (portada del Home,
-- y en general cualquier <video> de la app).
ALTER TABLE pet_media ADD COLUMN poster_key text;

-- Foto de emergencia elegida a mano por el dueño, separada de la portada
-- del Home (que ahora rota sola entre fotos y videos — el perfil de
-- emergencia necesita algo que se vea siempre, nunca un video).
ALTER TABLE pets ADD COLUMN emergency_photo_media_id text;
