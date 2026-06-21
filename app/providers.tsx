"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontSize: "14px",
            fontWeight: 500,
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 10px 30px -12px rgba(15,23,42,0.18)",
            padding: "10px 14px",
          },
          success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />
    </SessionProvider>
  );
}
