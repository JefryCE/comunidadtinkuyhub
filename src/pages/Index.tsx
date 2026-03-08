import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import EventsPreview from "@/components/landing/EventsPreview";
import ImpactStats from "@/components/landing/ImpactStats";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/landing/ScrollToTop";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <EventsPreview />
      <ImpactStats />
      <CTASection />
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
