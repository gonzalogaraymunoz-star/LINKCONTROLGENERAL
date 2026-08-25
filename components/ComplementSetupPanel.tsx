"use client";

export type ComplementSetup = {
  name: string;
  description: string;
  connectionMode: string;
  serverUrl: string;
  authentication: {
    state: "pending" | "ready";
    recommendedSelection: string | null;
    label: string;
    detail: string;
  };
  scope: string;
  readyToCreate: boolean;
};

export default function ComplementSetupPanel({
  title,
  setup,
  onCopy,
}: {
  title: string;
  setup: ComplementSetup;
  onCopy: () => void;
}) {
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    onCopy();
  }

  const fields = [
    { label: "Nombre", value: setup.name },
    { label: "Descripción", value: setup.description },
    { label: "Conexión", value: setup.serverUrl },
  ];

  return (
    <section className="complementSetupCard">
      <div className="complementSetupHead">
        <div>
          <span className="setupEyebrow">Crear complemento</span>
          <strong>{title}</strong>
          <small>Estos son los datos que debes copiar en la ventana “Nuevo complemento” de ChatGPT.</small>
        </div>
        <span className={`setupReady ${setup.readyToCreate ? "ok" : "pending"}`}>
          {setup.readyToCreate ? "Listo para crear" : "Falta autenticación"}
        </span>
      </div>

      <div className="setupFields">
        {fields.map(field => (
          <div className="setupField" key={field.label}>
            <span>{field.label}</span>
            <div>
              <code>{field.value}</code>
              <button className="btn" onClick={() => void copy(field.value)}>Copiar</button>
            </div>
          </div>
        ))}

        <div className="setupField authField">
          <span>Autenticación</span>
          <div className="authSetupValue">
            <strong>{setup.authentication.label}</strong>
            <small>{setup.authentication.detail}</small>
          </div>
        </div>
      </div>

      {!setup.readyToCreate ? (
        <div className="setupBlocker">
          <strong>No pulses “Crear” todavía</strong>
          <p>Nombre, descripción y URL ya son definitivos. CONTROL CENTRAL todavía debe habilitar la autenticación compatible con ChatGPT; cuando esté lista, esta misma tarjeta te mostrará qué opción elegir y cambiará a “Listo para crear”.</p>
        </div>
      ) : (
        <div className="setupGo">
          <strong>Configuración lista</strong>
          <p>Usa exactamente estos datos y selecciona {setup.authentication.recommendedSelection} en ChatGPT.</p>
        </div>
      )}
    </section>
  );
}
