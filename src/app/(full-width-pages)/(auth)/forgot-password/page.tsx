import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Aivory Admin",
  description: "Request a password reset link for your Aivory admin account",
  // A reset page has nothing to offer a crawler and shouldn't be indexed.
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
