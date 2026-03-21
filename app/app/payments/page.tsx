import { Suspense } from 'react';
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentTableSkeleton } from '@/components/skeletons';
import { useOrg } from '@/lib/contexts/org-context';
import { useCurrency, SUPPORTED_CURRENCIES, CURRENCY_LABELS } from '@/hooks/use-currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { downloadCSV } from '@/lib/export/csv-export';
import { Loader2, Plus, Search, Banknote, Hash, TrendingUp, Download, ChevronLeft, ChevronRight, Smartphone, Link2, Pencil } from 'lucide-react';

interface Payment { id:string; payee_name:string; payee_type:string; farm_id?:string|null; amount:number; currency:string; payment_method:string; reference_number:string|null; linked_entity_type:string|null; linked_entity_id:string|null; payment_date:string; status:string; notes:string|null; created_at:string; }
interface FarmerOption { id:string; name:string; community?:string; commodity?:string; }
interface LinkedEntity { id:string; label:string; }
interface PaymentSummary { totalAmount:number; totalCount:number; averageAmount:number; byCurrency:Record<string,number>; byPayeeType:Record<string,{total:number;count:number}>; byMethod:Record<string,number>; byMonth:Record<string,number>; }

const PAYEE_LABELS:Record<string,string> = { farmer:'Farmer', aggregator:'Aggregator', supplier:'Supplier' };
const METHOD_LABELS:Record<string,string> = { cash:'Cash', bank_transfer:'Bank Transfer', mobile_money:'Mobile Money', cheque:'Cheque' };
const STATUS_VARIANTS:Record<string,'default'|'secondary'|'destructive'|'outline'> = { completed:'default', pending:'outline', failed:'destructive', reversed:'secondary' };
function esc(v:string|number|null|undefined){const s=String(v??'');return s.includes(',')||s.includes('"')||s.includes('\n')?`"${s.replace(/"/g,'""')}"`:`${s}`;}

function PaymentsPageInner() {
  const { organization, isLoading:orgLoading } = useOrg();
  const { format, currency:orgCurrency } = useCurrency();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Pre-fill from contract deep-link: /app/payments?contract_id=X&contract_ref=Y&commodity=Z&buyer=B
  const contractId  = searchParams.get('contract_id');
  const contractRef = searchParams.get('contract_ref');
  const contractBuyer = searchParams.get('buyer');
  const [payments,setPayments]=useState<Payment[]>([]);
  const [summary,setSummary]=useState<PaymentSummary|null>(null);
  const [isLoading,setIsLoading]=useState(true);
  const [isSummaryLoading,setIsSummaryLoading]=useState(true);
  const [dialogOpen,setDialogOpen]=useState(false);
  const [disburseOpen,setDisburseOpen]=useState(false);
  const [isCreating,setIsCreating]=useState(false);
  const [isDisbursing,setIsDisbursing]=useState(false);
  const [farmers,setFarmers]=useState<FarmerOption[]>([]);
  const [farmerSearch,setFarmerSearch]=useState('');
  const [farmersLoading,setFarmersLoading]=useState(false);
  const [linkedEntities,setLinkedEntities]=useState<LinkedEntity[]>([]);
  const [isLoadingEntities,setIsLoadingEntities]=useState(false);
  const [searchQuery,setSearchQuery]=useState('');
  const [payeeTypeFilter,setPayeeTypeFilter]=useState('all');
  const [methodFilter,setMethodFilter]=useState('all');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [page,setPage]=useState(1);
  const [totalPages,setTotalPages]=useState(1);
  const [totalCount,setTotalCount]=useState(0);
  const [disburseForm,setDisburseForm]=useState({phone:'',amount:'',currency:'NGN',provider:'mtn_momo',payee_name:'',notes:''});
  const mkForm=useCallback(()=>({payee_type:'farmer',farm_id:'',payee_name:'',amount:'',currency:orgCurrency,payment_method:'cash',reference_number:'',linked_entity_type:'',linked_entity_id:'',payment_date:new Date().toISOString().split('T')[0],notes:''}),[orgCurrency]);
  const [form,setForm]=useState(mkForm);
  const [editingPayment,setEditingPayment]=useState<Payment|null>(null);
  const [editDialogOpen,setEditDialogOpen]=useState(false);
  const [isEditing,setIsEditing]=useState(false);
  const [editForm,setEditForm]=useState({amount:'',currency:'NGN',payment_method:'cash',reference_number:'',payment_date:'',notes:'',status:'completed'});

  const openEdit=(p:Payment)=>{
    setEditingPayment(p);
    setEditForm({amount:String(p.amount),currency:p.currency,payment_method:p.payment_method,reference_number:p.reference_number||'',payment_date:p.payment_date?.split('T')[0]||'',notes:p.notes||'',status:p.status});
    setEditDialogOpen(true);
  };

  const handleEdit=async()=>{
    if(!editingPayment)return;
    setIsEditing(true);
    try{
      const body:any={payment_method:editForm.payment_method,currency:editForm.currency,status:editForm.status};
      if(editForm.amount)body.amount=parseFloat(editForm.amount);
      body.reference_number=editForm.reference_number||null;
      if(editForm.payment_date)body.payment_date=editForm.payment_date;
      body.notes=editForm.notes||null;
      const r=await fetch(`/api/payments/${editingPayment.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok){const e=await r.json();throw new Error(e.error||'Failed');}
      const {payment:updated}=await r.json();
      setPayments(prev=>prev.map(p=>p.id===editingPayment.id?updated:p));
      toast({title:'Payment updated'});
      setEditDialogOpen(false);setEditingPayment(null);
    }catch(e:any){toast({title:'Error',description:e.message,variant:'destructive'});}
    finally{setIsEditing(false);}
  };

  const fetchFarmers=useCallback(async()=>{
    setFarmersLoading(true);
    try{const r=await fetch('/api/farmers?limit=100');if(!r.ok)return;const d=await r.json();setFarmers((d.farmers||d||[]).map((f:any)=>({id:String(f.farm_id??f.id),name:f.farmer_name,community:f.community,commodity:f.commodity})));}
    catch{}finally{setFarmersLoading(false);}
  },[]);

  useEffect(()=>{if(dialogOpen&&form.payee_type==='farmer'&&farmers.length===0)fetchFarmers();},[dialogOpen,form.payee_type,farmers.length,fetchFarmers]);
  useEffect(()=>{if(dialogOpen)setForm(f=>({...f,currency:orgCurrency}));},[dialogOpen,orgCurrency]);

  // Auto-open dialog pre-filled when navigated from Contracts page
  useEffect(()=>{
    if(contractId && contractRef){
      setForm(f=>({
        ...f,
        payee_type:'aggregator',
        payee_name: contractBuyer || '',
        notes: `Contract: ${contractRef}`,
        linked_entity_type:'contract',
        linked_entity_id: contractId,
      }));
      setDialogOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[contractId]);

  const fetchPayments=useCallback(async()=>{
    if(orgLoading||!organization){setIsLoading(false);return;}
    setIsLoading(true);
    try{const p=new URLSearchParams();p.set('page',String(page));p.set('limit','25');if(payeeTypeFilter!=='all')p.set('payee_type',payeeTypeFilter);if(methodFilter!=='all')p.set('payment_method',methodFilter);if(dateFrom)p.set('date_from',dateFrom);if(dateTo)p.set('date_to',dateTo);if(searchQuery)p.set('search',searchQuery);const r=await fetch(`/api/payments?${p}`);if(!r.ok)throw new Error();const d=await r.json();setPayments(d.payments||[]);setTotalPages(d.totalPages||1);setTotalCount(d.total||0);}
    catch{}finally{setIsLoading(false);}
  },[organization,orgLoading,page,payeeTypeFilter,methodFilter,dateFrom,dateTo,searchQuery]);

  const fetchSummary=useCallback(async()=>{
    if(orgLoading||!organization){setIsSummaryLoading(false);return;}
    try{const r=await fetch('/api/payments/summary');if(!r.ok)throw new Error();setSummary(await r.json());}
    catch{}finally{setIsSummaryLoading(false);}
  },[organization,orgLoading]);

  useEffect(()=>{fetchPayments();},[fetchPayments]);
  useEffect(()=>{fetchSummary();},[fetchSummary]);
  useEffect(()=>{setPage(1);},[payeeTypeFilter,methodFilter,dateFrom,dateTo,searchQuery]);

  const fetchLinkedEntities=useCallback(async(et:string)=>{
    if(!et||!organization){setLinkedEntities([]);return;}
    setIsLoadingEntities(true);
    try{if(et==='collection_batch'){const r=await fetch('/api/batches');if(r.ok){const d=await r.json();setLinkedEntities((d.batches||d||[]).map((b:any)=>({id:b.id,label:`${b.batch_code||b.id.slice(0,8)} — ${b.commodity||'Unknown'} (${b.total_weight??0} kg)`,})));}}else if(et==='contract'){const r=await fetch('/api/contracts');if(r.ok){const d=await r.json();setLinkedEntities((d.contracts||d||[]).map((c:any)=>({id:c.id,label:`${c.contract_number||c.id.slice(0,8)} — ${c.buyer_name||''} ${c.commodity||''}`.trim(),})));}}}
    catch{setLinkedEntities([]);}finally{setIsLoadingEntities(false);}
  },[organization]);

  useEffect(()=>{fetchLinkedEntities(form.linked_entity_type);},[form.linked_entity_type,fetchLinkedEntities]);

  const selectFarmer=(f:FarmerOption)=>{setForm(prev=>({...prev,farm_id:f.id,payee_name:f.name}));setFarmerSearch('');};

  const [formErrors,setFormErrors]=useState<{payee_name?:string;amount?:string;payment_method?:string}>({});

  const handleCreate=async()=>{
    const errs:{payee_name?:string;amount?:string;payment_method?:string}={};
    if(!form.payee_name) errs.payee_name='Payee name is required';
    if(!form.amount) errs.amount='Amount is required';
    else if(isNaN(parseFloat(form.amount))||parseFloat(form.amount)<=0) errs.amount='Must be a positive number';
    if(!form.payment_method) errs.payment_method='Payment method is required';
    if(Object.keys(errs).length>0){setFormErrors(errs);return;}
    setFormErrors({});
    const amount=parseFloat(form.amount);
    setIsCreating(true);
    try{const r=await fetch('/api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payee_name:form.payee_name,payee_type:form.payee_type,farm_id:form.farm_id||undefined,amount,currency:form.currency,payment_method:form.payment_method,reference_number:form.reference_number||undefined,linked_entity_type:form.linked_entity_type||undefined,linked_entity_id:form.linked_entity_id||undefined,payment_date:form.payment_date||undefined,notes:form.notes||undefined})});if(!r.ok){const e=await r.json();throw new Error(e.error||'Failed');}toast({title:'Payment recorded',description:`${format(amount)} to ${form.payee_name}.`});setDialogOpen(false);setForm(mkForm());setLinkedEntities([]);fetchPayments();fetchSummary();}
    catch(err:any){toast({title:'Error',description:err.message,variant:'destructive'});}
    finally{setIsCreating(false);}
  };

  const handleDisburse=async()=>{
    if(!disburseForm.phone||!disburseForm.amount){toast({title:'Missing fields',description:'Phone and amount are required.',variant:'destructive'});return;}
    setIsDisbursing(true);
    try{const r=await fetch('/api/payments/disburse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...disburseForm,amount:parseFloat(disburseForm.amount)})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Failed');toast({title:'Disbursement sent',description:`TxID: ${d.disbursement?.transactionId}`});setDisburseOpen(false);setDisburseForm({phone:'',amount:'',currency:'NGN',provider:'mtn_momo',payee_name:'',notes:''});}
    catch(err:any){toast({title:'Error',description:err.message,variant:'destructive'});}
    finally{setIsDisbursing(false);}
  };

  const handleExportCSV=()=>{const headers=['Date','Payee','Type','Farm ID','Amount','Currency','Method','Reference','Linked To','Status'];const rows=payments.map(p=>[p.payment_date,p.payee_name,PAYEE_LABELS[p.payee_type]||p.payee_type,p.farm_id||'',String(p.amount),p.currency,METHOD_LABELS[p.payment_method]||p.payment_method,p.reference_number||'',p.linked_entity_type||'',p.status].map(esc).join(','));downloadCSV([headers.map(esc).join(','),...rows].join('\n'),`payments-${new Date().toISOString().split('T')[0]}.csv`);};

  const currencyEntries=summary?Object.entries(summary.byCurrency):[];
  const filteredFarmers=farmers.filter(f=>!farmerSearch||f.name.toLowerCase().includes(farmerSearch.toLowerCase())||(f.community||'').toLowerCase().includes(farmerSearch.toLowerCase()));

  return (
    <TierGate feature="payments" requiredTier="starter" featureLabel="Payment Tracking">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Payment Tracking</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Record and track payments to farmers, aggregators, and suppliers</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportCSV} disabled={payments.length===0} data-testid="button-export-csv"><Download className="h-4 w-4 mr-2"/>Export CSV</Button>

            {/* Disburse */}
            <Dialog open={disburseOpen} onOpenChange={setDisburseOpen}>
              <DialogTrigger asChild><Button variant="outline" data-testid="button-disburse"><Smartphone className="h-4 w-4 mr-2"/>Disburse</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Mobile Money Disbursement</DialogTitle><DialogDescription>Send payment to a farmer's mobile wallet.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1.5"><Label>Payee Name</Label><Input placeholder="Farmer name" value={disburseForm.payee_name} onChange={e=>setDisburseForm(f=>({...f,payee_name:e.target.value}))} data-testid="input-disburse-name"/></div>
                  <div className="space-y-1.5"><Label>Phone Number</Label><Input placeholder="+2348012345678" value={disburseForm.phone} onChange={e=>setDisburseForm(f=>({...f,phone:e.target.value}))} data-testid="input-disburse-phone"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Amount</Label><Input type="number" placeholder="0" value={disburseForm.amount} onChange={e=>setDisburseForm(f=>({...f,amount:e.target.value}))} data-testid="input-disburse-amount"/></div>
                    <div className="space-y-1.5"><Label>Currency</Label><Select value={disburseForm.currency} onValueChange={v=>setDisburseForm(f=>({...f,currency:v}))}><SelectTrigger data-testid="select-disburse-currency"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NGN">NGN</SelectItem><SelectItem value="GHS">GHS</SelectItem><SelectItem value="XOF">XOF</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-1.5"><Label>Provider</Label><Select value={disburseForm.provider} onValueChange={v=>setDisburseForm(f=>({...f,provider:v}))}><SelectTrigger data-testid="select-disburse-provider"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="mtn_momo">MTN MoMo</SelectItem><SelectItem value="opay">OPay</SelectItem><SelectItem value="palmpay">PalmPay</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Notes</Label><Textarea placeholder="Optional" value={disburseForm.notes} onChange={e=>setDisburseForm(f=>({...f,notes:e.target.value}))} rows={2}/></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={()=>setDisburseOpen(false)}>Cancel</Button><Button onClick={handleDisburse} disabled={isDisbursing} data-testid="button-confirm-disburse">{isDisbursing&&<Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Send Payment</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Record Payment */}
            <Dialog open={dialogOpen} onOpenChange={v=>{setDialogOpen(v);if(!v)setFormErrors({});}}>
              <DialogTrigger asChild><Button data-testid="button-record-payment"><Plus className="h-4 w-4 mr-2"/>Record Payment</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Record a payment linked to a farmer or supplier.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Payee type */}
                  <div className="space-y-1.5"><Label>Payee Type</Label>
                    <Select value={form.payee_type} onValueChange={v=>setForm(f=>({...f,payee_type:v,farm_id:'',payee_name:''}))}>
                      <SelectTrigger data-testid="select-payee-type-form"><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="farmer">Farmer</SelectItem><SelectItem value="aggregator">Aggregator</SelectItem><SelectItem value="supplier">Supplier</SelectItem></SelectContent>
                    </Select>
                  </div>

                  {/* Farmer picker */}
                  {form.payee_type==='farmer'?(
                    <div className="space-y-1.5">
                      <Label>Select Farmer <span className="text-muted-foreground text-xs font-normal">— links payment to farmer record</span></Label>
                      {form.farm_id?(
                        <div className="flex items-center gap-3 p-2.5 rounded-md border bg-muted/30">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{form.payee_name.charAt(0).toUpperCase()}</div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{form.payee_name}</p><p className="text-xs text-muted-foreground font-mono">Farm ID: {form.farm_id.slice(0,12)}…</p></div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={()=>setForm(f=>({...f,farm_id:'',payee_name:''}))}>Change</Button>
                        </div>
                      ):(
                        <div className="space-y-2">
                          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/><Input className="pl-8 h-8 text-sm" placeholder="Search by name or community…" value={farmerSearch} onChange={e=>setFarmerSearch(e.target.value)} data-testid="input-farmer-search"/></div>
                          <div className="border rounded-md max-h-44 overflow-y-auto">
                            {farmersLoading?<div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/></div>
                            :filteredFarmers.length===0?<p className="text-xs text-muted-foreground text-center py-6">No farmers found</p>
                            :filteredFarmers.map(farmer=>(
                              <button key={farmer.id} type="button" className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-0" onClick={()=>selectFarmer(farmer)} data-testid={`farmer-option-${farmer.id}`}>
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{farmer.name.charAt(0).toUpperCase()}</div>
                                <div className="min-w-0"><p className="text-sm font-medium truncate">{farmer.name}</p><p className="text-xs text-muted-foreground truncate">{[farmer.community,farmer.commodity].filter(Boolean).join(' · ')||'No details'}</p></div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ):(
                    <div className="space-y-1.5"><Label htmlFor="payee_name">Payee Name</Label><Input id="payee_name" placeholder="Enter name" value={form.payee_name} onChange={e=>{setForm(f=>({...f,payee_name:e.target.value}));if(formErrors.payee_name)setFormErrors(fe=>({...fe,payee_name:undefined}));}} className={formErrors.payee_name?'border-destructive focus-visible:ring-destructive':''} data-testid="input-payee-name"/>{formErrors.payee_name&&<p className="text-xs text-destructive mt-1">{formErrors.payee_name}</p>}</div>
                  )}

                  {/* Amount + Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e=>{setForm(f=>({...f,amount:e.target.value}));if(formErrors.amount)setFormErrors(fe=>({...fe,amount:undefined}));}} className={formErrors.amount?'border-destructive focus-visible:ring-destructive':''} data-testid="input-amount"/>{formErrors.amount&&<p className="text-xs text-destructive mt-1">{formErrors.amount}</p>}</div>
                    <div className="space-y-1.5"><Label>Currency</Label>
                      <Select value={form.currency} onValueChange={v=>setForm(f=>({...f,currency:v as import('@/hooks/use-currency').SupportedCurrency}))}>
                        <SelectTrigger data-testid="select-currency-form"><SelectValue/></SelectTrigger>
                        <SelectContent>{SUPPORTED_CURRENCIES.map(c=><SelectItem key={c} value={c}>{CURRENCY_LABELS[c]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Method + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Payment Method</Label>
                      <Select value={form.payment_method} onValueChange={v=>{setForm(f=>({...f,payment_method:v}));if(formErrors.payment_method)setFormErrors(fe=>({...fe,payment_method:undefined}));}}>
                        <SelectTrigger className={formErrors.payment_method?'border-destructive':''} data-testid="select-payment-method-form"><SelectValue placeholder="Select method"/></SelectTrigger>
                        <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
                      </Select>
                      {formErrors.payment_method&&<p className="text-xs text-destructive mt-1">{formErrors.payment_method}</p>}
                    </div>
                    <div className="space-y-1.5"><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={e=>setForm(f=>({...f,payment_date:e.target.value}))} data-testid="input-payment-date"/></div>
                  </div>

                  {/* Reference */}
                  <div className="space-y-1.5"><Label>Reference Number <span className="text-muted-foreground text-xs font-normal">optional</span></Label><Input placeholder="Receipt / transfer ref" value={form.reference_number} onChange={e=>setForm(f=>({...f,reference_number:e.target.value}))} data-testid="input-reference-number"/></div>

                  {/* Link to entity */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5"/>Link to Batch or Contract <span className="text-muted-foreground text-xs font-normal">optional</span></Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={form.linked_entity_type||'none'} onValueChange={v=>setForm(f=>({...f,linked_entity_type:v==='none'?'':v,linked_entity_id:''}))}>
                        <SelectTrigger data-testid="select-linked-entity-type"><SelectValue placeholder="None"/></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="collection_batch">Collection Batch</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent>
                      </Select>
                      <Select value={form.linked_entity_id||'none'} onValueChange={v=>setForm(f=>({...f,linked_entity_id:v==='none'?'':v}))} disabled={!form.linked_entity_type||isLoadingEntities}>
                        <SelectTrigger data-testid="select-linked-entity-id"><SelectValue placeholder={isLoadingEntities?'Loading…':!form.linked_entity_type?'Select type first':'Select'}/></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem>{linkedEntities.map(e=><SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5"><Label>Notes <span className="text-muted-foreground text-xs font-normal">optional</span></Label><Textarea placeholder="e.g. Cocoa batch payment Q1 2026" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} data-testid="input-notes"/></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={()=>setDialogOpen(false)} data-testid="button-cancel-payment">Cancel</Button><Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-payment">{isCreating&&<Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Record Payment</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary */}
        {isSummaryLoading?(<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map(i=><Card key={i}><CardContent className="pt-4 pb-4 h-[72px] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></CardContent></Card>)}</div>)
        :summary?(
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center shrink-0"><Banknote className="h-5 w-5 text-green-600 dark:text-green-400"/></div><div data-testid="text-total-paid">{currencyEntries.length>0?currencyEntries.map(([,amt])=><p key={String(amt)} className="text-lg font-bold leading-tight">{format(amt)}</p>):<p className="text-lg font-bold">{format(0)}</p>}<p className="text-xs text-muted-foreground">Total Paid</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0"><Hash className="h-5 w-5 text-muted-foreground"/></div><div><p className="text-2xl font-bold" data-testid="text-payment-count">{summary.totalCount}</p><p className="text-xs text-muted-foreground">Total Payments</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0"><TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400"/></div><div><p className="text-lg font-bold" data-testid="text-average-amount">{format(summary.averageAmount)}</p><p className="text-xs text-muted-foreground">Average Payment</p></div></div></CardContent></Card>
          </div>
        ):null}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search by farmer name…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="pl-9" aria-label="Search payments" data-testid="input-search-payments"/></div>
          <Select value={payeeTypeFilter} onValueChange={setPayeeTypeFilter}><SelectTrigger className="w-[130px]" data-testid="select-payee-type-filter"><SelectValue placeholder="All Types"/></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="farmer">Farmer</SelectItem><SelectItem value="aggregator">Aggregator</SelectItem><SelectItem value="supplier">Supplier</SelectItem></SelectContent></Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}><SelectTrigger className="w-[140px]" data-testid="select-method-filter"><SelectValue placeholder="All Methods"/></SelectTrigger><SelectContent><SelectItem value="all">All Methods</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent></Select>
          <Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-[135px]" data-testid="input-date-from"/>
          <Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-[135px]" data-testid="input-date-to"/>
        </div>

        {/* Table */}
        {isLoading||orgLoading?(
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['Date','Farmer / Payee','Type','Amount','Method','Reference','Linked To','Status'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <PaymentTableSkeleton rows={5} />
            </table>
          </div></CardContent></Card>
        )
        :payments.length===0?(
          <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center"><div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4"><Banknote className="h-7 w-7 text-muted-foreground"/></div><h3 className="font-semibold mb-1">No payments recorded</h3><p className="text-sm text-muted-foreground mb-5 max-w-xs">Record payments to farmers and suppliers. Each payment links to the farmer record for full traceability.</p><Button onClick={()=>setDialogOpen(true)} data-testid="button-record-first-payment"><Plus className="h-4 w-4 mr-2"/>Record First Payment</Button></CardContent></Card>
        ):(
          <>
            <Card><CardContent className="p-0"><div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Farmer / Payee</TableHead><TableHead className="hidden sm:table-cell">Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="hidden md:table-cell">Method</TableHead><TableHead className="hidden md:table-cell">Reference</TableHead><TableHead className="hidden md:table-cell">Linked To</TableHead><TableHead>Status</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {payments.map(p=>(
                    <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                      <TableCell className="whitespace-nowrap text-sm" data-testid={`text-date-${p.id}`}>{p.payment_date}</TableCell>
                      <TableCell data-testid={`text-payee-${p.id}`}><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold">{p.payee_name.charAt(0).toUpperCase()}</div><div><p className="text-sm font-medium">{p.payee_name}</p>{p.farm_id&&<a href={`/app/farmers/${p.farm_id}`} className="text-xs text-primary hover:underline" onClick={e=>e.stopPropagation()}>View Farmer →</a>}</div></div></TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs" data-testid={`badge-type-${p.id}`}>{PAYEE_LABELS[p.payee_type]||p.payee_type}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium" data-testid={`text-amount-${p.id}`}>{format(p.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm" data-testid={`text-method-${p.id}`}>{METHOD_LABELS[p.payment_method]||p.payment_method}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground" data-testid={`text-reference-${p.id}`}>{p.reference_number||'—'}</TableCell>
                      <TableCell className="hidden md:table-cell" data-testid={`text-linked-entity-${p.id}`}>{p.linked_entity_type?<Badge variant="outline" className="text-xs">{p.linked_entity_type==='collection_batch'?'Batch':'Contract'}</Badge>:'—'}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANTS[p.status]||'outline'} className="text-xs capitalize" data-testid={`badge-status-${p.id}`}>{p.status}</Badge></TableCell>
                      <TableCell><Button size='icon' variant='ghost' className='h-6 w-6' onClick={()=>openEdit(p)} aria-label='Edit payment'><Pencil className='h-3 w-3'/></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div></CardContent></Card>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">{totalCount===0?'No payments':`Showing ${((page-1)*25)+1}–${Math.min(page*25,totalCount)} of ${totalCount}`}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1} data-testid="button-prev-page"><ChevronLeft className="h-4 w-4"/></Button>
                <span className="text-sm text-muted-foreground" data-testid="text-current-page">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} data-testid="button-next-page"><ChevronRight className="h-4 w-4"/></Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={open=>{if(!open){setEditDialogOpen(false);setEditingPayment(null);}}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update the payment record for <span className="font-medium">{editingPayment?.payee_name}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} placeholder="0.00"/>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Select value={editForm.currency} onValueChange={v=>setEditForm(f=>({...f,currency:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{SUPPORTED_CURRENCIES.map(c=><SelectItem key={c} value={c}>{CURRENCY_LABELS[c]||c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={editForm.payment_method} onValueChange={v=>setEditForm(f=>({...f,payment_method:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={v=>setEditForm(f=>({...f,status:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payment Date</Label>
                <Input type="date" value={editForm.payment_date} onChange={e=>setEditForm(f=>({...f,payment_date:e.target.value}))}/>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reference #</Label>
                <Input value={editForm.reference_number} onChange={e=>setEditForm(f=>({...f,reference_number:e.target.value}))} placeholder="Optional"/>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Optional notes"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setEditDialogOpen(false);setEditingPayment(null);}}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isEditing}>{isEditing?<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Saving…</>:'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TierGate>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <PaymentsPageInner />
    </Suspense>
  );
}
