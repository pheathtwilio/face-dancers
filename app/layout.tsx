import "./globals.css"
import "bootstrap/dist/css/bootstrap.min.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Video Waiting Room",
  description: "Set preferences and join Twilio video rooms",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
