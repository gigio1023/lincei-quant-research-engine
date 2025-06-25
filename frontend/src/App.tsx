import { GlareCard } from "@/components/ui/glare-card";
import { WavyBackground } from "@/components/ui/wavy-background";
import { FaqSection } from "@/components/ui/faq";

const DEMO_FAQS = [
  {
    question: "What is the core purpose of this project?",
    answer:
      "To provide an AI-powered investment analysis and report generation service for value investors, automating the process of gathering and analyzing financial news.",
  },
  {
    question: "What technologies are used in the backend?",
    answer:
      "The backend is built with NestJS and TypeScript, using TypeORM for database interaction with SQLite. It leverages Gemini 2.5 Flash and GPT-4.1-nano for AI-powered analysis.",
  },
  {
    question: "How is the frontend built?",
    answer:
      "The frontend is a single-page application built with React 19, TypeScript, and styled with Tailwind CSS. It uses Vite for the build process and Vitest for testing.",
  },
  {
    question: "How does the report generation work?",
    answer:
      "Reports are generated automatically by scheduled cron jobs (8 AM and 6 PM KST). The system collects news from various RSS feeds, analyzes the content using AI, and stores the generated reports in the database for users to view.",
  },
  {
    question: "How can I test the system?",
    answer:
      "The project includes a comprehensive testing framework with manual trigger endpoints to test the entire data flow without waiting for scheduled jobs. You can use the testing dashboard at /testing to monitor system health, create mock data, and run various test suites.",
  },
];

function App() {
  return (
    <div className="h-full bg-slate-950 text-white">
      <WavyBackground className="max-w-4xl mx-auto pb-40">
        <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var text-center">
          Auto Investment Helper
        </p>
        <p className="text-base md:text-lg mt-4 text-white font-normal inter-var text-center">
          AI-powered investment analysis and report generation for value
          investors.
        </p>
      </WavyBackground>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 -mt-20 px-10">
        <GlareCard className="flex flex-col items-start justify-end p-6">
          <p className="font-bold text-white text-xl">NestJS Backend</p>
          <p className="font-normal text-base text-neutral-200 mt-2">
            A robust backend powered by NestJS, handling data collection, AI
            analysis, and report generation.
          </p>
        </GlareCard>
        <GlareCard className="flex flex-col items-start justify-end p-6">
          <p className="font-bold text-white text-xl">React Frontend</p>
          <p className="font-normal text-base text-neutral-200 mt-2">
            A modern and responsive user interface built with React, Vite, and
            Tailwind CSS for a seamless user experience.
          </p>
        </GlareCard>
        <GlareCard className="flex flex-col items-start justify-end p-6">
          <p className="font-bold text-white text-xl">Comprehensive Testing</p>
          <p className="font-normal text-base text-neutral-200 mt-2">
            A full suite of tests and a dedicated testing dashboard to ensure
            the reliability and performance of the system.
          </p>
        </GlareCard>
      </div>
      <div className="mt-20">
        <FaqSection
          title="Frequently Asked Questions"
          description="Key information about the Auto Investment Helper project."
          items={DEMO_FAQS}
          contactInfo={{
            title: "Still have questions?",
            description: "We're here to help you",
            buttonText: "Contact Support",
            onContact: () => console.log("Contact support clicked"),
          }}
        />
      </div>
    </div>
  );
}

export default App;
