/* OBSERVANT surface — Home (calm, relationship-first monitoring landing, PRD §3).
   Registers window.OBS_SURFACES.home. Delegates to the rich window.HomeView
   (topline metrics · weekly digest · new insights · recent 1:1s · activity ledger)
   so the registry router renders the full landing, not a placeholder.
   Falls back to a self-contained summary if HomeView isn't loaded. CSS prefix: obs-home- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  function HomeSurface(props) {
    const state = props.state || {};
    const HomeView = window.HomeView;
    if (typeof HomeView === "function") {
      return <HomeView state={state} patchState={props.patchState} navigate={props.navigate} />;
    }
    const ui = props.ui || window;
    const EmptyState = ui.EmptyState;
    const openLines = (state.conversations || []).length;
    const signals = (state.signals || []).length;
    const loopsClosed = (state.actLedger || []).filter((a) => a.state === "verified").length;
    return (
      <div className="obs-home-stub">
        <EmptyState
          title="Home — calm, relationship-first monitoring"
          text={openLines + " open 1:1 lines · " + signals + " signals · " + loopsClosed + " loops verified."}
        />
      </div>
    );
  }
  window.OBS_SURFACES.home = HomeSurface;
})();
