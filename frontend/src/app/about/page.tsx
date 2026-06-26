import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#07080a] text-slate-100 selection:bg-slate-800 selection:text-white font-sans">
      
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 flex-grow flex flex-col items-center px-4 py-12 sm:px-6 sm:py-20">
        <div className="w-full max-w-2xl">
          
          {/* Back button */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition duration-200 mb-12"
          >
            <span>&larr;</span>
            <span>Back to Home</span>
          </Link>
          
          {/* Main Article */}
          <article className="space-y-12">
            
            {/* Header section */}
            <header className="border-b border-white/5 pb-8">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Our Story
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
                About Yappie
              </h1>
              <p className="text-lg sm:text-xl font-medium leading-relaxed text-slate-300">
                Yappie started with a simple observation.
              </p>
            </header>

            {/* Core Premise */}
            <section className="space-y-6">
              <p className="text-slate-300 leading-relaxed text-base sm:text-lg">
                Every day, thousands of students walk through the same campus, attend the same classes, and pass each other in hallways—yet many never get the chance to have a real conversation.
              </p>
              
              {/* Motivation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div className="p-6 rounded-xl border border-white/5 bg-[#0c0d12]/30 backdrop-blur-sm">
                  <h3 className="font-semibold text-white text-base mb-1">Make new friends</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Connect with peers across different departments or global rooms.</p>
                </div>
                <div className="p-6 rounded-xl border border-white/5 bg-[#0c0d12]/30 backdrop-blur-sm">
                  <h3 className="font-semibold text-white text-base mb-1">Share thoughts anonymously</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Express yourself without fear of judgment or profile bias.</p>
                </div>
                <div className="p-6 rounded-xl border border-white/5 bg-[#0c0d12]/30 backdrop-blur-sm">
                  <h3 className="font-semibold text-white text-base mb-1">Confess secrets</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Share secrets and gossip on the dedicated campus confessions board.</p>
                </div>
                <div className="p-6 rounded-xl border border-white/5 bg-[#0c0d12]/30 backdrop-blur-sm">
                  <h3 className="font-semibold text-white text-base mb-1">Simply be heard</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">Find a sympathetic ear when you just want someone to listen.</p>
                </div>
              </div>

              <p className="text-lg font-semibold text-white pt-4">
                Yappie was created to make those conversations possible.
              </p>
            </section>

            {/* Platform Philosophy */}
            <section className="space-y-6 border-t border-white/5 pt-10">
              <h2 className="text-2xl font-semibold text-white mb-4">A Space with Purpose</h2>
              <p className="text-slate-300 leading-relaxed text-base sm:text-lg">
                This platform isn&apos;t about likes, followers, or popularity. It&apos;s about creating genuine human connections in a space where people can be themselves without the fear of being judged.
              </p>
              <p className="text-slate-300 leading-relaxed text-base sm:text-lg">
                Whether you&apos;re looking to meet someone from your campus, chat with someone from across the world, or anonymously share what&apos;s on your mind, Yappie exists to make that easier.
              </p>
              <p className="text-slate-200 font-medium leading-relaxed text-base sm:text-lg border-l-2 border-slate-500 pl-4 py-1 bg-slate-900/20">
                Every feature—from Anonymous Chat to Campus Chat and Confessions—has been designed with one goal: <strong>Helping people connect more honestly.</strong>
              </p>
            </section>

            {/* Builder block */}
            <section className="p-6 sm:p-8 rounded-xl border border-white/5 bg-[#0c0d12]/40 backdrop-blur-md space-y-4">
              <h2 className="text-xl font-semibold text-white">Built Independently</h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Yappie was built independently by a student who believed that meaningful conversations shouldn&apos;t be difficult to start.
              </p>
              <ul className="list-none space-y-2 pt-2 text-xs font-medium text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>No big company behind it</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>No large corporate team</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>Just the simple idea that conversations deserve to feel real</span>
                </li>
              </ul>
            </section>

            {/* Concluding Section */}
            <section className="text-center space-y-6 border-t border-white/5 pt-10">
              <p className="text-slate-300 italic text-base sm:text-lg max-w-2xl mx-auto">
                &ldquo;If Yappie has helped you smile, make a friend, express yourself, or simply feel heard—even once—then it has achieved its purpose.&rdquo;
              </p>
              <div className="pt-4">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">Thank you for being part of this journey.</p>
                <p className="text-2xl font-bold text-white">Welcome to Yappie.</p>
              </div>
            </section>

          </article>
        </div>
      </div>
      
      {/* Simple Footer */}
      <footer className="relative z-10 w-full text-center py-8 border-t border-white/5">
        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Yappie. Built anonymously for college students.
        </p>
      </footer>
    </div>
  );
}
