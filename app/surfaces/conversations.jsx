/* OBSERVANT surface — Conversations (the why-on-record: 1:1 threads + voice transcripts,
   each stamped with the trigger moment). Registers window.OBS_SURFACES.conversations.
   Delegates to the rich window.PeopleView (per-person async chat + voice transcripts,
   reading conversation.trigger off state) which is the threads drill-down.
   Falls back to a thread summary if PeopleView isn't loaded. CSS prefix: obs-conv- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  function ConversationsSurface(props) {
    const state = props.state || {};
    const PeopleView = window.PeopleView;
    if (typeof PeopleView === "function") {
      return <PeopleView state={state} patchState={props.patchState} navigate={props.navigate} />;
    }
    const ui = props.ui || window;
    const EmptyState = ui.EmptyState;
    const convos = state.conversations || [];
    const stamped = convos.filter((c) => c.trigger).length;
    const voice = convos.filter((c) => c.mode === "voice").length;
    return (
      <div className="obs-conv-stub">
        <EmptyState
          title="Conversations — the why on record"
          text={convos.length + " async 1:1 threads (" + voice + " voice transcripts), " + stamped + " stamped with the trigger moment."}
        />
      </div>
    );
  }
  window.OBS_SURFACES.conversations = ConversationsSurface;
})();
