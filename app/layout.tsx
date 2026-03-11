import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","600","700"] })

export const metadata: Metadata = {
  title: "Flip Flop Digital Learning",
  description: "Institute Management System — Udaipur, Rajasthan",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
