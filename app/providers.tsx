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
          style: { fontSize: "14px" },
          success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
        }}
      />
    </SessionProvider>
  );
}
