import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 sm:p-16 flex flex-col items-center justify-center font-sans selection:bg-white/20">
      <div className="w-full max-w-2xl">
        <Link 
          href="/" 
          className="inline-flex items-center text-white/50 hover:text-white mb-16 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 tracking-tight">About Yappie</h1>
        
        <div className="space-y-6 text-white/80 leading-relaxed text-lg sm:text-xl">
          <p>
            I built Yappie because campus is full of people who never actually talk to each other — same hallways, same lectures, same silence. We scroll past each other every day and call it connection.
          </p>
          <p>
            This isn&apos;t a startup pitch. There are no investors. No growth hacks. Just a place where you can say what you actually mean, to someone who might become a friend you&apos;ll never have found otherwise.
          </p>
          <p>
            I don&apos;t want credit. I don&apos;t want followers. I want one thing: for this to work.
          </p>
        </div>
      </div>
    </div>
  );
}
