import "./globals.css";
import { AppHeader } from "../components/AppHeader";
export const metadata = {
  title: "PRAVDHAN - Smart Waste Collection System",
  description: "PRAVDHAN - Municipal Waste Reporting, Verification & Collection Management Platform",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppHeader />{children}</body></html>;
}
