// "ffmpeg-static" no trae sus propios tipos — solo exporta la ruta al binario
// de ffmpeg precompilado para la plataforma actual (o null si no hay uno
// disponible para ese SO/arquitectura).
declare module "ffmpeg-static" {
  const ffmpegPath: string | null;
  export default ffmpegPath;
}
