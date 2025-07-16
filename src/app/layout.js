import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Main from './Main'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  title: 'CRM System',
  description: 'Professional CRM built with Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black`}>
        <Main>
        {children}
        </Main>
      </body>
    </html>
  )
}
