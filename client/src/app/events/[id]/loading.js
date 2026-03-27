export default function EventDetailLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000401",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #1a1a1a",
          borderTop: "3px solid #FFBB00",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
