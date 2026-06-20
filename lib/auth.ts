import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { mailer } from "@/lib/mailer";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      console.log("[Mailer] Attempting to send to:", user.email);
      try {
        const info = await mailer.sendMail({
          from: `"Quest Planner" <${process.env.GMAIL_USER}>`,
          to: user.email,
          subject: "Reset your password",
          html: `
            <p>Hi ${user.name ?? "there"},</p>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${url}">${url}</a>
            <p>If you didn't request this, you can ignore this email.</p>
          `,
        });
        console.log("[Mailer] Sent successfully, id:", info.messageId);
      } catch (error) {
        console.error("[Mailer] Error:", error);
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // expiration for each session (7 days)
    updateAge: 60 * 60 * 24, // better auth will refresh the experation of each session for each request made in a day
    cookieCache: {
      enabled: true, // stored some user data in a cookie
      maxAge: 60 * 5, // max age of the cookie (5 mins)
    },
  },
  socialProviders: { // allow user to log in using google 
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string, // allow google to determined which app is thrying to use its OAuth
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production", // requires better auth to send cookies in HTTPS when in production
    cookiePrefix: "auth", // add an auth prefix to the cookies made in this instance
  },
});

export type Session = typeof auth.$Infer.Session;
