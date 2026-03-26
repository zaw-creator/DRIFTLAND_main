export default function SandboxLayout({ children, modal }) {
  return (
    <>
      {children}
      {/* Next.js injects the intercepted modal here seamlessly */}
      {modal}
    </>
  );
}
