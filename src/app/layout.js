import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./bg_colors_rgba.css";
import "./bg_opacity_colors_rgba.css";
import "./gradient_colors_rgba.css";
import "./text_colors_rgba.css";
import "./text_opacity_colors_rgba.css";
import "react-datepicker/dist/react-datepicker.css";
import Main from "./Main";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CRM System",
  description: "Professional CRM built with Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black`}
      >
        <Main>{children}</Main>
      </body>
    </html>
  );
}
