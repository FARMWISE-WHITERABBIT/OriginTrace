'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FadeIn } from '@/components/marketing/motion';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, ArrowRight, Phone, MapPin, Rocket, Headphones, Calendar } from 'lucide-react';

const timelineSteps = [
  {
    icon: Phone,
    title: 'Discovery Call',
    duration: '30 min',
    description:
      'We review your operation, supply chain complexity, and compliance requirements across target markets.',
  },
  {
    icon: MapPin,
    title: 'Platform Demo',
    duration: '45 min',
    description:
      'See polygon mapping, bag-level traceability, DDS export, and compliance scoring in a live environment.',
  },
  {
    icon: Rocket,
    title: '30-Day Pilot Setup',
    duration: 'Week 1',
    description:
      'We onboard your organization, configure commodities and regions, and begin farmer enrollment.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    duration: 'Ongoing',
    description:
      'Your compliance success manager ensures smooth adoption with training and optimization.',
  },
];

// Success state — rendered inline inside the form card slot, no extra nav/footer
function SubmittedState({ name }: { name: string }) {
  return (
    <FadeIn>
      <div className="py-8">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="mx-auto mb-6 h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center"
          >
            <Check className="h-10 w-10 text-emerald-500" />
          </motion.div>
          <p
            className="text-sm font-medium text-primary mb-3 tracking-wide uppercase"
            data-testid="text-success-label"
          >
            [ Request Received ]
          </p>
          <h2
            className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3"
            data-testid="text-success-heading"
          >
            Your Pilot Slot is Secured
          </h2>
          <p
            className="text-muted-foreground leading-relaxed max-w-sm mx-auto text-sm"
            data-testid="text-success-description"
          >
            Our compliance team will contact you within 24 hours to schedule your personalised demonstration.
          </p>
        </div>

        <div className="relative mb-8">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {timelineSteps.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.15, duration: 0.4 }}
                className="relative flex gap-5 py-4"
                data-testid={`timeline-step-${index}`}
              >
                <div className="relative z-10 h-12 w-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {item.duration}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-center"
        >
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-return-home">
              Return to Homepage
            </Button>
          </Link>
        </motion.div>
      </div>
    </FadeIn>
  );
}

export function DemoFormWidget() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    role: '',
    organization_type: '',
    commodity: '',
    monthly_tonnage: '',
    farmer_count: '',
    biggest_concern: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.full_name || !formData.email || !formData.company || !formData.phone) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields to continue',
          variant: 'destructive',
        });
        return;
      }
    }
    setStep(2);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.organization_type) {
      toast({
        title: 'Missing Information',
        description: 'Please select your organization type',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'demo' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Submission failed');
      // Redirect to booking confirm page while intent is hot
      router.push(data.redirect || `/demo/confirm?name=${encodeURIComponent(formData.full_name)}&email=${encodeURIComponent(formData.email)}`);
    } catch {
      toast({
        title: 'Submission failed',
        description: 'Something went wrong. Please email us directly at hello@origintrace.trade',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <FadeIn direction="left" delay={0.2}>
      <Card className="shadow-lg border">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                step >= 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
              data-testid="indicator-step-1"
            >
              {step > 1 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <div className="flex-1 h-1 bg-muted rounded-full">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: step > 1 ? '100%' : '0%' }}
              />
            </div>
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                step >= 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
              data-testid="indicator-step-2"
            >
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
                <h3 className="text-lg font-semibold mb-1" data-testid="text-step-title">
                  Contact Information
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Tell us who you are so we can tailor your demo.
                </p>
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
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Acme Exports Ltd"
                      data-testid="input-company"
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
                    <Label htmlFor="phone">Phone Number *</Label>
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
                  <Button onClick={handleNext} className="w-full gap-2" data-testid="button-next-step">
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
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <h3 className="text-lg font-semibold" data-testid="text-step2-title">
                    Operation Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm text-primary hover:underline"
                    data-testid="button-back"
                  >
                    Back
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Help us understand your supply chain.</p>
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
                        Sending...
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
  );
}
