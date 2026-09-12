/** @type {import('next').NextConfig} */
const nextConfig = {
  // Los paquetes del monorepo son TS fuente sin compilar — Next necesita
  // transpilarlos, no vienen ya buildeados como una dependencia normal de npm.
  transpilePackages: ["@pettapp/db", "@pettapp/queue", "@pettapp/payments"],
};

export default nextConfig;
