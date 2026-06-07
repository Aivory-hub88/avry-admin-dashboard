import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | Aivory Admin",
  description: "This is Next.js Signin Page Aivory Admin",
};

export default function SignIn() {
  return <SignInForm />;
}
