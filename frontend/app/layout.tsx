import "./globals.css";
import { AppHeader } from "../components/AppHeader";
export const metadata = {
  title: "CleanCity — Smart Waste Collection Management System",
  description: "Enterprise SaaS platform for civic waste reporting, AI severity triage, municipal worker dispatch, and photographic resolution verification.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppHeader />{children}</body></html>;
}
