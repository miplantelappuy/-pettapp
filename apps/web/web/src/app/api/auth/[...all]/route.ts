import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Handler estándar de Better Auth: expone /api/auth/* (sign-in, callback de
// Google, magic link, sesión, endpoints de organization, etc.) sin que
// tengamos que escribir cada endpoint a mano.
export const { GET, POST } = toNextJsHandler(auth);
