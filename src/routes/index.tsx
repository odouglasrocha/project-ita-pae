import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/pepsico-logo.png"
              alt="PepsiCo logo"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="text-sm font-semibold tracking-wide">
                InspectorLS
              </div>
              <div className="text-xs text-muted-foreground">
                Industrial Print Validation
              </div>
            </div>
          </div>
          <Link
            to="/scanner"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Abrir Scanner
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            MVP — Scanner + OCR + Validação
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Valide data de validade, código juliano e EA direto pela câmera.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            O sistema abre a câmera traseira, executa OCR restrito ao domínio
            da impressão industrial e valida contra as tabelas oficiais{" "}
            <span className="text-mono text-primary">CodigoJuliano</span>,{" "}
            <span className="text-mono text-primary">ShelfLifeWeekly</span> e{" "}
            <span className="text-mono text-primary">materialsData</span>.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/scanner"
              className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Iniciar inspeção
            </Link>
            <a
              href="#pipeline"
              className="rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-accent"
            >
              Ver pipeline
            </a>
          </div>
        </section>

        <section
          id="pipeline"
          className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              n: "01",
              t: "Captura contínua",
              d: "Câmera traseira, autofocus, sem botão de foto.",
            },
            {
              n: "02",
              t: "Qualidade do frame",
              d: "Variance of Laplacian — só executa OCR com nitidez suficiente.",
            },
            {
              n: "03",
              t: "OCR restrito",
              d: "Whitelist 0-9 / : L S. Parser tolerante a ruído.",
            },
            {
              n: "04",
              t: "Validação oficial",
              d: "Consulta getJulianCodeForDate() e ShelfLifeWeekly.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="text-mono text-xs text-primary">{s.n}</div>
              <div className="mt-2 font-semibold">{s.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          InspectorLS · MVP scanner cliente · Sem backend
        </div>
      </footer>
    </div>
  )
}
