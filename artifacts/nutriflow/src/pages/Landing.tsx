import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const { user, supabaseUser, onboarded } = useAuth();

  const getStartedHref = () => {
    if (!user) return "/login";
    if (supabaseUser && !supabaseUser.email_confirmed_at) {
      return `/verify-email?email=${encodeURIComponent(supabaseUser.email || "")}`;
    }
    return onboarded ? "/dashboard" : "/onboarding";
  };

  const getStartedText = () => {
    if (!user) return "Get Started";
    return "Go to Dashboard";
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-primary/10 to-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
              Your Personal AI <span className="text-primary">Wellness Copilot</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Intelligent meal recommendations, grocery planning, and personalized nutrition insights. Like having a nutritionist in your pocket.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href={getStartedHref()}>
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full">
                  {getStartedText()}
                </Button>
              </Link>
              <Link href="/discover">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full bg-background">
                  Explore Meals
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="py-24 px-4 bg-background">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-xl font-semibold">Smart Tracking</h3>
              <p className="text-muted-foreground">Effortlessly monitor your nutrition with our AI-powered insights and wellness scoring.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <h3 className="text-xl font-semibold">Grocery Planning</h3>
              <p className="text-muted-foreground">Auto-generate grocery lists based on your weekly meal plans and dietary preferences.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h3 className="text-xl font-semibold">AI Assistant</h3>
              <p className="text-muted-foreground">Chat with your personal AI nutritionist for advice, recipes, and motivation anytime.</p>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
