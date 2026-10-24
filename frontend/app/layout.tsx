import "./globals.css";
import { AppHeader } from "../components/AppHeader";
export const metadata = { title: "Smart Waste", description: "Waste Collection Management" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppHeader />{children}</body></html>;
}
