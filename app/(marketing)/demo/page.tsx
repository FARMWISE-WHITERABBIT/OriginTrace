'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { FadeIn } from '@/components/marketing/motion';
import { useToast } from '@/hooks/use-toast';
import { LiveAgentIndicator } from '@/components/marketing/trace-animation';
import { 
  Check,
  Loader2,
  Shield,
  MapPin,
  FileText,
  ArrowRight,
  Calendar,
  Users
} from 'lucide-react';

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    organization_type: '',
    commodity: '',
    monthly_tonnage: '',
    farmer_count: '',
    biggest_concern: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleNext = () => {
    if (step === 1 && (!formData.full_name || !formData.email)) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name and email to continue',
        variant: 'destructive'
      });
      return;
    }
    setStep(2);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.organization_type) {
      toast({
        title: 'Missing Information',
        description: 'Please select your organization type',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <MarketingNav />
        
        <main className="pt-24 pb-20">
          <div className="max-w-lg mx-auto px-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-6 h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center"
            >
              <Check className="h-10 w-10 text-emerald-500" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-2xl font-semibold mb-4">
                Your Pilot Slot is Secured
              </h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Our compliance team will contact you within 24 hours to schedule 
                your personalized demonstration and discuss your pilot setup.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-medium mb-4">What happens next:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Discovery Call (30 min)</p>
                      <p className="text-xs text-muted-foreground">We'll review your operation and compliance needs</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Platform Demo</p>
                      <p className="text-xs text-muted-foreground">See polygon mapping, traceability, and DDS export in action</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">30-Day Pilot Setup</p>
                      <p className="text-xs text-muted-foreground">Onboard your organization with dedicated support</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Link href="/">
                <Button variant="outline">Return to Homepage</Button>
              </Link>
            </motion.div>
          </div>
        </main>

        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main className="pt-24 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <FadeIn direction="right">
              <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
                Compliance Consultation
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-6">
                Get Your Verified Pedigree Pilot
              </h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                We'll review your operation and show you exactly how OriginTrace 
                can strengthen your export compliance and reduce shipment rejection risk.
              </p>
              
              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Compliance Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Identify gaps in your current traceability and documentation
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Platform Demo</h3>
                    <p className="text-sm text-muted-foreground">
                      See polygon mapping, bag traceability, and DDS export
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Pilot Onboarding</h3>
                    <p className="text-sm text-muted-foreground">
                      30-day pilot with dedicated support team
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
                <LiveAgentIndicator />
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Response within 24h</span>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn direction="left" delay={0.2}>
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {step > 1 ? <Check className="h-4 w-4" /> : '1'}
                    </div>
                    <div className="flex-1 h-1 bg-muted rounded">
                      <div 
                        className="h-full bg-primary rounded transition-all duration-300"
                        style={{ width: step > 1 ? '100%' : '0%' }}
                      />
                    </div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      2
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="font-medium mb-4">Contact Information</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="full_name">Full Name *</Label>
                            <Input
                              id="full_name"
                              value={formData.full_name}
                              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                              placeholder="Your full name"
                              data-testid="input-full-name"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="email">Work Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="you@company.com"
                              data-testid="input-email"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="phone">Phone (Optional)</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="+234..."
                              data-testid="input-phone"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="role">Your Role</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ceo">CEO / Managing Director</SelectItem>
                                <SelectItem value="sustainability">Sustainability Officer</SelectItem>
                                <SelectItem value="operations">Operations Manager</SelectItem>
                                <SelectItem value="procurement">Procurement Manager</SelectItem>
                                <SelectItem value="compliance">Compliance Officer</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button 
                            onClick={handleNext}
                            className="w-full gap-2"
                            data-testid="button-next-step"
                          >
                            Continue
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleSubmit}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium">Operation Details</h3>
                          <button 
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-sm text-primary hover:underline"
                          >
                            Back
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="organization_type">Organization Type *</Label>
                            <Select
                              value={formData.organization_type}
                              onValueChange={(value) => setFormData({ ...formData, organization_type: value })}
                            >
                              <SelectTrigger data-testid="select-org-type">
                                <SelectValue placeholder="Select organization type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exporter">Exporter</SelectItem>
                                <SelectItem value="processor">Processor / Crusher</SelectItem>
                                <SelectItem value="both">Both Exporter & Processor</SelectItem>
                                <SelectItem value="aggregator">Aggregator / Trader</SelectItem>
                                <SelectItem value="cooperative">Cooperative</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="commodity">Primary Commodity</Label>
                              <Select
                                value={formData.commodity}
                                onValueChange={(value) => setFormData({ ...formData, commodity: value })}
                              >
                                <SelectTrigger data-testid="select-commodity">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cocoa">Cocoa</SelectItem>
                                  <SelectItem value="cashew">Cashew</SelectItem>
                                  <SelectItem value="palm">Palm Kernel</SelectItem>
                                  <SelectItem value="coffee">Coffee</SelectItem>
                                  <SelectItem value="rubber">Rubber</SelectItem>
                                  <SelectItem value="shea">Shea</SelectItem>
                                  <SelectItem value="ginger">Ginger</SelectItem>
                                  <SelectItem value="sesame">Sesame</SelectItem>
                                  <SelectItem value="multiple">Multiple</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="monthly_tonnage">Monthly Volume (MT)</Label>
                              <Input
                                id="monthly_tonnage"
                                type="number"
                                value={formData.monthly_tonnage}
                                onChange={(e) => setFormData({ ...formData, monthly_tonnage: e.target.value })}
                                placeholder="e.g., 500"
                                data-testid="input-tonnage"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="farmer_count">Number of Farmers</Label>
                            <Input
                              id="farmer_count"
                              type="number"
                              value={formData.farmer_count}
                              onChange={(e) => setFormData({ ...formData, farmer_count: e.target.value })}
                              placeholder="e.g., 2500"
                              data-testid="input-farmer-count"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="biggest_concern">Biggest Compliance Challenge</Label>
                            <Select
                              value={formData.biggest_concern}
                              onValueChange={(value) => setFormData({ ...formData, biggest_concern: value })}
                            >
                              <SelectTrigger data-testid="select-concern">
                                <SelectValue placeholder="Select challenge" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="farm_mapping">Farm polygon mapping</SelectItem>
                                <SelectItem value="traceability">Bag-level traceability</SelectItem>
                                <SelectItem value="documentation">DDS documentation</SelectItem>
                                <SelectItem value="processing">Processing mass balance</SelectItem>
                                <SelectItem value="audits">Audit preparation</SelectItem>
                                <SelectItem value="all">All of the above</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="message">Additional Context (Optional)</Label>
                            <Textarea
                              id="message"
                              value={formData.message}
                              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                              placeholder="Tell us about your current setup or specific needs..."
                              rows={3}
                              data-testid="input-message"
                            />
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full" 
                            size="lg"
                            disabled={submitting}
                            data-testid="button-submit-demo"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Processing...
                              </>
                            ) : (
                              'Secure My Pilot Slot'
                            )}
                          </Button>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            By submitting, you agree to a brief compliance consultation call.
                          </p>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
