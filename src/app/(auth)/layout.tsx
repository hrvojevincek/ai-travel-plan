import { AuthLayout } from "@/features/auth/components/auth-layer";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <AuthLayout>{children}</AuthLayout>;
};

export default Layout;