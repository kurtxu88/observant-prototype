/* OBSERVANT surface — Settings & Context (install/identify, channels, intro questions, data layer).
   Registers window.OBS_SURFACES.settings. Delegates to the rich window.SettingsViewSS
   (workspace settings, intro conversation, integrations, reset/log out).
   Falls back to a status line if SettingsViewSS isn't loaded. CSS prefix: obs-settings- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  function SettingsSurface(props) {
    const state = props.state || {};
    const SettingsViewSS = window.SettingsViewSS;
    if (typeof SettingsViewSS === "function") {
      return <SettingsViewSS state={state} patchState={props.patchState} resetWorkspace={props.resetWorkspace} />;
    }
    const ui = props.ui || window;
    const EmptyState = ui.EmptyState;
    const connected = !!(state.setup && (state.setup.connected || state.setup.route === "inproduct"));
    return (
      <div className="obs-settings-stub">
        <EmptyState
          title="Settings & Context"
          text={"Install / identify() status (" + (connected ? "connected" : "not connected") + "), channels, editable intro questions, and the consent / data-handling layer."}
        />
      </div>
    );
  }
  window.OBS_SURFACES.settings = SettingsSurface;
})();
