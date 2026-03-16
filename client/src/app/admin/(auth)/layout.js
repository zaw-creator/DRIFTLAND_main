// Override the parent layout for auth pages so AdminNav is not rendered
export default function AuthLayout({ children }) {
  return <>{children}</>;
}
