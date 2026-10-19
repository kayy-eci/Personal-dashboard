import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeOS",
  description: "A private, local-first workspace.",
};

/**
 * FR-4.4: applies the stored theme before the first paint so launching in dark
 * mode never flashes white. The build's CSP step hashes every inline script,
 * so this stays allowed under a strict script-src.
 */
const themeBootstrapScript =
`try{var p=localStorage.getItem("lifeos.ui.theme")||"system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark){document.documentElement.dataset.theme="dark";}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          id="theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        {children}
      </body>
    </html>
  );
}
