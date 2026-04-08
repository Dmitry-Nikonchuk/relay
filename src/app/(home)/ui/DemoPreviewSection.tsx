const demoMessages = [
  {
    role: 'User',
    content: 'Draft a launch post for Relay in a confident tone. Keep it concise.',
  },
  {
    role: 'Relay',
    content:
      'Relay is live. Fast responses, model switching, and context-aware conversations in one clean workspace.',
  },
  {
    role: 'User',
    content: 'Now make a variant for developers.',
  },
  {
    role: 'Relay',
    content:
      'Relay gives developers low-friction AI chat with clear thread history and instant model flexibility.',
  },
];

export function DemoPreviewSection() {
  return (
    <section id="demo" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] sm:text-4xl">
          See Relay in action
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[var(--color-muted)] sm:text-lg">
          Conversations stay readable, structured, and easy to continue.
        </p>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 shadow-[0_24px_80px_rgba(17,17,35,0.12)] backdrop-blur-lg lg:mt-10">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/80 px-5 py-4">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6767]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffca4f]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#4ad97b]" />
            <p className="ml-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Demo chat
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {demoMessages.map((message) => {
              const isUser = message.role === 'User';

              return (
                <article
                  key={`${message.role}-${message.content}`}
                  className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${
                    isUser
                      ? 'ml-auto border-[var(--color-primary)]/30 bg-[var(--color-primary)]/12 text-[var(--color-text)]'
                      : 'mr-auto border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    {message.role}
                  </p>
                  <p>{message.content}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
