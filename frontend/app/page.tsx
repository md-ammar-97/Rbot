import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-apple-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-apple-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[17px] font-semibold text-apple-text">RBot</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[15px] text-apple-accent hover:underline font-medium"
            >
              Sign in
            </Link>
            <Link href="/login" className="btn-primary text-[15px] h-9 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center max-w-4xl mx-auto">
        <p className="text-[15px] font-semibold text-apple-accent tracking-wide uppercase mb-4">
          AI Job Co-Pilot for Product Managers
        </p>
        <h1 className="text-[56px] font-bold leading-tight text-apple-text mb-6">
          Your PM job search,<br />finally intelligent.
        </h1>
        <p className="text-[21px] text-apple-text-secondary max-w-2xl mx-auto mb-10">
          RBot recovers your resume, finds the right roles, scores your fit with evidence,
          and drafts tailored applications — all grounded in what you actually built.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login" className="btn-primary text-[17px]">
            Get Started Free
          </Link>
          <a href="#how-it-works" className="btn-secondary text-[17px]">
            How it works
          </a>
        </div>
      </section>

      {/* Quality over volume */}
      <section className="py-20 px-6 bg-apple-surface">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-[36px] font-bold text-apple-text mb-4">
            Quality over volume.
          </h2>
          <p className="text-[19px] text-apple-text-secondary max-w-2xl mx-auto">
            Most tools push you to apply to more jobs. RBot asks a different question:
            <strong className="text-apple-text"> how do we make each application count?</strong>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[36px] font-bold text-apple-text text-center mb-16">
            How RBot works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Resume Recovery",
                desc:  "Upload your resume. RBot diagnoses 7 quality dimensions and runs a targeted conversation to fill every gap — then produces a master baseline resume.",
              },
              {
                step: "02",
                title: "Intelligent Discovery",
                desc:  "Fresh PM roles from Greenhouse and Lever, scored against your profile every 4 hours. Fit Score + Evidence Confidence + Automation Eligibility — not an ATS score.",
              },
              {
                step: "03",
                title: "Evidence-Gated Drafting",
                desc:  "Tailored resumes and cover letters grounded only in what you've actually done. Every metric is traced back to your profile. Nothing invented.",
              },
            ].map((item) => (
              <div key={item.step} className="card p-8">
                <p className="text-[13px] font-bold text-apple-accent tracking-widest mb-3">
                  STEP {item.step}
                </p>
                <h3 className="text-[22px] font-semibold text-apple-text mb-3">{item.title}</h3>
                <p className="text-[15px] text-apple-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data isolation */}
      <section className="py-20 px-6 bg-apple-surface">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[28px] font-bold text-apple-text mb-4">Your data is yours.</h2>
          <p className="text-[17px] text-apple-text-secondary leading-relaxed">
            Sign in with Google — no password needed. Your profile, applications, and
            documents are isolated by PostgreSQL Row Level Security. No user can see
            another user&apos;s data, enforced at the database level, not application code.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-[40px] font-bold text-apple-text mb-6">
          Start with your resume.
        </h2>
        <p className="text-[19px] text-apple-text-secondary mb-10 max-w-xl mx-auto">
          Upload it in under a minute. RBot tells you exactly what needs to improve
          and builds your baseline — before you apply to a single job.
        </p>
        <Link href="/login" className="btn-primary text-[17px]">
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-apple-border py-8 px-6 text-center">
        <p className="text-[13px] text-apple-text-tertiary">
          © 2026 RBot. Built for PM job seekers who value quality over volume.
        </p>
      </footer>
    </main>
  );
}
