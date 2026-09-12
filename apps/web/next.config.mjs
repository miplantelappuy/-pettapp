/** @type {import('next').NextConfig} */
const nextConfig = {
  // Los paquetes del monorepo son TS fuente sin compilar — Next necesita
  // transpilarlos, no vienen ya buildeados como una dependencia normal de npm.
  transpilePackages: ["@pettapp/db", "@pettapp/queue", "@pettapp/payments"],
  // "ffmpeg-static" solo exporta la ruta a su binario (calculada con
  // __dirname adentro del paquete). Si Next lo empaqueta con webpack como
  // hace por default con todo lo que usan las rutas de API, ese __dirname
  // queda apuntando a la carpeta del bundle compilado (.next/server/...) en
  // vez de a node_modules/ffmpeg-static — por eso la subida de video fallaba
  // con "spawn .../ffmpeg ENOENT" (el binario no estaba ahí). Con esto,
  // Next deja el paquete afuera del empaquetado y lo resuelve con un
  // require() normal de Node en tiempo de ejecución, donde __dirname sí
  // apunta a donde vive el binario de verdad.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
