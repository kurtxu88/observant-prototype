/* OBSERVANT surface — People / Feedback partners (PRD §3: each person a living file).
   Registers window.OBS_SURFACES.people. Delegates to the rich window.PeopleView
   (roster + per-person relationship memory, async 1:1 chat, voice transcripts,
   follow-up + live-1:1) which reads state.people (incl. .file) and conversations.
   Falls back to a roster summary if PeopleView isn't loaded. CSS prefix: obs-people- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  function PeopleSurface(props) {
    const state = props.state || {};
    const PeopleView = window.PeopleView;
    if (typeof PeopleView === "function") {
      return <PeopleView state={state} patchState={props.patchState} navigate={props.navigate} />;
    }
    const ui = props.ui || window;
    const EmptyState = ui.EmptyState;
    const people = state.people || [];
    const withFiles = people.filter((p) => p.file).length;
    return (
      <div className="obs-people-stub">
        <EmptyState
          title="People — the living-file roster"
          text={people.length + " feedback partners (" + withFiles + " with full files). The person, not the study, is the unit of analysis."}
        />
      </div>
    );
  }
  window.OBS_SURFACES.people = PeopleSurface;
})();
