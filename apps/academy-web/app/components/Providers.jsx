"use client";
import { AcademyStoreProvider } from "../../lib/academy-store";

export default function Providers({ children }) {
  return <AcademyStoreProvider>{children}</AcademyStoreProvider>;
}
