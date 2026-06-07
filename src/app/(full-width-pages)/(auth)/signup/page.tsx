import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js SignUp Page | Aivory Admin",
  description: "This is Next.js SignUp Page Aivory Admin",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
