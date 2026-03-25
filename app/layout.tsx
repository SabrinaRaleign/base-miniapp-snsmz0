import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="69c22f7b3c2c56b9bbd2f616" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Base MiniApp for daily check-ins, streak tracking, and ERC-721 badge rewards."
        />
        <title>Daily Check-in Badge</title>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
