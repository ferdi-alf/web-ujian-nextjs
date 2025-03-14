/* eslint-disable @typescript-eslint/no-unused-vars */
import { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface session {
    user: User & DefaultSession["user"];
  }
  interface User {
    id: string;
    username: string;
    role: string;
    status: string;
    jurusan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    role: string;
    username: string;
  }
}
