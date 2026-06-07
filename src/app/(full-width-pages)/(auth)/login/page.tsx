import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Aivory Admin",
  description: "Sign in to Aivory Admin Dashboard",
};

export default function LoginPage() {
  return <SignInForm />;
}
