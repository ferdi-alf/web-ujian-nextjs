/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import { LoginSchema } from "@/lib/zod";
import { compareSync } from "bcrypt-ts";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: async (credentials) => {
        const validateFields = LoginSchema.safeParse(credentials);
        if (!validateFields.success) {
          return null;
        }

        const { username, password } = validateFields.data;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.password) {
          throw new Error("No User found");
        }

        const passwordMatch = compareSync(password, user.password);

        if (!passwordMatch) return null;

        return {
          ...user,
          username: user.username || "",
        };
      },
    }),
  ],
  // ini kalbek sangat anjng
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = auth?.user?.role;

      const adminRoutes = [
        "/dashboard",
        "/kelas",
        "/users",
        "/tambah-siswa",
        "/data-siswa",
        "/tambah-soal",
        "/data-soal",
        "/ujian",
        "/analytics",
        "/nilai",
      ];

      const proktorRoutes = [
        "/dashboard",
        "/data-siswa",
        "/data-soal",
        "/ujian",
        "/nilai",
      ];

      const siswaRoutes = ["/ujian"];

      const isAdminRoute = adminRoutes.includes(nextUrl.pathname);
      const isProktorRoute = proktorRoutes.includes(nextUrl.pathname);
      const isSiswaRoute = siswaRoutes.includes(nextUrl.pathname);

      // Redirect jika pengguna sudah login tetapi tetap di halaman utama "/"
      if (isLoggedIn && nextUrl.pathname === "/") {
        const redirectUrl = userRole === "SISWA" ? "/ujian" : "/dashboard";
        if (nextUrl.pathname !== (redirectUrl as string)) {
          return Response.redirect(new URL(redirectUrl, nextUrl.origin));
        }
      }

      switch (userRole) {
        case "SISWA":
          // Hanya redirect jika Siswa mengakses halaman yang bukan "/ujian"
          if (!isSiswaRoute && nextUrl.pathname !== "/") {
            return Response.redirect(new URL("/ujian", nextUrl.origin));
          }
          break;

        case "PROKTOR":
          // Hanya redirect jika Proktor mencoba mengakses halaman admin yang tidak diperbolehkan
          if (isAdminRoute && !isProktorRoute) {
            return Response.redirect(new URL("/dashboard", nextUrl.origin));
          }
          break;

        case "ADMIN":
        case "SUPERADMIN":
          // Admin dan Superadmin tidak perlu redirect jika halaman ada dalam adminRoutes
          if (isAdminRoute) {
            return true;
          }
          break;

        default:
        // Jika role tidak dikenali, redirect ke halaman utama
        // return Response.redirect(new URL("/", nextUrl.origin));
      }

      // Redirect jika pengguna belum login dan mencoba mengakses halaman selain "/"
      if (!isLoggedIn && nextUrl.pathname !== "/") {
        return Response.redirect(new URL("/", nextUrl.origin));
      }

      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.username = token.username;
      return session;
    },
  },
});
