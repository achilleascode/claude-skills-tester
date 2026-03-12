import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Skills Tester",
  description: "Test Claude Skills with different models and detailed logging",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
