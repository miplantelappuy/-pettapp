"use client";

import dynamic from "next/dynamic";

// Envoltorio a propósito SIN tipos (este es un archivo .js, no .ts — con
// "allowJs" prendido y "checkJs" apagado en tsconfig, TypeScript nunca lo
// analiza). No podemos confirmar desde este entorno si "react-pageflip"
// trae sus propias declaraciones de TypeScript bien formadas; si las trae y
// además nosotros escribiéramos una declaración ambiental propia en algún
// .d.ts, arriesgaríamos un choque que rompa el build entero de Next (acá no
// hay forma de correr `tsc` para comprobarlo antes de subir). Aislar el
// import acá adentro es lo que hace que este riesgo sea CERO pase lo que
// pase con los tipos de la librería.
//
// "ssr: false" porque la librería mide/manipula nodos del DOM real (no
// tiene sentido ni sirve durante el render en el servidor).
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

export default HTMLFlipBook;
