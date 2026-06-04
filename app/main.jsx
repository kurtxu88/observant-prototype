/* ============================================================
   SUBSPACE app — root (setup ⇄ portal, IM slide-over)
   ============================================================ */
const { useState: useStateM } = React;

function App() {
  const params = new URLSearchParams(location.search);
  const [view, setView] = useStateM(params.get("view") === "app" ? "app" : "setup");
  const [programs, setPrograms] = useStateM(PROGRAMS);
  const [imUser, setImUser] = useStateM(null);

  const handleLaunch = (draft) => {
    setPrograms((p) => [draft, ...p]);
    setView("app");
  };

  if (view === "setup") {
    return <SetupFlow onLaunch={handleLaunch} onExit={() => setView("app")} />;
  }

  return (
    <React.Fragment>
      <Portal
        programs={programs}
        onNewProgram={() => setView("setup")}
        onOpenIM={setImUser}
      />
      {imUser && <IMSurface user={imUser} onClose={() => setImUser(null)} />}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
